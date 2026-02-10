import { AppConfig } from '../types';
import { computeSchedule, formatTimestamp, parseTimeToMs } from '../scheduler';

interface Props {
  config: AppConfig;
  now: number;
}

const machineColors: Record<string, string> = {
  'okuma-1': '#3b82f6',
  'okuma-2': '#10b981',
  'okuma-3': '#f59e0b',
  'okuma-4': '#ef4444',
  'okuma-5': '#8b5cf6',
};

export function Timeline({ config, now }: Props) {
  const shiftStartMs = parseTimeToMs(config.shift.startTime);
  const shiftEndMs = parseTimeToMs(config.shift.endTime);
  const shiftDuration = shiftEndMs - shiftStartMs;

  const schedule = computeSchedule(config.machines, shiftStartMs, shiftEndMs);

  // Aktuelle Position in der Timeline
  const nowProgress = Math.max(0, Math.min(1, (now - shiftStartMs) / shiftDuration));

  // Stunden-Marker
  const hours: number[] = [];
  for (let t = shiftStartMs; t <= shiftEndMs; t += 3600000) {
    hours.push(t);
  }

  return (
    <div style={{ padding: '0' }}>
      <h3 style={{ color: '#fff', marginBottom: '16px' }}>Schicht-Zeitleiste</h3>

      {/* Legende */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {config.machines.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: machineColors[m.id] || '#666' }} />
            <span style={{ color: '#ccc', fontSize: '0.85em' }}>{m.name} - {m.partName}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#7c3aed', border: '2px solid #a78bfa' }} />
          <span style={{ color: '#ccc', fontSize: '0.85em' }}>Messung</span>
        </div>
      </div>

      {/* Timeline pro Maschine */}
      {config.machines.map(machine => {
        const machineTasks = schedule.filter(t => t.machineId === machine.id);
        const color = machineColors[machine.id] || '#666';

        return (
          <div key={machine.id} style={{ marginBottom: '12px' }}>
            <div style={{ color: '#aaa', fontSize: '0.85em', marginBottom: '4px' }}>
              {machine.name} - {machine.partName}
            </div>
            <div style={{
              position: 'relative',
              background: '#1a1f2e',
              borderRadius: '6px',
              height: '36px',
              overflow: 'hidden',
            }}>
              {/* Stunden-Linien */}
              {hours.map(h => (
                <div key={h} style={{
                  position: 'absolute',
                  left: `${((h - shiftStartMs) / shiftDuration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: '#333',
                }} />
              ))}

              {/* Tasks */}
              {machineTasks.map((task, i) => {
                const startPct = ((task.dueAt - shiftStartMs) / shiftDuration) * 100;
                const widthPct = (task.durationSec * 1000 / shiftDuration) * 100;
                const isMeasure = task.type === 'measure';
                const isPast = task.dueAt + task.durationSec * 1000 < now;

                return (
                  <div
                    key={i}
                    title={`${task.machineName} - ${task.type === 'measure' ? 'Messen' : 'Spannen'} Teil #${task.partNumber} um ${formatTimestamp(task.dueAt)}`}
                    style={{
                      position: 'absolute',
                      left: `${startPct}%`,
                      width: `${Math.max(widthPct, 0.3)}%`,
                      top: isMeasure ? '2px' : '2px',
                      height: isMeasure ? '32px' : '32px',
                      background: isMeasure ? '#7c3aed' : color,
                      borderRadius: '3px',
                      opacity: isPast ? 0.4 : 0.9,
                      border: isMeasure ? '1px solid #a78bfa' : 'none',
                    }}
                  />
                );
              })}

              {/* Jetzt-Linie */}
              <div style={{
                position: 'absolute',
                left: `${nowProgress * 100}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#ef4444',
                zIndex: 10,
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '-4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#ef4444',
                }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Stunden-Beschriftung */}
      <div style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
        {hours.map(h => (
          <div key={h} style={{
            position: 'absolute',
            left: `${((h - shiftStartMs) / shiftDuration) * 100}%`,
            transform: 'translateX(-50%)',
            color: '#666',
            fontSize: '0.75em',
          }}>
            {new Date(h).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        ))}
      </div>

      {/* Statistik-Tabelle */}
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ color: '#fff', marginBottom: '8px' }}>Schicht-Statistik (geplant)</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '8px', color: '#aaa' }}>Maschine</th>
              <th style={{ textAlign: 'left', padding: '8px', color: '#aaa' }}>Teil</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#aaa' }}>Zykluszeit</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#aaa' }}>Teile/Schicht</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#aaa' }}>Messungen</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#aaa' }}>Einspann-Vorgänge</th>
            </tr>
          </thead>
          <tbody>
            {config.machines.map(machine => {
              const machineTasks = schedule.filter(t => t.machineId === machine.id);
              const setupCount = machineTasks.filter(t => t.type === 'setup').length;
              const measureCount = machineTasks.filter(t => t.type === 'measure').length;

              return (
                <tr key={machine.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px', color: machineColors[machine.id] || '#fff', fontWeight: 'bold' }}>
                    {machine.name}
                  </td>
                  <td style={{ padding: '8px', color: '#ccc' }}>{machine.partName}</td>
                  <td style={{ padding: '8px', color: '#ccc', textAlign: 'right' }}>
                    {Math.floor(machine.cycleTimeSec / 60)}:{(machine.cycleTimeSec % 60).toString().padStart(2, '0')} min
                  </td>
                  <td style={{ padding: '8px', color: '#fff', textAlign: 'right', fontWeight: 'bold' }}>
                    {setupCount}
                  </td>
                  <td style={{ padding: '8px', color: '#a78bfa', textAlign: 'right' }}>{measureCount}</td>
                  <td style={{ padding: '8px', color: '#ccc', textAlign: 'right' }}>{setupCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
