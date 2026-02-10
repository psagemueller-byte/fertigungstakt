import { useState } from 'react';
import { AppConfig, Machine } from '../types';
import { defaultConfig } from '../defaultConfig';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export function ConfigPanel({ config, onSave }: Props) {
  const [draft, setDraft] = useState<AppConfig>(JSON.parse(JSON.stringify(config)));

  function updateMachine(index: number, field: keyof Machine, value: string | number) {
    const newMachines = [...draft.machines];
    newMachines[index] = { ...newMachines[index], [field]: value };
    setDraft({ ...draft, machines: newMachines });
  }

  function handleSave() {
    onSave(draft);
  }

  function handleReset() {
    setDraft(JSON.parse(JSON.stringify(defaultConfig)));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Konfiguration</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleReset} style={btnStyle('#6b7280')}>Zurücksetzen</button>
          <button onClick={handleSave} style={btnStyle('#10b981')}>Speichern</button>
        </div>
      </div>

      {/* Schicht-Zeiten */}
      <div style={{ background: '#111827', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>Schichtzeiten</h4>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <label style={labelStyle}>
            <span style={{ color: '#aaa' }}>Schichtbeginn</span>
            <input
              type="time"
              value={draft.shift.startTime}
              onChange={e => setDraft({ ...draft, shift: { ...draft.shift, startTime: e.target.value } })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ color: '#aaa' }}>Schichtende</span>
            <input
              type="time"
              value={draft.shift.endTime}
              onChange={e => setDraft({ ...draft, shift: { ...draft.shift, endTime: e.target.value } })}
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      {/* Maschinen */}
      {draft.machines.map((machine, index) => (
        <div key={machine.id} style={{
          background: '#111827',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
        }}>
          <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>{machine.name}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            <label style={labelStyle}>
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Teilename</span>
              <input
                type="text"
                value={machine.partName}
                onChange={e => updateMachine(index, 'partName', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Bearbeitungszeit pro Teil (Sek)</span>
              <input
                type="number"
                value={machine.cycleTimeSec}
                onChange={e => updateMachine(index, 'cycleTimeSec', Number(e.target.value))}
                style={inputStyle}
                min={1}
              />
            </label>
            <label style={labelStyle}>
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Spannzeit (Sek)</span>
              <input
                type="number"
                value={machine.setupTimeSec}
                onChange={e => updateMachine(index, 'setupTimeSec', Number(e.target.value))}
                style={inputStyle}
                min={1}
              />
            </label>
            <label style={labelStyle}>
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Messen alle X Teile</span>
              <input
                type="number"
                value={machine.measureEveryN}
                onChange={e => updateMachine(index, 'measureEveryN', Number(e.target.value))}
                style={inputStyle}
                min={1}
              />
            </label>
            <label style={labelStyle}>
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Messzeit (Sek)</span>
              <input
                type="number"
                value={machine.measureTimeSec}
                onChange={e => updateMachine(index, 'measureTimeSec', Number(e.target.value))}
                style={inputStyle}
                min={1}
              />
            </label>
            <label style={labelStyle}>
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Teile pro Turm</span>
              <input
                type="number"
                value={machine.partsPerTower}
                onChange={e => updateMachine(index, 'partsPerTower', Number(e.target.value))}
                style={inputStyle}
                min={1}
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '6px',
  padding: '8px 12px',
  color: '#fff',
  fontSize: '1em',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 20px',
    fontSize: '0.95em',
    cursor: 'pointer',
    fontWeight: 'bold',
  };
}
