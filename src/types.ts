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

/** Zustand einer Maschine zur Laufzeit */
export interface MachineState {
  machineId: string;
  /** Wann der aktuelle Zyklus gestartet hat (timestamp ms) */
  cycleStartedAt: number;
  /** Wie viele Teile seit Schichtbeginn fertig */
  partsCompleted: number;
  /** Ist gerade eine Messung fällig beim nächsten Wechsel? */
  measurementDue: boolean;
  /** Status der Maschine */
  status: 'running' | 'waiting_setup' | 'setup_in_progress' | 'waiting_measure' | 'measure_in_progress';
}

/** Ein geplanter Einsatz (Aufgabe) für einen Werker */
export interface ScheduledTask {
  machineId: string;
  machineName: string;
  /** Wann der Werker dort sein muss (timestamp ms) */
  dueAt: number;
  /** Art der Aufgabe */
  type: 'setup' | 'measure';
  /** Dauer der Aufgabe in Sekunden */
  durationSec: number;
  /** Teil-Name */
  partName: string;
  /** Welches Teil (Nummer) */
  partNumber: number;
}

/** Schicht-Konfiguration */
export interface ShiftConfig {
  /** Schichtbeginn (HH:MM) */
  startTime: string;
  /** Schichtende (HH:MM) */
  endTime: string;
  /** Pausenzeiten */
  breaks: { start: string; end: string }[];
}

/** Gesamte Konfiguration */
export interface AppConfig {
  machines: Machine[];
  shift: ShiftConfig;
}
