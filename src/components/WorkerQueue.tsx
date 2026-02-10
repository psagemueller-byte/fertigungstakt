import { MachineStatus } from '../useAppState';
import { formatTime } from '../scheduler';

interface Props {
  title: string;
  icon: string;
  tasks: MachineStatus[];
  taskFilter: 'setup' | 'measure';
}

export function WorkerQueue({ title, icon, tasks, taskFilter }: Props) {
  // Filtern nach relevanten Tasks
  const relevantTasks = tasks.filter(t => {
    if (taskFilter === 'measure') {
      // Nur Maschinen zeigen, wo Messung fällig ist
      return t.nextTaskType === 'measure';
    }
    // Einspanner muss zu allen Maschinen
    return true;
  });

  // Sortiert nach Dringlichkeit (wenigste verbleibende Zeit zuerst)
  const sorted = [...relevantTasks].sort((a, b) => a.secondsRemaining - b.secondsRemaining);

  return (
    <div style={{
      flex: '1 1 350px',
      background: '#111827',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '300px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.1em' }}>
        <span dangerouslySetInnerHTML={{ __html: icon }} /> {title} - Reihenfolge
      </h3>
      {sorted.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          Keine Aufgaben anstehend
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sorted.map((task, index) => {
            const urgencyBg = task.urgency === 'overdue' ? '#3a1010'
              : task.urgency === 'now' ? '#2a1a1a'
              : task.urgency === 'soon' ? '#2a2a1a'
              : '#1a1f2e';
            const urgencyBorder = task.urgency === 'overdue' ? '#8b2020'
              : task.urgency === 'now' ? '#6f2d2d'
              : task.urgency === 'soon' ? '#6f6f2d'
              : '#2d3748';

            return (
              <div
                key={task.machine.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: urgencyBg,
                  border: `1px solid ${urgencyBorder}`,
                  borderRadius: '8px',
                  animation: task.urgency === 'overdue' ? 'pulse 1s infinite' : 'none',
                }}
              >
                {/* Positions-Nummer */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: index === 0 ? '#ef4444' : index === 1 ? '#eab308' : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9em',
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {index + 1}
                </div>

                {/* Maschinenname */}
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95em' }}>
                    {task.machine.name}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>
                    {task.machine.partName} #{task.nextPartNumber}
                    {task.nextTaskType === 'measure' && (
                      <span style={{ color: '#a78bfa', marginLeft: '6px' }}>+ MESSEN</span>
                    )}
                  </div>
                </div>

                {/* Countdown */}
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '1.3em',
                  fontWeight: 'bold',
                  color: task.urgency === 'overdue' ? '#ff6666'
                    : task.urgency === 'now' ? '#ff8888'
                    : task.urgency === 'soon' ? '#e7d888'
                    : '#88b4e7',
                }}>
                  {formatTime(task.secondsRemaining)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
