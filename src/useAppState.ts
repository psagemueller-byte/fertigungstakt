import { useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig, MachineRunState, PlannedStep } from './types';
import { defaultConfig } from './defaultConfig';
import {
  parseTimeToMs,
  getMachineTimings,
  planSetupWorker,
  planMeasureWorker,
  computeStaggeredStarts,
  MachineTiming,
} from './scheduler';

const CONFIG_KEY = 'fertigungstakt-config';
const RUNSTATE_KEY = 'fertigungstakt-runstates';

function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return defaultConfig;
}

function saveConfig(config: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function loadRunStates(): MachineRunState[] | null {
  try {
    const stored = localStorage.getItem(RUNSTATE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function saveRunStates(states: MachineRunState[]) {
  localStorage.setItem(RUNSTATE_KEY, JSON.stringify(states));
}

function createInitialRunStates(config: AppConfig, baseTime: number): MachineRunState[] {
  const starts = computeStaggeredStarts(config.machines, baseTime);
  return config.machines.map(m => ({
    machineId: m.id,
    cycleStartedAt: starts[m.id],
    partsCompleted: 0,
    paused: false,
    pausedAt: 0,
  }));
}

export interface MachineStatus {
  timing: MachineTiming;
  urgency: 'ok' | 'soon' | 'now' | 'overdue' | 'paused';
}

export function useAppState() {
  const [config, setConfigState] = useState<AppConfig>(loadConfig);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<'dashboard' | 'config' | 'timeline'>('dashboard');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // RunStates: entweder geladen oder initial gestaffelt
  const [runStates, setRunStatesRaw] = useState<MachineRunState[]>(() => {
    const loaded = loadRunStates();
    if (loaded && loaded.length === loadConfig().machines.length) return loaded;
    return createInitialRunStates(loadConfig(), Date.now());
  });

  const setRunStates = useCallback((states: MachineRunState[]) => {
    setRunStatesRaw(states);
    saveRunStates(states);
  }, []);

  const setConfig = useCallback((newConfig: AppConfig) => {
    setConfigState(newConfig);
    saveConfig(newConfig);
  }, []);

  // Tick alle 1 Sekunde
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const shiftStartMs = parseTimeToMs(config.shift.startTime);
  const shiftEndMs = parseTimeToMs(config.shift.endTime);

  // Maschinen-Timings berechnen (auf Basis der RunStates)
  const timings = getMachineTimings(config.machines, runStates, now);

  // Optimale Pläne berechnen
  const setupPlan: PlannedStep[] = planSetupWorker(timings, now);
  const measurePlan: PlannedStep[] = planMeasureWorker(timings, now);

  // Gesamtstillstandszeit
  const totalIdleSec = setupPlan.reduce((sum, s) => sum + s.machineIdleSec, 0);

  // MachineStatuses für UI
  const machineStatuses: MachineStatus[] = timings.map(timing => {
    let urgency: MachineStatus['urgency'];
    if (timing.runState.paused) {
      urgency = 'paused';
    } else if (timing.secondsRemaining <= 0) {
      urgency = 'overdue';
    } else if (timing.secondsRemaining <= 30) {
      urgency = 'now';
    } else if (timing.secondsRemaining <= 120) {
      urgency = 'soon';
    } else {
      urgency = 'ok';
    }
    return { timing, urgency };
  });

  // Sound-Alarm
  useEffect(() => {
    if (!soundEnabled) return;
    const hasUrgent = machineStatuses.some(s => s.urgency === 'now' || s.urgency === 'overdue');
    if (hasUrgent && audioRef.current) {
      audioRef.current.play().catch(() => { /* autoplay blocked */ });
    }
  }, [machineStatuses.map(s => s.urgency).join(','), soundEnabled]);

  // ─── Takt-Steuerung ─────────────────────────────────────────────

  /** Einzelne Maschine: "Zyklus jetzt gestartet" */
  const resyncMachine = useCallback((machineId: string) => {
    setRunStates(runStates.map(rs =>
      rs.machineId === machineId
        ? { ...rs, cycleStartedAt: Date.now(), paused: false, pausedAt: 0 }
        : rs
    ));
  }, [runStates, setRunStates]);

  /** Einzelne Maschine: "Zyklus soeben fertig" (Teil fertig, nächster Zyklus startet) */
  const completeCycle = useCallback((machineId: string) => {
    setRunStates(runStates.map(rs =>
      rs.machineId === machineId
        ? { ...rs, cycleStartedAt: Date.now(), partsCompleted: rs.partsCompleted + 1, paused: false, pausedAt: 0 }
        : rs
    ));
  }, [runStates, setRunStates]);

  /** Maschine pausieren/fortsetzen */
  const togglePause = useCallback((machineId: string) => {
    setRunStates(runStates.map(rs => {
      if (rs.machineId !== machineId) return rs;
      if (rs.paused) {
        // Fortsetzen: Zyklusstart um die Pausendauer verschieben
        const pauseDuration = Date.now() - rs.pausedAt;
        return {
          ...rs,
          cycleStartedAt: rs.cycleStartedAt + pauseDuration,
          paused: false,
          pausedAt: 0,
        };
      } else {
        return { ...rs, paused: true, pausedAt: Date.now() };
      }
    }));
  }, [runStates, setRunStates]);

  /** Alle Maschinen gestaffelt neu starten (optimaler Takt) */
  const resyncAll = useCallback(() => {
    const newStates = createInitialRunStates(config, Date.now());
    setRunStates(newStates);
  }, [config, setRunStates]);

  /** Alle Maschinen gleichzeitig starten (für Schichtbeginn) */
  const startShift = useCallback(() => {
    const newStates = createInitialRunStates(config, Date.now());
    setRunStates(newStates);
  }, [config, setRunStates]);

  /** Zeitversatz einer Maschine anpassen (+/- Sekunden) */
  const adjustOffset = useCallback((machineId: string, offsetSec: number) => {
    setRunStates(runStates.map(rs =>
      rs.machineId === machineId
        ? { ...rs, cycleStartedAt: rs.cycleStartedAt + offsetSec * 1000 }
        : rs
    ));
  }, [runStates, setRunStates]);

  return {
    config,
    setConfig,
    now,
    shiftStartMs,
    shiftEndMs,
    machineStatuses,
    timings,
    setupPlan,
    measurePlan,
    totalIdleSec,
    view,
    setView,
    audioRef,
    soundEnabled,
    setSoundEnabled,
    // Takt-Steuerung
    resyncMachine,
    completeCycle,
    togglePause,
    resyncAll,
    startShift,
    adjustOffset,
    runStates,
  };
}
