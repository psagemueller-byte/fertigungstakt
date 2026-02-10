/** Eine CNC-Maschine (Okuma 600 mit Wendetisch) */
export interface Machine {
  id: string;
  name: string;
  /** Aktuelles Teil / Werkstück */
  partName: string;
  /** Laufzeit pro Seite in Sekunden (Bearbeitungszeit während der Werker die andere Seite spannt) */
  cycleTimeSec: number;
  /** Spannzeit in Sekunden (wie lange der Einspanner braucht) */
  setupTimeSec: number;
  /** Alle X Teile muss gemessen werden */
  measureEveryN: number;
  /** Messzeit in Sekunden */
  measureTimeSec: number;
  /** Anzahl Teile pro Turm (Spannvorrichtung) */
  partsPerTower: number;
}

/** Laufzeit-Zustand einer einzelnen Maschine (wird live getrackt) */
export interface MachineRunState {
  machineId: string;
  /** Wann der aktuelle Zyklus gestartet hat (timestamp ms) */
  cycleStartedAt: number;
  /** Wie viele Teile seit Schichtbeginn fertig */
  partsCompleted: number;
  /** Ist die Maschine pausiert? (Störung, Werkzeugwechsel etc.) */
  paused: boolean;
  /** Wann wurde pausiert? (timestamp ms, 0 = nicht pausiert) */
  pausedAt: number;
}

/** Ein geplanter Schritt in der optimierten Reihenfolge */
export interface PlannedStep {
  machineId: string;
  machineName: string;
  partName: string;
  partNumber: number;
  type: 'setup' | 'measure';
  /** Wann die Maschine fertig ist (Zyklus endet) */
  machineDueAt: number;
  /** Wann der Werker dort ankommt (nach vorherigen Aufgaben) */
  workerArrivesAt: number;
  /** Wie lange die Aufgabe dauert (Sek) */
  durationSec: number;
  /** Maschine wartet so viele Sekunden auf den Werker (Stillstand) */
  machineIdleSec: number;
  /** Werker wartet so viele Sekunden auf die Maschine */
  workerWaitsSec: number;
}

/** Ein geplanter Einsatz (Aufgabe) für einen Werker - für Timeline */
export interface ScheduledTask {
  machineId: string;
  machineName: string;
  dueAt: number;
  type: 'setup' | 'measure';
  durationSec: number;
  partName: string;
  partNumber: number;
}

/** Schicht-Konfiguration */
export interface ShiftConfig {
  startTime: string;
  endTime: string;
  breaks: { start: string; end: string }[];
}

/** Gesamte Konfiguration */
export interface AppConfig {
  machines: Machine[];
  shift: ShiftConfig;
}
