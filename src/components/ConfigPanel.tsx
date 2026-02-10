import { useState, useEffect } from 'react';
import { AppConfig, Machine, Article, AirtableMachine } from '../types';
import { defaultConfig } from '../defaultConfig';
import { fetchAirtableMachines } from '../airtable';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

type SortField = 'maschine' | 'maschinenId' | 'hersteller' | 'gruppe';
type SortDir = 'asc' | 'desc';
type Tab = 'maschinen' | 'artikel' | 'schicht';

/** Felder, die vom Artikel kommen und überschrieben werden können */
const ARTICLE_FIELDS: { key: keyof Article & keyof Machine; label: string; unit: string }[] = [
  { key: 'cycleTimeSec', label: 'Bearbeitungszeit/Teil', unit: 'Sek' },
  { key: 'setupTimeSec', label: 'Spannzeit', unit: 'Sek' },
  { key: 'measureEveryN', label: 'Messen alle X Teile', unit: '' },
  { key: 'measureTimeSec', label: 'Messzeit', unit: 'Sek' },
  { key: 'partsPerTower', label: 'Teile/Turmseite', unit: '' },
];

export function ConfigPanel({ config, onSave }: Props) {
  const [draft, setDraft] = useState<AppConfig>(JSON.parse(JSON.stringify(config)));
  const [airtableMachines, setAirtableMachines] = useState<AirtableMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('maschine');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterGruppe, setFilterGruppe] = useState<string>('alle');
  const [tab, setTab] = useState<Tab>('maschinen');
  const [editArticleId, setEditArticleId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAirtableMachines()
      .then(setAirtableMachines)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ─── Machine functions ───
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

  function assignArticle(machineIndex: number, articleId: string) {
    const newMachines = [...draft.machines];
    if (articleId === '') {
      // Artikel entfernen
      newMachines[machineIndex] = { ...newMachines[machineIndex], articleId: undefined };
    } else {
      const article = draft.articles.find(a => a.id === articleId);
      if (!article) return;
      // Stammdaten übernehmen
      newMachines[machineIndex] = {
        ...newMachines[machineIndex],
        articleId,
        partName: article.name,
        cycleTimeSec: article.cycleTimeSec,
        setupTimeSec: article.setupTimeSec,
        measureEveryN: article.measureEveryN,
        measureTimeSec: article.measureTimeSec,
        partsPerTower: article.partsPerTower,
      };
    }
    setDraft({ ...draft, machines: newMachines });
  }

  function getArticleForMachine(machine: Machine): Article | undefined {
    if (!machine.articleId) return undefined;
    return draft.articles.find(a => a.id === machine.articleId);
  }

  function isOverridden(machine: Machine, field: keyof Article & keyof Machine): boolean {
    const article = getArticleForMachine(machine);
    if (!article) return false;
    return machine[field] !== article[field];
  }

  function resetField(machineIndex: number, field: keyof Article & keyof Machine) {
    const article = getArticleForMachine(draft.machines[machineIndex]);
    if (!article) return;
    updateMachine(machineIndex, field, article[field] as number);
  }

  // ─── Article functions ───
  function addArticle() {
    const id = `art-${Date.now()}`;
    const newArticle: Article = {
      id,
      name: 'Neuer Artikel',
      cycleTimeSec: 300,
      setupTimeSec: 120,
      measureEveryN: 10,
      measureTimeSec: 180,
      partsPerTower: 4,
    };
    setDraft({ ...draft, articles: [...draft.articles, newArticle] });
    setEditArticleId(id);
  }

  function updateArticle(index: number, field: keyof Article, value: string | number) {
    const newArticles = [...draft.articles];
    newArticles[index] = { ...newArticles[index], [field]: value };
    setDraft({ ...draft, articles: newArticles });
  }

  function deleteArticle(index: number) {
    const articleId = draft.articles[index].id;
    // Zuordnungen entfernen
    const newMachines = draft.machines.map(m =>
      m.articleId === articleId ? { ...m, articleId: undefined } : m
    );
    const newArticles = draft.articles.filter((_, i) => i !== index);
    setDraft({ ...draft, articles: newArticles, machines: newMachines });
  }

  function duplicateArticle(index: number) {
    const source = draft.articles[index];
    const id = `art-${Date.now()}`;
    const copy: Article = { ...source, id, name: `${source.name} (Kopie)` };
    setDraft({ ...draft, articles: [...draft.articles, copy] });
    setEditArticleId(id);
  }

  // ─── Airtable filter/sort ───
  const gruppen = Array.from(new Set(airtableMachines.map(m => m.gruppe).filter(Boolean))).sort();

  const filteredMachines = airtableMachines
    .filter(am => {
      if (filterGruppe !== 'alle' && am.gruppe !== filterGruppe) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          am.maschine.toLowerCase().includes(q) ||
          am.maschinenId.toLowerCase().includes(q) ||
          am.hersteller.toLowerCase().includes(q) ||
          am.gruppe.toLowerCase().includes(q) ||
          am.seriennummer.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField].toLowerCase();
      const bVal = b[sortField].toLowerCase();
      const cmp = aVal.localeCompare(bVal, 'de');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  }

  function handleSave() {
    onSave(draft);
  }

  function handleReset() {
    setDraft(JSON.parse(JSON.stringify(defaultConfig)));
  }

  // ─── Render ───
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Konfiguration</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleReset} style={btnStyle('#6b7280')}>Zurücksetzen</button>
          <button onClick={handleSave} style={btnStyle('#10b981')}>Speichern</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {([
          ['maschinen', 'Maschinen'],
          ['artikel', `Artikelstammdaten (${draft.articles.length})`],
          ['schicht', 'Schichtzeiten'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...btnStyle(tab === t ? '#2563eb' : '#374151'),
              padding: '8px 16px',
              fontSize: '0.85em',
              borderRadius: '8px 8px 0 0',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Schichtzeiten ═══ */}
      {tab === 'schicht' && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '16px' }}>
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
      )}

      {/* ═══ Tab: Artikelstammdaten ═══ */}
      {tab === 'artikel' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.85em' }}>
              Artikel einmal anlegen, dann Maschinen zuordnen. Stammdaten bleiben unverändert.
            </span>
            <button onClick={addArticle} style={{ ...btnStyle('#2563eb'), padding: '8px 16px', fontSize: '0.85em' }}>
              + Neuer Artikel
            </button>
          </div>

          {draft.articles.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px', background: '#111827', borderRadius: '12px' }}>
              Noch keine Artikel angelegt. Erstelle einen Artikel mit den Produktionsdaten.
            </div>
          )}

          {draft.articles.map((article, index) => {
            const isEditing = editArticleId === article.id;
            const usedBy = draft.machines.filter(m => m.articleId === article.id);

            return (
              <div key={article.id} style={{
                background: '#111827',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '10px',
                border: isEditing ? '1px solid #2563eb' : '1px solid #1f2937',
              }}>
                {/* Artikel-Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={article.name}
                        onChange={e => updateArticle(index, 'name', e.target.value)}
                        style={{ ...inputStyle, fontWeight: 'bold', fontSize: '1em', maxWidth: '300px' }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => setEditArticleId(article.id)}
                      >
                        {article.name}
                      </span>
                    )}
                    {usedBy.length > 0 && (
                      <span style={{ color: '#10b981', fontSize: '0.75em', background: '#1a2a1a', padding: '2px 8px', borderRadius: '10px' }}>
                        {usedBy.length}x zugeordnet
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditArticleId(isEditing ? null : article.id)}
                      style={{ ...btnStyle(isEditing ? '#10b981' : '#4b5563'), padding: '4px 12px', fontSize: '0.78em' }}
                    >
                      {isEditing ? 'Fertig' : 'Bearbeiten'}
                    </button>
                    <button
                      onClick={() => duplicateArticle(index)}
                      style={{ ...btnStyle('#4b5563'), padding: '4px 12px', fontSize: '0.78em' }}
                    >
                      Kopieren
                    </button>
                    <button
                      onClick={() => deleteArticle(index)}
                      style={{ ...btnStyle('#dc2626'), padding: '4px 12px', fontSize: '0.78em' }}
                    >
                      {'\u2715'}
                    </button>
                  </div>
                </div>

                {/* Kompakt-Ansicht */}
                {!isEditing && (
                  <div style={{ color: '#888', fontSize: '0.8em', marginTop: '4px' }}>
                    {article.cycleTimeSec}s/Teil | {article.partsPerTower} Teile/Turm | Spannzeit {article.setupTimeSec}s | Messen alle {article.measureEveryN} ({article.measureTimeSec}s)
                  </div>
                )}

                {/* Bearbeiten-Felder */}
                {isEditing && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {ARTICLE_FIELDS.map(({ key, label, unit }) => (
                      <label key={key} style={labelStyle}>
                        <span style={{ color: '#aaa', fontSize: '0.82em' }}>{label}{unit ? ` (${unit})` : ''}</span>
                        <input
                          type="number"
                          value={article[key] as number}
                          onChange={e => updateArticle(index, key, Number(e.target.value))}
                          style={inputStyle}
                          min={1}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Tab: Maschinen ═══ */}
      {tab === 'maschinen' && (
        <div>
          {/* Airtable-Maschinenliste */}
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
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, flex: '1 1 200px', minWidth: '150px' }}
                  />
                  <select
                    value={filterGruppe}
                    onChange={e => setFilterGruppe(e.target.value)}
                    style={{ ...inputStyle, flex: '0 0 auto', minWidth: '140px', cursor: 'pointer' }}
                  >
                    <option value="alle">Alle Gruppen</option>
                    {gruppen.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr auto',
                  gap: '8px',
                  padding: '6px 12px',
                  marginBottom: '4px',
                }}>
                  {([
                    ['maschine', 'Maschine'],
                    ['hersteller', 'Hersteller'],
                    ['gruppe', 'Gruppe'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <button
                      key={field}
                      onClick={() => toggleSort(field)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: sortField === field ? '#60a5fa' : '#9ca3af',
                        cursor: 'pointer',
                        fontWeight: sortField === field ? 'bold' : 'normal',
                        fontSize: '0.78em',
                        textAlign: 'left',
                        padding: 0,
                      }}
                    >
                      {label}{sortIndicator(field)}
                    </button>
                  ))}
                  <span />
                </div>

                <div style={{ color: '#666', fontSize: '0.78em', marginBottom: '6px', paddingLeft: '12px' }}>
                  {filteredMachines.length} von {airtableMachines.length} Maschinen
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
                  {filteredMachines.map(am => {
                    const added = isAlreadyAdded(am);
                    return (
                      <div key={am.airtableId} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1fr auto',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: added ? '#1a2a1a' : '#1a1f2e',
                        border: `1px solid ${added ? '#2d6f2d' : '#2d3748'}`,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9em' }}>{am.maschine}</div>
                          <div style={{ color: '#888', fontSize: '0.75em' }}>{am.maschinenId} | SN: {am.seriennummer}</div>
                        </div>
                        <div style={{ color: '#aaa', fontSize: '0.85em' }}>{am.hersteller}</div>
                        <div style={{ color: '#aaa', fontSize: '0.85em' }}>{am.gruppe}</div>
                        <button
                          onClick={() => addMachineFromAirtable(am)}
                          disabled={added}
                          style={{
                            ...btnStyle(added ? '#374151' : '#2563eb'),
                            opacity: added ? 0.5 : 1,
                            cursor: added ? 'default' : 'pointer',
                            padding: '6px 14px',
                            fontSize: '0.8em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {added ? 'Aktiv' : '+ Hinzufügen'}
                        </button>
                      </div>
                    );
                  })}
                  {filteredMachines.length === 0 && (
                    <div style={{ color: '#666', fontSize: '0.9em', textAlign: 'center', padding: '20px' }}>
                      Keine Treffer für diese Suche/Filter.
                    </div>
                  )}
                </div>
              </>
            )}
            {!loading && !error && airtableMachines.length === 0 && (
              <div style={{ color: '#666', fontSize: '0.9em' }}>Keine Maschinen in Airtable gefunden.</div>
            )}
          </div>

          {/* ─── Aktive Maschinen ─── */}
          <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>
            Aktive Maschinen in dieser Schicht ({draft.machines.length})
          </h4>

          {draft.machines.map((machine, index) => {
            const article = getArticleForMachine(machine);
            return (
              <div key={machine.id} style={{
                background: '#111827',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
              }}>
                {/* Machine header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#fff', margin: 0 }}>{machine.name}</h4>
                  <button
                    onClick={() => removeMachine(index)}
                    style={{ ...btnStyle('#dc2626'), padding: '4px 12px', fontSize: '0.8em' }}
                  >
                    Entfernen
                  </button>
                </div>

                {/* Artikel-Zuordnung */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#aaa', fontSize: '0.85em', whiteSpace: 'nowrap' }}>Artikel:</span>
                    <select
                      value={machine.articleId || ''}
                      onChange={e => assignArticle(index, e.target.value)}
                      style={{ ...inputStyle, width: 'auto', minWidth: '200px', cursor: 'pointer' }}
                    >
                      <option value="">-- Kein Artikel --</option>
                      {draft.articles.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </label>
                  {article && (
                    <span style={{ color: '#10b981', fontSize: '0.78em' }}>
                      Stammdaten von "{article.name}" geladen
                    </span>
                  )}
                </div>

                {/* Teilename */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>
                    <span style={{ color: '#aaa', fontSize: '0.85em' }}>Teilename</span>
                    <input
                      type="text"
                      value={machine.partName}
                      onChange={e => updateMachine(index, 'partName', e.target.value)}
                      style={{ ...inputStyle, maxWidth: '300px' }}
                    />
                  </label>
                </div>

                {/* Produktionsdaten (mit Override-Anzeige) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {ARTICLE_FIELDS.map(({ key, label, unit }) => {
                    const overridden = isOverridden(machine, key);
                    return (
                      <label key={key} style={labelStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: overridden ? '#f59e0b' : '#aaa', fontSize: '0.85em' }}>
                            {label}{unit ? ` (${unit})` : ''}
                          </span>
                          {overridden && (
                            <button
                              onClick={() => resetField(index, key)}
                              title={`Zurück auf Stammwert: ${article![key]}`}
                              style={{
                                background: 'none',
                                border: '1px solid #f59e0b',
                                color: '#f59e0b',
                                borderRadius: '4px',
                                fontSize: '0.7em',
                                padding: '0 5px',
                                cursor: 'pointer',
                                lineHeight: '1.4',
                              }}
                            >
                              {'\u21A9'}
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          value={machine[key] as number}
                          onChange={e => updateMachine(index, key, Number(e.target.value))}
                          style={{
                            ...inputStyle,
                            borderColor: overridden ? '#f59e0b' : '#374151',
                          }}
                          min={1}
                        />
                      </label>
                    );
                  })}
                </div>

                {/* Override-Hinweis */}
                {article && ARTICLE_FIELDS.some(f => isOverridden(machine, f.key)) && (
                  <div style={{ color: '#f59e0b', fontSize: '0.78em', marginTop: '8px' }}>
                    {'\u26A0'} Gelb markierte Werte weichen von den Stammdaten ab. Klicke {'\u21A9'} zum Zurücksetzen.
                  </div>
                )}
              </div>
            );
          })}

          {draft.machines.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px', background: '#111827', borderRadius: '12px' }}>
              Keine Maschinen aktiv. Füge oben Maschinen aus Airtable hinzu.
            </div>
          )}
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
