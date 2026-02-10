import { PlannedStep } from '../types';
import { formatTime, formatTimestamp } from '../scheduler';

interface Props {
  title: string;
  icon: string;
  plan: PlannedStep[];
  totalIdleSec?: number;
}

export function WorkerQueue({ title, icon, plan, totalIdleSec }: Props) {
  return (
    <div style={{
      flex: '1 1 350px',
      background: '#111827',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '300px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1em' }}>
          <span dangerouslySetInnerHTML={{ __html: icon }} /> {title}
        </h3>
        {totalIdleSec !== undefined && (
          <span style={{
            fontSize: '0.8em',
            color: totalIdleSec > 60 ? '#ef4444' : totalIdleSec > 20 ? '#eab308' : '#10b981',
            fontWeight: 'bold',
          }}>
            Stillstand: {formatTime(totalIdleSec)}
          </span>
        )}
      </div>

      {plan.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          Keine Aufgaben anstehend
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {plan.map((step, index) => {
            const isOverdue = step.machineIdleSec > 0;
            const isWaiting = step.workerWaitsSec > 0;
            const remainingSec = (step.machineDueAt - Date.now()) / 1000;

            const urgency = remainingSec <= 0 ? 'overdue'
              : remainingSec <= 30 ? 'now'
              : remainingSec <= 120 ? 'soon'
              : 'ok';

            const urgencyBg = urgency === 'overdue' ? '#3a1010'
              : urgency === 'now' ? '#2a1a1a'
              : urgency === 'soon' ? '#2a2a1a'
              : '#1a1f2e';
            const urgencyBorder = urgency === 'overdue' ? '#8b2020'
              : urgency === 'now' ? '#6f2d2d'
              : urgency === 'soon' ? '#6f6f2d'
              : '#2d3748';

            return (
              <div
                key={`${step.machineId}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: urgencyBg,
                  border: `1px solid ${urgencyBorder}`,
                  borderRadius: '8px',
                  animation: urgency === 'overdue' ? 'pulse 1s infinite' : 'none',
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

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95em' }}>
                    {step.machineName}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>
                    {step.partName} #{step.partNumber}
                    {step.type === 'measure' && (
                      <span style={{ color: '#a78bfa', marginLeft: '6px' }}>MESSEN</span>
                    )}
                  </div>
                  {/* Timing-Details */}
                  <div style={{ fontSize: '0.7em', marginTop: '2px', display: 'flex', gap: '8px' }}>
                    {isOverdue && (
                      <span style={{ color: '#ef4444' }}>
                        Stillstand: {formatTime(step.machineIdleSec)}
                      </span>
                    )}
                    {isWaiting && (
                      <span style={{ color: '#10b981' }}>
                        Puffer: {formatTime(step.workerWaitsSec)}
                      </span>
                    )}
                    <span style={{ color: '#666' }}>
                      Ankunft: {formatTimestamp(step.workerArrivesAt)}
                    </span>
                  </div>
                </div>

                {/* Countdown bis Zyklusende */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    color: urgency === 'overdue' ? '#ff6666'
                      : urgency === 'now' ? '#ff8888'
                      : urgency === 'soon' ? '#e7d888'
                      : '#88b4e7',
                  }}>
                    {formatTime(remainingSec)}
                  </div>
                  <div style={{ fontSize: '0.65em', color: '#666' }}>
                    {formatTime(step.durationSec)} Arbeit
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
