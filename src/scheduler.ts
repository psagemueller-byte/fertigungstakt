import { Machine, MachineRunState, PlannedStep, ScheduledTask } from './types';

// ─── Hilfsfunktionen ─────────────────────────────────────────────

export function formatTime(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(Math.floor(totalSeconds));
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function parseTimeToMs(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now.getTime();
}

// ─── Hilfsfunktion: Effektive Zykluszeit einer Turmseite ─────────

/** Bearbeitungszeit pro Teil × Teile pro Turmseite = Gesamtlaufzeit einer Seite */
export function getEffectiveCycleSec(machine: Machine): number {
  return machine.cycleTimeSec * machine.partsPerTower;
}

// ─── Maschinen-Timing auf Basis von RunState ──────────────────────

export interface MachineTiming {
  machine: Machine;
  runState: MachineRunState;
  /** Effektive Zykluszeit in Sek (pro Teil × Teile/Turm) */
  effectiveCycleSec: number;
  /** Wann endet der aktuelle Zyklus (timestamp ms) */
  cycleEndsAt: number;
  /** Sekunden bis Zyklusende (negativ = überfällig) */
  secondsRemaining: number;
  /** Fortschritt 0-1 */
  cycleProgress: number;
  /** Ist beim nächsten Wechsel eine Messung fällig? */
  measurementDue: boolean;
  /** Nächstes Teil-Batch (partsCompleted + partsPerTower) */
  nextBatchEndPart: number;
}

export function getMachineTimings(
  machines: Machine[],
  runStates: MachineRunState[],
  nowMs: number,
): MachineTiming[] {
  return machines.map(machine => {
    const rs = runStates.find(r => r.machineId === machine.id);
    const effectiveCycleSec = getEffectiveCycleSec(machine);

    if (!rs || rs.paused) {
      return {
        machine,
        runState: rs ?? { machineId: machine.id, cycleStartedAt: nowMs, partsCompleted: 0, paused: true, pausedAt: nowMs },
        effectiveCycleSec,
        cycleEndsAt: Infinity,
        secondsRemaining: Infinity,
        cycleProgress: 0,
        measurementDue: false,
        nextBatchEndPart: (rs?.partsCompleted ?? 0) + machine.partsPerTower,
      };
    }

    const cycleDurationMs = effectiveCycleSec * 1000;
    const cycleEndsAt = rs.cycleStartedAt + cycleDurationMs;
    const secondsRemaining = (cycleEndsAt - nowMs) / 1000;
    const elapsed = nowMs - rs.cycleStartedAt;
    const cycleProgress = Math.min(Math.max(elapsed / cycleDurationMs, 0), 1);

    // Pro Zyklus werden partsPerTower Teile fertig
    const nextBatchEndPart = rs.partsCompleted + machine.partsPerTower;

    // Messung fällig, wenn im nächsten Batch ein Vielfaches von measureEveryN liegt
    // z.B. partsCompleted=8, partsPerTower=4, measureEveryN=10 → Batch 9-12 enthält Teil 10 → messen!
    const prevTotal = rs.partsCompleted;
    const nextTotal = nextBatchEndPart;
    const measurementDue = Math.floor(nextTotal / machine.measureEveryN) > Math.floor(prevTotal / machine.measureEveryN);

    return {
      machine,
      runState: rs,
      effectiveCycleSec,
      cycleEndsAt,
      secondsRemaining,
      cycleProgress,
      measurementDue,
      nextBatchEndPart,
    };
  });
}

// ─── Optimale Reihenfolge (Brute-Force für 5 Maschinen) ──────────

interface CandidateMachine {
  machine: Machine;
  cycleEndsAt: number;
  partNumber: number;
  measurementDue: boolean;
}

/**
 * Berechnet die optimale Besuchsreihenfolge, die die Gesamtstillstandszeit minimiert.
 *
 * Algorithmus: Teste alle Permutationen der fälligen Maschinen (max 5! = 120)
 * und wähle die mit der geringsten Summe an Maschinenwartezeit.
 */
export function computeOptimalOrder(
  candidates: CandidateMachine[],
  workerFreeAt: number,
): PlannedStep[] {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) {
    return [buildStep(candidates[0], workerFreeAt)];
  }

  const permutations = getPermutations(candidates);
  let bestScore = Infinity;
  let bestPlan: PlannedStep[] = [];

  for (const perm of permutations) {
    const plan = evaluateOrder(perm, workerFreeAt);
    const totalIdleSec = plan.reduce((sum, s) => sum + s.machineIdleSec, 0);
    if (totalIdleSec < bestScore) {
      bestScore = totalIdleSec;
      bestPlan = plan;
    }
  }

  return bestPlan;
}

function buildStep(c: CandidateMachine, workerArrivesAt: number): PlannedStep {
  const machineDueAt = c.cycleEndsAt;
  // Maschine wartet = Worker kommt nach Zyklusende
  const machineIdleSec = Math.max(0, (workerArrivesAt - machineDueAt) / 1000);
  // Werker wartet = Maschine noch nicht fertig wenn er ankommt
  const workerWaitsSec = Math.max(0, (machineDueAt - workerArrivesAt) / 1000);
  const durationSec = c.machine.setupTimeSec + (c.measurementDue ? c.machine.measureTimeSec : 0);

  return {
    machineId: c.machine.id,
    machineName: c.machine.name,
    partName: c.machine.partName,
    partNumber: c.partNumber,
    type: c.measurementDue ? 'measure' : 'setup',
    machineDueAt,
    workerArrivesAt,
    durationSec,
    machineIdleSec,
    workerWaitsSec,
  };
}

function evaluateOrder(order: CandidateMachine[], workerFreeAt: number): PlannedStep[] {
  const steps: PlannedStep[] = [];
  let currentTime = workerFreeAt;

  for (const c of order) {
    const step = buildStep(c, currentTime);
    steps.push(step);
    // Werker muss ggf. warten bis Maschine fertig, dann arbeiten
    const workStartsAt = Math.max(currentTime, c.cycleEndsAt);
    currentTime = workStartsAt + step.durationSec * 1000;
  }

  return steps;
}

function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/**
 * Berechnet den optimalen Plan für den Einspanner.
 * Nimmt aktuelle Maschinenzeiten und plant die nächsten Schritte.
 */
export function planSetupWorker(
  timings: MachineTiming[],
  nowMs: number,
): PlannedStep[] {
  // Nur aktive (nicht-pausierte) Maschinen
  const active = timings.filter(t => !t.runState.paused && t.cycleEndsAt !== Infinity);

  const candidates: CandidateMachine[] = active.map(t => ({
    machine: t.machine,
    cycleEndsAt: t.cycleEndsAt,
    partNumber: t.nextBatchEndPart,
    measurementDue: false, // Einspanner misst nicht, nur spannen
  }));

  return computeOptimalOrder(candidates, nowMs);
}

/**
 * Berechnet den Plan für den Messer.
 * Nur Maschinen wo eine Messung fällig ist.
 */
export function planMeasureWorker(
  timings: MachineTiming[],
  nowMs: number,
): PlannedStep[] {
  const active = timings.filter(t => !t.runState.paused && t.cycleEndsAt !== Infinity && t.measurementDue);

  const candidates: CandidateMachine[] = active.map(t => ({
    machine: t.machine,
    // Messung nach Einspannen: Zyklusende + Spannzeit
    cycleEndsAt: t.cycleEndsAt + t.machine.setupTimeSec * 1000,
    partNumber: t.nextBatchEndPart,
    measurementDue: true,
  }));

  return computeOptimalOrder(candidates, nowMs);
}

// ─── Timeline-Berechnung (für Schichtübersicht) ──────────────────

export function computeSchedule(
  machines: Machine[],
  shiftStartMs: number,
  shiftEndMs: number
): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  for (const machine of machines) {
    const effectiveCycleSec = getEffectiveCycleSec(machine);
    const cycleDurationMs = effectiveCycleSec * 1000;
    let currentTime = shiftStartMs;
    let partCount = 0;

    while (currentTime + cycleDurationMs <= shiftEndMs) {
      const cycleEndTime = currentTime + cycleDurationMs;
      const prevPartCount = partCount;
      partCount += machine.partsPerTower;

      tasks.push({
        machineId: machine.id,
        machineName: machine.name,
        dueAt: cycleEndTime,
        type: 'setup',
        durationSec: machine.setupTimeSec,
        partName: machine.partName,
        partNumber: partCount,
      });

      // Messung fällig, wenn Batch ein Vielfaches von measureEveryN überschreitet
      const measureNow = Math.floor(partCount / machine.measureEveryN) > Math.floor(prevPartCount / machine.measureEveryN);
      if (measureNow) {
        tasks.push({
          machineId: machine.id,
          machineName: machine.name,
          dueAt: cycleEndTime + machine.setupTimeSec * 1000,
          type: 'measure',
          durationSec: machine.measureTimeSec,
          partName: machine.partName,
          partNumber: partCount,
        });
      }

      currentTime = cycleEndTime;
    }
  }

  tasks.sort((a, b) => a.dueAt - b.dueAt);
  return tasks;
}

// ─── Gestaffelter Neustart ───────────────────────────────────────

/**
 * Berechnet gestaffelte Startzeiten, damit nicht alle Maschinen gleichzeitig
 * fertig werden und der Einspanner sie nacheinander bedienen kann.
 */
export function computeStaggeredStarts(
  machines: Machine[],
  baseTime: number,
): Record<string, number> {
  // Sortiere nach effektiver Zykluszeit (kürzeste zuerst)
  const sorted = [...machines].sort((a, b) => getEffectiveCycleSec(a) - getEffectiveCycleSec(b));
  const starts: Record<string, number> = {};
  let offset = 0;

  for (const machine of sorted) {
    const effectiveCycleSec = getEffectiveCycleSec(machine);
    starts[machine.id] = baseTime - (effectiveCycleSec * 1000) + (offset * 1000);
    // Nächste Maschine versetzt um die Spannzeit der vorherigen
    offset += machine.setupTimeSec;
  }

  return starts;
}
