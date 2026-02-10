import { AppConfig } from './types';

export const defaultConfig: AppConfig = {
  machines: [
    {
      id: 'okuma-1',
      name: 'Okuma 1',
      partName: 'Gehäuse A',
      cycleTimeSec: 480,    // 8 min Bearbeitungszeit
      setupTimeSec: 120,    // 2 min Spannzeit
      measureEveryN: 10,
      measureTimeSec: 180,  // 3 min Messzeit
      partsPerTower: 4,
    },
    {
      id: 'okuma-2',
      name: 'Okuma 2',
      partName: 'Flansch B',
      cycleTimeSec: 360,    // 6 min
      setupTimeSec: 90,
      measureEveryN: 5,
      measureTimeSec: 150,
      partsPerTower: 6,
    },
    {
      id: 'okuma-3',
      name: 'Okuma 3',
      partName: 'Welle C',
      cycleTimeSec: 600,    // 10 min
      setupTimeSec: 150,
      measureEveryN: 8,
      measureTimeSec: 200,
      partsPerTower: 3,
    },
    {
      id: 'okuma-4',
      name: 'Okuma 4',
      partName: 'Deckel D',
      cycleTimeSec: 300,    // 5 min
      setupTimeSec: 100,
      measureEveryN: 10,
      measureTimeSec: 120,
      partsPerTower: 8,
    },
    {
      id: 'okuma-5',
      name: 'Okuma 5',
      partName: 'Adapter E',
      cycleTimeSec: 420,    // 7 min
      setupTimeSec: 110,
      measureEveryN: 6,
      measureTimeSec: 160,
      partsPerTower: 5,
    },
  ],
  shift: {
    startTime: '06:00',
    endTime: '14:00',
    breaks: [
      { start: '09:00', end: '09:15' },
      { start: '11:30', end: '12:00' },
    ],
  },
};
