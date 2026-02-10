import { useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig, MachineRunState, PlannedStep, CycleRecord } from './types';
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
const CYCLES_KEY = 'fertigungstakt-cycles';

function loadCycleRecords(): CycleRecord[] {
  try {
    const stored = localStorage.getItem(CYCLES_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveCycleRecords(records: CycleRecord[]) {
  localStorage.setItem(CYCLES_KEY, JSON.stringify(records));
}

function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: fehlende Felder ergänzen
      if (!parsed.articles) parsed.articles = [];
      if (parsed.shift && !parsed.shift.shiftType) parsed.shift.shiftType = 'frueh';
      return parsed;
    }
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
  const [cycleRecords, setCycleRecordsRaw] = useState<CycleRecord[]>(loadCycleRecords);

  const setCycleRecords = useCallback((records: CycleRecord[]) => {
    setCycleRecordsRaw(records);
    saveCycleRecords(records);
  }, []);

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

  /** Einzelne Maschine: "Turmseite fertig" (partsPerTower Teile fertig, nächster Zyklus startet) */
  const completeCycle = useCallback((machineId: string) => {
    const machine = config.machines.find(m => m.id === machineId);
    if (!machine) return;
    const batchSize = machine.partsPerTower ?? 1;
    const rs = runStates.find(r => r.machineId === machineId);
    const nowMs = Date.now();

    // Takt aufzeichnen
    if (rs) {
      const expectedSec = machine.cycleTimeSec * batchSize;
      const actualSec = Math.round((nowMs - rs.cycleStartedAt) / 1000);
      const record: CycleRecord = {
        machineId,
        machineName: machine.name,
        partName: machine.partName,
        expectedSec,
        actualSec,
        deviationSec: actualSec - expectedSec,
        batchSize,
        completedAt: nowMs,
      };
      setCycleRecords([...cycleRecords, record]);
    }

    setRunStates(runStates.map(r =>
      r.machineId === machineId
        ? { ...r, cycleStartedAt: nowMs, partsCompleted: r.partsCompleted + batchSize, paused: false, pausedAt: 0 }
        : r
    ));
  }, [runStates, setRunStates, config.machines, cycleRecords, setCycleRecords]);

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

  /** Statistik für eine Maschine berechnen */
  function getMachineStats(machineId: string) {
    const records = cycleRecords.filter(r => r.machineId === machineId);
    if (records.length === 0) return null;
    const actuals = records.map(r => r.actualSec);
    const deviations = records.map(r => r.deviationSec);
    const avg = actuals.reduce((a, b) => a + b, 0) / actuals.length;
    const min = Math.min(...actuals);
    const max = Math.max(...actuals);
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    // Letzten 5 für Trend
    const last5 = records.slice(-5);
    const last5Avg = last5.reduce((a, b) => a + b.actualSec, 0) / last5.length;
    const trend = last5.length >= 3 ? last5Avg - avg : 0; // positiv = wird langsamer
    return { count: records.length, avg, min, max, avgDeviation, trend, records };
  }

  /** Alle Zyklusaufnahmen löschen */
  const clearCycleRecords = useCallback(() => {
    setCycleRecords([]);
  }, [setCycleRecords]);

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
    cycleRecords,
    getMachineStats,
    clearCycleRecords,
  };
}
