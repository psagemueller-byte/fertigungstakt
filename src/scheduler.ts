import { Machine, ScheduledTask } from './types';

/**
 * Berechnet den Zeitplan für alle Maschinen über einen Zeitraum.
 * Gibt sortierte Liste aller Aufgaben (Einspannen + Messen) zurück.
 */
export function computeSchedule(
  machines: Machine[],
  shiftStartMs: number,
  shiftEndMs: number
): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  for (const machine of machines) {
    const cycleDurationMs = machine.cycleTimeSec * 1000;
    let currentTime = shiftStartMs;
    let partCount = 0;

    while (currentTime + cycleDurationMs <= shiftEndMs) {
      // Zyklus endet -> Teil fertig -> Einspannen nötig
      const cycleEndTime = currentTime + cycleDurationMs;
      partCount++;

      // Einspann-Aufgabe: Werker muss zum Zyklusende dort sein
      tasks.push({
        machineId: machine.id,
        machineName: machine.name,
        dueAt: cycleEndTime,
        type: 'setup',
        durationSec: machine.setupTimeSec,
        partName: machine.partName,
        partNumber: partCount,
      });

      // Messaufgabe alle N Teile
      if (partCount % machine.measureEveryN === 0) {
        // Messung erfolgt nach dem Einspannen
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

  // Nach Fälligkeit sortieren
  tasks.sort((a, b) => a.dueAt - b.dueAt);
  return tasks;
}

/**
 * Berechnet für jede Maschine, wann der nächste Zyklus endet (relativ zu jetzt).
 */
export function getNextEvents(
  machines: Machine[],
  shiftStartMs: number,
  nowMs: number
): { machineId: string; nextDueAt: number; type: 'setup' | 'measure'; partNumber: number }[] {
  const events: { machineId: string; nextDueAt: number; type: 'setup' | 'measure'; partNumber: number }[] = [];

  for (const machine of machines) {
    const cycleDurationMs = machine.cycleTimeSec * 1000;
    const elapsed = nowMs - shiftStartMs;

    if (elapsed < 0) {
      // Schicht hat noch nicht begonnen
      events.push({ machineId: machine.id, nextDueAt: shiftStartMs + cycleDurationMs, type: 'setup', partNumber: 1 });
      continue;
    }

    // Wie viele Zyklen sind seit Schichtbeginn abgeschlossen?
    const completedCycles = Math.floor(elapsed / cycleDurationMs);
    const nextCycleEnd = shiftStartMs + (completedCycles + 1) * cycleDurationMs;
    const nextPartNumber = completedCycles + 1;

    // Prüfen ob Messung fällig
    const isMeasureDue = nextPartNumber % machine.measureEveryN === 0;

    events.push({
      machineId: machine.id,
      nextDueAt: nextCycleEnd,
      type: isMeasureDue ? 'measure' : 'setup',
      partNumber: nextPartNumber,
    });
  }

  events.sort((a, b) => a.nextDueAt - b.nextDueAt);
  return events;
}

/**
 * Formatiert Sekunden in MM:SS
 */
export function formatTime(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(Math.floor(totalSeconds));
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formatiert Timestamp zu HH:MM:SS
 */
export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Parst HH:MM String zu heutigem Timestamp
 */
export function parseTimeToMs(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now.getTime();
}
