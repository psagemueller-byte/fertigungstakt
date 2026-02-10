import { MachineStatus } from '../useAppState';
import { MachineCard } from './MachineCard';
import { WorkerQueue } from './WorkerQueue';

interface Props {
  machineStatuses: MachineStatus[];
  sortedStatuses: MachineStatus[];
  now: number;
  shiftStartMs: number;
  shiftEndMs: number;
}

export function Dashboard({ machineStatuses, sortedStatuses, now, shiftStartMs, shiftEndMs }: Props) {
  const shiftProgress = Math.max(0, Math.min(1, (now - shiftStartMs) / (shiftEndMs - shiftStartMs)));
  const shiftRemainingMin = Math.max(0, Math.floor((shiftEndMs - now) / 60000));

  return (
    <div>
      {/* Schicht-Fortschritt */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#9ca3af' }}>
          <span>Schichtfortschritt</span>
          <span>{Math.round(shiftProgress * 100)}% | Noch {Math.floor(shiftRemainingMin / 60)}h {shiftRemainingMin % 60}min</span>
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
          title="Einspanner"
          icon="&#128295;"
          tasks={sortedStatuses.filter(() => true)}
          taskFilter="setup"
        />
        <WorkerQueue
          title="Messer"
          icon="&#128207;"
          tasks={sortedStatuses.filter(() => true)}
          taskFilter="measure"
        />
      </div>

      {/* Maschinen-Karten */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {machineStatuses.map((status) => (
          <MachineCard key={status.machine.id} status={status} />
        ))}
      </div>
    </div>
  );
}
