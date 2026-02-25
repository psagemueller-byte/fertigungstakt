import { MachineStatus } from '../useAppState';
import { formatTime } from '../scheduler';

/** Position einer Maschine im Hallenplan (Prozent-basiert) */
interface FloorPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 14 Maschinen-Positionen im 4-3-3-4 Layout:
 *   Row 1: D001  D002  D003  D004
 *   Row 2:   D005   D006   D007
 *          ─── GANG ───
 *   Row 3:   D008   D009   D010
 *   Row 4: D011  D012  D013  D014
 */
const FLOOR_POSITIONS: FloorPosition[] = [
  // Row 1 (top)
  { id: 'D001', x: 8,  y: 4,  width: 18, height: 18 },
  { id: 'D002', x: 29, y: 4,  width: 18, height: 18 },
  { id: 'D003', x: 53, y: 4,  width: 18, height: 18 },
  { id: 'D004', x: 74, y: 4,  width: 18, height: 18 },
  // Row 2 (upper-middle)
  { id: 'D005', x: 14, y: 28, width: 18, height: 18 },
  { id: 'D006', x: 41, y: 28, width: 18, height: 18 },
  { id: 'D007', x: 68, y: 28, width: 18, height: 18 },
  // Row 3 (lower-middle)
  { id: 'D008', x: 14, y: 54, width: 18, height: 18 },
  { id: 'D009', x: 41, y: 54, width: 18, height: 18 },
  { id: 'D010', x: 68, y: 54, width: 18, height: 18 },
  // Row 4 (bottom)
  { id: 'D011', x: 8,  y: 78, width: 18, height: 18 },
  { id: 'D012', x: 29, y: 78, width: 18, height: 18 },
  { id: 'D013', x: 53, y: 78, width: 18, height: 18 },
  { id: 'D014', x: 74, y: 78, width: 18, height: 18 },
];

/** Extrahiert D-Nummer (z.B. "D003") aus name oder id einer Maschine */
function extractDNumber(status: MachineStatus): string | null {
  // Erst im Name suchen (Airtable-Pattern: "Okuma MU-6300V (D003)")
  const nameMatch = status.timing.machine.name.match(/D\d{3}/);
  if (nameMatch) return nameMatch[0];
  // Fallback: direkt in der ID suchen
  const idMatch = status.timing.machine.id.match(/D\d{3}/);
  if (idMatch) return idMatch[0];
  return null;
}

interface Props {
  machineStatuses: MachineStatus[];
}

export function FloorPlan({ machineStatuses }: Props) {
  // Map: D-Nummer → MachineStatus
  const machineByDNumber = new Map<string, MachineStatus>();
  for (const status of machineStatuses) {
    const dNum = extractDNumber(status);
    if (dNum) {
      machineByDNumber.set(dNum, status);
    }
  }

  const hasAnyMachine = machineByDNumber.size > 0;

  return (
    <div>
      <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: '1.3em' }}>
        Hallenplan
      </h3>

      {/* Hallenplan-Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1200px',
        aspectRatio: '16 / 10',
        margin: '0 auto',
        background: '#111827',
        borderRadius: '16px',
        border: '1px solid #1f2937',
        overflow: 'hidden',
      }}>
        {/* Subtiles Bodenmuster */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Gang-Markierungen zwischen den Reihen */}
        <div style={{
          position: 'absolute',
          left: '5%', right: '5%',
          top: '24%', height: '1px',
          background: '#2d3748',
        }} />
        <div style={{
          position: 'absolute',
          left: '5%', right: '5%',
          top: '50%', height: '2px',
          borderTop: '1px dashed rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute',
          left: '5%', right: '5%',
          top: '76%', height: '1px',
          background: '#2d3748',
        }} />

        {/* Hinweis wenn keine Maschinen zugeordnet */}
        {!hasAnyMachine && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <span style={{ color: '#6b7280', fontSize: '1.1em' }}>
              Keine Maschinen im Hallenplan gefunden.
            </span>
            <span style={{ color: '#4b5563', fontSize: '0.85em' }}>
              Maschinen-IDs oder -Namen müssen D001–D014 enthalten.
            </span>
          </div>
        )}

        {/* Maschinen-Positionen */}
        {FLOOR_POSITIONS.map(pos => {
          const status = machineByDNumber.get(pos.id);
          if (!status) return null;

          const isRunning =
            status.urgency === 'ok' ||
            status.urgency === 'soon' ||
            status.urgency === 'now';

          return (
            <div
              key={pos.id}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.width}%`,
                height: `${pos.height}%`,
                background: isRunning
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
                border: `2px solid ${isRunning ? '#10b981' : '#ef4444'}`,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                animation: isRunning
                  ? 'greenShimmer 2.5s ease-in-out infinite'
                  : 'redPulse 1.2s ease-in-out infinite',
                cursor: 'default',
                padding: '4px',
              }}
            >
              {/* D-Nummer */}
              <div style={{
                color: '#9ca3af',
                fontSize: '0.7em',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
              }}>
                {pos.id}
              </div>

              {/* Maschinenname */}
              <div style={{
                color: '#fff',
                fontSize: '0.8em',
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                padding: '0 4px',
              }}>
                {status.timing.machine.name}
              </div>

              {/* Status: Countdown oder PAUSE/WARTET */}
              <div style={{
                color: isRunning ? '#10b981' : '#ef4444',
                fontSize: '1.1em',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}>
                {status.timing.runState.paused
                  ? 'PAUSE'
                  : status.urgency === 'overdue'
                    ? 'WARTET'
                    : formatTime(status.timing.secondsRemaining)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        marginTop: '16px',
        color: '#9ca3af',
        fontSize: '0.85em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.3)',
            border: '2px solid #10b981',
            boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
          }} />
          Maschine läuft
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            background: 'rgba(239, 68, 68, 0.3)',
            border: '2px solid #ef4444',
            boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
          }} />
          Stillstand / Pause
        </div>
      </div>
    </div>
  );
}
