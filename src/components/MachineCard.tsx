import { useState } from 'react';
import { MachineStatus } from '../useAppState';
import { CycleRecord } from '../types';
import { formatTime, formatTimestamp } from '../scheduler';

const urgencyColors = {
  ok: { bg: '#1a2332', border: '#2d4a6f', text: '#88b4e7', progress: '#3b82f6' },
  soon: { bg: '#2a2a1a', border: '#6f6f2d', text: '#e7d888', progress: '#eab308' },
  now: { bg: '#2a1a1a', border: '#6f2d2d', text: '#e78888', progress: '#ef4444' },
  overdue: { bg: '#3a1010', border: '#8b2020', text: '#ff6666', progress: '#dc2626' },
  paused: { bg: '#1a1a2a', border: '#4a4a6f', text: '#aaaacc', progress: '#6b7280' },
};

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
  status: MachineStatus;
  stats: MachineStats | null;
  onResync: (id: string) => void;
  onCompleteCycle: (id: string) => void;
  onTogglePause: (id: string) => void;
  onAdjustOffset: (id: string, sec: number) => void;
}

export function MachineCard({ status, stats, onResync, onCompleteCycle, onTogglePause, onAdjustOffset }: Props) {
  const { timing, urgency } = status;
  const { machine, secondsRemaining, cycleProgress, measurementDue, nextBatchEndPart, runState, effectiveCycleSec } = timing;
  const colors = urgencyColors[urgency];
  const isPaused = runState.paused;
  const [showStats, setShowStats] = useState(false);

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
        <button onClick={() => onTogglePause(machine.id)} style={ctrlBtn(isPaused ? '#10b981' : '#f59e0b')} title={isPaused ? 'Fortsetzen' : 'Pausieren'}>
          {isPaused ? '\u25B6 Weiter' : '\u23F8 Pause'}
        </button>
        <button onClick={() => onResync(machine.id)} style={ctrlBtn('#3b82f6')} title="Zyklus jetzt neu gestartet">
          {'\u21BB'} Sync
        </button>
        <button onClick={() => onCompleteCycle(machine.id)} style={ctrlBtn('#10b981')} title="Teil fertig, nächster Zyklus">
          {'\u2713'} Fertig
        </button>
        <button onClick={() => onAdjustOffset(machine.id, -30)} style={ctrlBtn('#6b7280')} title="30 Sek früher">
          -30s
        </button>
        <button onClick={() => onAdjustOffset(machine.id, 30)} style={ctrlBtn('#6b7280')} title="30 Sek später">
          +30s
        </button>
      </div>

      {/* ─── Statistik Toggle ─── */}
      {stats && (
        <button
          onClick={() => setShowStats(!showStats)}
          style={{
            background: 'none',
            border: '1px solid #374151',
            color: '#9ca3af',
            borderRadius: '6px',
            padding: '6px 0',
            fontSize: '0.78em',
            cursor: 'pointer',
            width: '100%',
            marginTop: '10px',
            textAlign: 'center',
          }}
        >
          {showStats ? '\u25B2 Statistik ausblenden' : `\u25BC Statistik (${stats.count} Zyklen)`}
        </button>
      )}

      {/* ─── Statistik-Details ─── */}
      {showStats && stats && (
        <div style={{ marginTop: '10px', padding: '12px', background: '#0d1117', borderRadius: '8px', fontSize: '0.82em' }}>
          {/* Übersicht */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <StatBox label="Zyklen" value={`${stats.count}`} color="#60a5fa" />
            <StatBox
              label={'\u00D8 Ist-Takt'}
              value={formatTime(stats.avg)}
              sub={`Soll: ${formatTime(effectiveCycleSec)}`}
              color={Math.abs(stats.avgDeviation) <= 30 ? '#10b981' : stats.avgDeviation > 0 ? '#ef4444' : '#eab308'}
            />
            <StatBox label="Schnellster" value={formatTime(stats.min)} color="#10b981" />
            <StatBox label="Langsamster" value={formatTime(stats.max)} color="#ef4444" />
            <StatBox
              label={'\u00D8 Abweichung'}
              value={`${stats.avgDeviation > 0 ? '+' : ''}${formatTime(stats.avgDeviation)}`}
              color={stats.avgDeviation <= 0 ? '#10b981' : stats.avgDeviation <= 60 ? '#eab308' : '#ef4444'}
            />
            {stats.count >= 3 && (
              <StatBox
                label="Trend"
                value={stats.trend > 5 ? 'Langsamer' : stats.trend < -5 ? 'Schneller' : 'Stabil'}
                color={stats.trend > 5 ? '#ef4444' : stats.trend < -5 ? '#10b981' : '#60a5fa'}
              />
            )}
          </div>

          {/* Letzte Zyklen */}
          <div style={{ color: '#888', fontSize: '0.9em', marginBottom: '6px' }}>Letzte Zyklen:</div>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {stats.records.slice(-10).reverse().map((r, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '3px 6px',
                borderRadius: '4px',
                background: i % 2 === 0 ? '#111827' : 'transparent',
                fontSize: '0.9em',
              }}>
                <span style={{ color: '#888' }}>
                  {new Date(r.completedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ color: '#ccc', fontFamily: 'monospace' }}>
                  {formatTime(r.actualSec)}
                </span>
                <span style={{
                  color: r.deviationSec <= 0 ? '#10b981' : r.deviationSec <= 60 ? '#eab308' : '#ef4444',
                  fontFamily: 'monospace',
                  minWidth: '60px',
                  textAlign: 'right',
                }}>
                  {r.deviationSec > 0 ? '+' : ''}{formatTime(r.deviationSec)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#111827',
      borderRadius: '6px',
      padding: '8px',
      textAlign: 'center',
    }}>
      <div style={{ color: '#888', fontSize: '0.82em', marginBottom: '2px' }}>{label}</div>
      <div style={{ color, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1em' }}>{value}</div>
      {sub && <div style={{ color: '#555', fontSize: '0.8em' }}>{sub}</div>}
    </div>
  );
}

function ctrlBtn(bg: string): React.CSSProperties {
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
