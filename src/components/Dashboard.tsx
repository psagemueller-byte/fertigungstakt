import { MachineStatus } from '../useAppState';
import { PlannedStep } from '../types';
import { MachineCard } from './MachineCard';
import { WorkerQueue } from './WorkerQueue';
import { formatTime } from '../scheduler';

import { CycleRecord } from '../types';

interface MachineStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  avgDeviation: number;
  trend: number;
  records: CycleRecord[];
}

interface Props {
  machineStatuses: MachineStatus[];
  setupPlan: PlannedStep[];
  measurePlan: PlannedStep[];
  totalIdleSec: number;
  now: number;
  shiftStartMs: number;
  shiftEndMs: number;
  onResync: (id: string) => void;
  onCompleteCycle: (id: string) => void;
  onTogglePause: (id: string) => void;
  onAdjustOffset: (id: string, sec: number) => void;
  onResyncAll: () => void;
  getMachineStats: (machineId: string) => MachineStats | null;
  onClearStats: () => void;
}

export function Dashboard({
  machineStatuses, setupPlan, measurePlan, totalIdleSec,
  now, shiftStartMs, shiftEndMs,
  onResync, onCompleteCycle, onTogglePause, onAdjustOffset, onResyncAll,
  getMachineStats, onClearStats,
}: Props) {
  const shiftProgress = Math.max(0, Math.min(1, (now - shiftStartMs) / (shiftEndMs - shiftStartMs)));
  const shiftRemainingMin = Math.max(0, Math.floor((shiftEndMs - now) / 60000));
  const activeMachines = machineStatuses.filter(s => s.urgency !== 'paused').length;
  const pausedMachines = machineStatuses.filter(s => s.urgency === 'paused').length;

  return (
    <div>
      {/* Schicht-Fortschritt + Globale Steuerung */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ color: '#9ca3af' }}>
            <span>Schichtfortschritt</span>
            <span style={{ marginLeft: '16px' }}>
              {Math.round(shiftProgress * 100)}% | Noch {Math.floor(shiftRemainingMin / 60)}h {shiftRemainingMin % 60}min
            </span>
            <span style={{ marginLeft: '16px', color: '#666' }}>
              {activeMachines} aktiv{pausedMachines > 0 && ` | ${pausedMachines} pausiert`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Stillstand-Anzeige */}
            <span style={{
              color: totalIdleSec > 60 ? '#ef4444' : totalIdleSec > 20 ? '#eab308' : '#10b981',
              fontWeight: 'bold',
              fontSize: '0.9em',
            }}>
              Stillstand: {formatTime(totalIdleSec)}
            </span>
            <button onClick={onClearStats} style={{
              background: '#374151',
              color: '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85em',
            }}>
              Statistik löschen
            </button>
            <button onClick={onResyncAll} style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85em',
            }}>
              {'\u21BB'} Alle neu takten
            </button>
          </div>
        </div>
        <div style={{ background: '#1f2937', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
          <div style={{
            width: `${shiftProgress * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
            borderRadius: '6px',
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Werker-Warteschlangen */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <WorkerQueue
          title="Einspanner - Optimale Reihenfolge"
          icon="&#128295;"
          plan={setupPlan}
          totalIdleSec={totalIdleSec}
        />
        <WorkerQueue
          title="Messer - Anstehende Messungen"
          icon="&#128207;"
          plan={measurePlan}
        />
      </div>

      {/* Maschinen-Karten */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {machineStatuses.map((status) => (
          <MachineCard
            key={status.timing.machine.id}
            status={status}
            stats={getMachineStats(status.timing.machine.id)}
            onResync={onResync}
            onCompleteCycle={onCompleteCycle}
            onTogglePause={onTogglePause}
            onAdjustOffset={onAdjustOffset}
          />
        ))}
      </div>
    </div>
  );
}
