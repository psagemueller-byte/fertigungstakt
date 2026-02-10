import { MachineStatus } from '../useAppState';
import { formatTime, formatTimestamp } from '../scheduler';

const urgencyColors = {
  ok: { bg: '#1a2332', border: '#2d4a6f', text: '#88b4e7', progress: '#3b82f6' },
  soon: { bg: '#2a2a1a', border: '#6f6f2d', text: '#e7d888', progress: '#eab308' },
  now: { bg: '#2a1a1a', border: '#6f2d2d', text: '#e78888', progress: '#ef4444' },
  overdue: { bg: '#3a1010', border: '#8b2020', text: '#ff6666', progress: '#dc2626' },
  paused: { bg: '#1a1a2a', border: '#4a4a6f', text: '#aaaacc', progress: '#6b7280' },
};

interface Props {
  status: MachineStatus;
  onResync: (id: string) => void;
  onCompleteCycle: (id: string) => void;
  onTogglePause: (id: string) => void;
  onAdjustOffset: (id: string, sec: number) => void;
}

export function MachineCard({ status, onResync, onCompleteCycle, onTogglePause, onAdjustOffset }: Props) {
  const { timing, urgency } = status;
  const { machine, secondsRemaining, cycleProgress, measurementDue, nextBatchEndPart, runState, effectiveCycleSec } = timing;
  const colors = urgencyColors[urgency];
  const isPaused = runState.paused;

  return (
    <div style={{
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      minWidth: '280px',
      flex: '1 1 280px',
      transition: 'all 0.3s ease',
      opacity: isPaused ? 0.6 : 1,
      animation: urgency === 'overdue' ? 'pulse 1s infinite' : urgency === 'now' ? 'pulse 2s infinite' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.3em' }}>{machine.name}</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          {isPaused && (
            <span style={{ background: '#6b7280', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold' }}>
              PAUSE
            </span>
          )}
          {measurementDue && !isPaused && (
            <span style={{ background: '#7c3aed', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold' }}>
              MESSEN
            </span>
          )}
          {!isPaused && !measurementDue && (
            <span style={{ background: '#2563eb', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold' }}>
              SPANNEN
            </span>
          )}
        </div>
      </div>

      {/* Teil-Info */}
      <div style={{ color: '#aaa', fontSize: '0.9em', marginBottom: '16px' }}>
        <div>{machine.partName} | {machine.partsPerTower} Stk/Turmseite</div>
        <div>Nächster Batch: #{runState.partsCompleted + 1}-{nextBatchEndPart} | Fertig: {runState.partsCompleted} Stk</div>
      </div>

      {/* Countdown */}
      <div style={{
        fontSize: '3em',
        fontWeight: 'bold',
        color: isPaused ? '#666' : colors.text,
        textAlign: 'center',
        fontFamily: 'monospace',
        marginBottom: '12px',
      }}>
        {isPaused ? 'PAUSE' : formatTime(secondsRemaining)}
      </div>

      {/* Fortschrittsbalken */}
      {!isPaused && (
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
      )}

      {/* Details */}
      {!isPaused && (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.8em', marginBottom: '8px' }}>
          <span>Fällig: {formatTimestamp(timing.cycleEndsAt)}</span>
          <span>Messen alle {machine.measureEveryN} Teile</span>
        </div>
      )}

      {/* Zykluszeit */}
      <div style={{ color: '#666', fontSize: '0.75em', marginBottom: '12px', textAlign: 'center' }}>
        {formatTime(machine.cycleTimeSec)}/Teil × {machine.partsPerTower} = {formatTime(effectiveCycleSec)} Turm | Spannzeit: {formatTime(machine.setupTimeSec)}
      </div>

      {/* ─── Steuerung ─── */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button onClick={() => onTogglePause(machine.id)} style={btnStyle(isPaused ? '#10b981' : '#f59e0b')} title={isPaused ? 'Fortsetzen' : 'Pausieren'}>
          {isPaused ? '\u25B6 Weiter' : '\u23F8 Pause'}
        </button>
        <button onClick={() => onResync(machine.id)} style={btnStyle('#3b82f6')} title="Zyklus jetzt neu gestartet">
          {'\u21BB'} Sync
        </button>
        <button onClick={() => onCompleteCycle(machine.id)} style={btnStyle('#10b981')} title="Teil fertig, nächster Zyklus">
          {'\u2713'} Fertig
        </button>
        <button onClick={() => onAdjustOffset(machine.id, -30)} style={btnStyle('#6b7280')} title="30 Sek früher">
          -30s
        </button>
        <button onClick={() => onAdjustOffset(machine.id, 30)} style={btnStyle('#6b7280')} title="30 Sek später">
          +30s
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '0.75em',
    cursor: 'pointer',
    fontWeight: 'bold',
    flex: '1 1 auto',
    minWidth: '50px',
    textAlign: 'center',
  };
}
