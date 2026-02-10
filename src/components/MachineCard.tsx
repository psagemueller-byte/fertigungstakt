import { MachineStatus } from '../useAppState';
import { formatTime, formatTimestamp } from '../scheduler';

const urgencyColors = {
  ok: { bg: '#1a2332', border: '#2d4a6f', text: '#88b4e7', progress: '#3b82f6' },
  soon: { bg: '#2a2a1a', border: '#6f6f2d', text: '#e7d888', progress: '#eab308' },
  now: { bg: '#2a1a1a', border: '#6f2d2d', text: '#e78888', progress: '#ef4444' },
  overdue: { bg: '#3a1010', border: '#8b2020', text: '#ff6666', progress: '#dc2626' },
};

interface Props {
  status: MachineStatus;
}

export function MachineCard({ status }: Props) {
  const { machine, secondsRemaining, nextTaskType, nextPartNumber, partsCompleted, cycleProgress, nextDueAt, urgency } = status;
  const colors = urgencyColors[urgency];

  return (
    <div style={{
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      minWidth: '280px',
      flex: '1 1 280px',
      transition: 'all 0.3s ease',
      animation: urgency === 'overdue' ? 'pulse 1s infinite' : urgency === 'now' ? 'pulse 2s infinite' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.3em' }}>{machine.name}</h3>
        <span style={{
          background: nextTaskType === 'measure' ? '#7c3aed' : '#2563eb',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '0.8em',
          fontWeight: 'bold',
        }}>
          {nextTaskType === 'measure' ? 'MESSEN' : 'SPANNEN'}
        </span>
      </div>

      {/* Teil-Info */}
      <div style={{ color: '#aaa', fontSize: '0.9em', marginBottom: '16px' }}>
        <div>{machine.partName}</div>
        <div>Teil #{nextPartNumber} | Fertig: {partsCompleted} Stk</div>
      </div>

      {/* Countdown */}
      <div style={{
        fontSize: '3em',
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        fontFamily: 'monospace',
        marginBottom: '12px',
      }}>
        {formatTime(secondsRemaining)}
      </div>

      {/* Fortschrittsbalken */}
      <div style={{
        background: '#111',
        borderRadius: '6px',
        height: '12px',
        overflow: 'hidden',
        marginBottom: '8px',
      }}>
        <div style={{
          width: `${cycleProgress * 100}%`,
          height: '100%',
          background: colors.progress,
          borderRadius: '6px',
          transition: 'width 1s linear',
        }} />
      </div>

      {/* Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.8em' }}>
        <span>Fällig: {formatTimestamp(nextDueAt)}</span>
        <span>Messen alle {machine.measureEveryN} Teile</span>
      </div>

      {/* Zykluszeit */}
      <div style={{ color: '#666', fontSize: '0.75em', marginTop: '4px', textAlign: 'center' }}>
        Zykluszeit: {formatTime(machine.cycleTimeSec)} | Spannzeit: {formatTime(machine.setupTimeSec)}
      </div>
    </div>
  );
}
