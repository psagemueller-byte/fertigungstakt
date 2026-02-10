import { useState, useEffect } from 'react';
import { AppConfig, Machine, AirtableMachine } from '../types';
import { defaultConfig } from '../defaultConfig';
import { fetchAirtableMachines } from '../airtable';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export function ConfigPanel({ config, onSave }: Props) {
  const [draft, setDraft] = useState<AppConfig>(JSON.parse(JSON.stringify(config)));
  const [airtableMachines, setAirtableMachines] = useState<AirtableMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Airtable-Maschinen laden
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAirtableMachines()
      .then(setAirtableMachines)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateMachine(index: number, field: keyof Machine, value: string | number) {
    const newMachines = [...draft.machines];
    newMachines[index] = { ...newMachines[index], [field]: value };
    setDraft({ ...draft, machines: newMachines });
  }

  function removeMachine(index: number) {
    const newMachines = draft.machines.filter((_, i) => i !== index);
    setDraft({ ...draft, machines: newMachines });
  }

  function addMachineFromAirtable(am: AirtableMachine) {
    // Prüfen ob schon hinzugefügt
    if (draft.machines.some(m => m.id === am.airtableId)) return;

    const newMachine: Machine = {
      id: am.airtableId,
      name: `${am.maschine} (${am.maschinenId})`,
      partName: '',
      cycleTimeSec: 300,
      setupTimeSec: 120,
      measureEveryN: 10,
      measureTimeSec: 180,
      partsPerTower: 4,
    };
    setDraft({ ...draft, machines: [...draft.machines, newMachine] });
  }

  function isAlreadyAdded(am: AirtableMachine): boolean {
    return draft.machines.some(m => m.id === am.airtableId);
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

      {/* ─── Maschine aus Airtable hinzufügen ─── */}
      <div style={{ background: '#111827', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>Maschine hinzufügen (Airtable)</h4>
        {loading && <div style={{ color: '#9ca3af' }}>Lade Maschinen aus Airtable...</div>}
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '8px' }}>
            Airtable-Fehler: {error}
            <br />
            <span style={{ color: '#888', fontSize: '0.85em' }}>
              Stelle sicher, dass AIRTABLE_TOKEN und AIRTABLE_BASE_ID in Vercel gesetzt sind.
            </span>
          </div>
        )}
        {!loading && airtableMachines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
            {airtableMachines.map(am => {
              const added = isAlreadyAdded(am);
              return (
                <div key={am.airtableId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: added ? '#1a2a1a' : '#1a1f2e',
                  border: `1px solid ${added ? '#2d6f2d' : '#2d3748'}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9em' }}>
                      {am.maschine}
                      <span style={{ color: '#888', fontWeight: 'normal', marginLeft: '8px' }}>{am.maschinenId}</span>
                    </div>
                    <div style={{ color: '#666', fontSize: '0.8em' }}>
                      {am.hersteller} | {am.gruppe} | SN: {am.seriennummer}
                    </div>
                  </div>
                  <button
                    onClick={() => addMachineFromAirtable(am)}
                    disabled={added}
                    style={{
                      ...btnStyle(added ? '#374151' : '#2563eb'),
                      opacity: added ? 0.5 : 1,
                      cursor: added ? 'default' : 'pointer',
                      padding: '6px 14px',
                      fontSize: '0.8em',
                    }}
                  >
                    {added ? 'Aktiv' : '+ Hinzufügen'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {!loading && !error && airtableMachines.length === 0 && (
          <div style={{ color: '#666', fontSize: '0.9em' }}>
            Keine Maschinen in Airtable gefunden.
          </div>
        )}
      </div>

      {/* ─── Aktive Maschinen in dieser Schicht ─── */}
      <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>
        Aktive Maschinen in dieser Schicht ({draft.machines.length})
      </h4>

      {draft.machines.map((machine, index) => (
        <div key={machine.id} style={{
          background: '#111827',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: '#fff', margin: 0 }}>{machine.name}</h4>
            <button
              onClick={() => removeMachine(index)}
              style={{ ...btnStyle('#dc2626'), padding: '4px 12px', fontSize: '0.8em' }}
            >
              Entfernen
            </button>
          </div>
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
              <span style={{ color: '#aaa', fontSize: '0.85em' }}>Teile pro Turmseite</span>
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

      {draft.machines.length === 0 && (
        <div style={{ color: '#666', textAlign: 'center', padding: '40px', background: '#111827', borderRadius: '12px' }}>
          Keine Maschinen aktiv. Füge oben Maschinen aus Airtable hinzu.
        </div>
      )}
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
