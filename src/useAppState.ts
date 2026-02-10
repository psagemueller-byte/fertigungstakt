import { useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig, Machine } from './types';
import { defaultConfig } from './defaultConfig';
import { getNextEvents, parseTimeToMs } from './scheduler';

const STORAGE_KEY = 'fertigungstakt-config';

function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return defaultConfig;
}

function saveConfig(config: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export interface MachineStatus {
  machine: Machine;
  /** Sekunden bis nächster Eingriff nötig */
  secondsRemaining: number;
  /** Nächste Aufgabe */
  nextTaskType: 'setup' | 'measure';
  /** Welches Teil (Nummer) */
  nextPartNumber: number;
  /** Teile fertig in dieser Schicht */
  partsCompleted: number;
  /** Fortschritt des aktuellen Zyklus (0-1) */
  cycleProgress: number;
  /** Nächster Fälligkeitszeitpunkt */
  nextDueAt: number;
  /** Dringlichkeit: 'ok' | 'soon' | 'now' | 'overdue' */
  urgency: 'ok' | 'soon' | 'now' | 'overdue';
}

export function useAppState() {
  const [config, setConfigState] = useState<AppConfig>(loadConfig);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<'dashboard' | 'config' | 'timeline'>('dashboard');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  // Nächste Events berechnen
  const nextEvents = getNextEvents(config.machines, shiftStartMs, now);

  // Maschinenstatus berechnen
  const machineStatuses: MachineStatus[] = config.machines.map((machine) => {
    const cycleDurationMs = machine.cycleTimeSec * 1000;
    const elapsed = now - shiftStartMs;
    const completedCycles = elapsed > 0 ? Math.floor(elapsed / cycleDurationMs) : 0;
    const timeInCurrentCycle = elapsed > 0 ? elapsed % cycleDurationMs : 0;
    const secondsRemaining = (cycleDurationMs - timeInCurrentCycle) / 1000;
    const cycleProgress = timeInCurrentCycle / cycleDurationMs;

    const event = nextEvents.find(e => e.machineId === machine.id);
    const nextPartNumber = event?.partNumber ?? completedCycles + 1;
    const nextTaskType = event?.type ?? 'setup';
    const nextDueAt = event?.nextDueAt ?? (shiftStartMs + (completedCycles + 1) * cycleDurationMs);

    let urgency: MachineStatus['urgency'] = 'ok';
    if (secondsRemaining <= 0) urgency = 'overdue';
    else if (secondsRemaining <= 30) urgency = 'now';
    else if (secondsRemaining <= 120) urgency = 'soon';

    return {
      machine,
      secondsRemaining,
      nextTaskType,
      nextPartNumber,
      partsCompleted: completedCycles,
      cycleProgress: Math.min(cycleProgress, 1),
      nextDueAt,
      urgency,
    };
  });

  // Sortiert nach Dringlichkeit
  const sortedStatuses = [...machineStatuses].sort((a, b) => a.secondsRemaining - b.secondsRemaining);

  // Sound-Alarm wenn eine Maschine "now" wird
  useEffect(() => {
    if (!soundEnabled) return;
    const hasUrgent = machineStatuses.some(s => s.urgency === 'now' || s.urgency === 'overdue');
    if (hasUrgent && audioRef.current) {
      audioRef.current.play().catch(() => { /* autoplay blocked */ });
    }
  }, [machineStatuses.map(s => s.urgency).join(','), soundEnabled]);

  return {
    config,
    setConfig,
    now,
    shiftStartMs,
    shiftEndMs,
    machineStatuses,
    sortedStatuses,
    view,
    setView,
    audioRef,
    soundEnabled,
    setSoundEnabled,
  };
}
