import { AppConfig } from './types';

export const defaultConfig: AppConfig = {
  machines: [
    {
      id: 'okuma-1',
      name: 'Okuma 1',
      partName: 'Gehäuse A',
      cycleTimeSec: 480,    // 8 min pro Teil
      setupTimeSec: 120,    // 2 min Spannzeit (alle Teile aus-/einspannen)
      measureEveryN: 10,    // jedes 10. Teil messen
      measureTimeSec: 180,  // 3 min Messzeit
      partsPerTower: 4,     // 4 Teile pro Turmseite → 32 min effektive Zykluszeit
    },
    {
      id: 'okuma-2',
      name: 'Okuma 2',
      partName: 'Flansch B',
      cycleTimeSec: 360,    // 6 min pro Teil
      setupTimeSec: 90,
      measureEveryN: 5,
      measureTimeSec: 150,
      partsPerTower: 6,     // 6 Teile → 36 min
    },
    {
      id: 'okuma-3',
      name: 'Okuma 3',
      partName: 'Welle C',
      cycleTimeSec: 600,    // 10 min pro Teil
      setupTimeSec: 150,
      measureEveryN: 8,
      measureTimeSec: 200,
      partsPerTower: 3,     // 3 Teile → 30 min
    },
    {
      id: 'okuma-4',
      name: 'Okuma 4',
      partName: 'Deckel D',
      cycleTimeSec: 180,    // 3 min pro Teil
      setupTimeSec: 100,
      measureEveryN: 10,
      measureTimeSec: 120,
      partsPerTower: 8,     // 8 Teile → 24 min
    },
    {
      id: 'okuma-5',
      name: 'Okuma 5',
      partName: 'Adapter E',
      cycleTimeSec: 420,    // 7 min pro Teil
      setupTimeSec: 110,
      measureEveryN: 6,
      measureTimeSec: 160,
      partsPerTower: 5,     // 5 Teile → 35 min
    },
  ],
  shift: {
    shiftType: 'frueh',
    startTime: '06:00',
    endTime: '14:00',
    breaks: [
      { start: '09:00', end: '09:15' },
      { start: '11:30', end: '12:00' },
    ],
  },
  articles: [],
};
