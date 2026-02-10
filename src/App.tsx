import { useAppState } from './useAppState';
import { Dashboard } from './components/Dashboard';
import { ConfigPanel } from './components/ConfigPanel';
import { Timeline } from './components/Timeline';
import { formatTimestamp } from './scheduler';

export function App() {
  const state = useAppState();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e1a',
      color: '#e5e7eb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Audio für Alarm */}
      <audio ref={state.audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoqHfG1qcIGRo6eZfVxMU3CEjIV6cW9zhJSipJd+YU1Uf4iMiX5xbnGDk6KlmH9jT1d+iIuIfXFucYKToqWYgGRQV3+IjIl9cW5xg5OipZh/Y09Xf4iMiH1xbnGCk6KlmIBkUFd/iIyJfXBucYOToqWYf2NPV3+IjIh9cW5xgpOipZiAZFBXf4iMiX1xbnGDk6KlmH9jT1d+iIuIfXFucYKToqWYgGRQV3+IjIl9cG5xg5OipZh/Y09Xf4iLiH1xbg==" type="audio/wav" />
      </audio>

      {/* Header */}
      <header style={{
        background: '#111827',
        borderBottom: '1px solid #1f2937',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5em' }}>&#9881;</span>
          <h1 style={{ margin: 0, fontSize: '1.3em', color: '#fff' }}>Fertigungstakt</h1>
          <span style={{ color: '#666', fontSize: '0.85em' }}>CNC Produktionssteuerung</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '1.1em' }}>
            {formatTimestamp(state.now)}
          </span>

          <button
            onClick={() => state.setSoundEnabled(!state.soundEnabled)}
            style={{
              background: 'none',
              border: '1px solid #374151',
              borderRadius: '6px',
              padding: '6px 10px',
              color: state.soundEnabled ? '#10b981' : '#ef4444',
              cursor: 'pointer',
              fontSize: '1em',
            }}
            title={state.soundEnabled ? 'Ton aus' : 'Ton ein'}
          >
            {state.soundEnabled ? '\u{1F50A}' : '\u{1F507}'}
          </button>

          <nav style={{ display: 'flex', gap: '4px' }}>
            {([
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'timeline', label: 'Zeitleiste' },
              { key: 'config', label: 'Konfiguration' },
            ] as const).map(item => (
              <button
                key={item.key}
                onClick={() => state.setView(item.key)}
                style={{
                  background: state.view === item.key ? '#2563eb' : 'transparent',
                  color: state.view === item.key ? '#fff' : '#9ca3af',
                  border: state.view === item.key ? '1px solid #3b82f6' : '1px solid #374151',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontWeight: state.view === item.key ? 'bold' : 'normal',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        {state.view === 'dashboard' && (
          <Dashboard
            machineStatuses={state.machineStatuses}
            setupPlan={state.setupPlan}
            measurePlan={state.measurePlan}
            totalIdleSec={state.totalIdleSec}
            now={state.now}
            shiftStartMs={state.shiftStartMs}
            shiftEndMs={state.shiftEndMs}
            onResync={state.resyncMachine}
            onCompleteCycle={state.completeCycle}
            onTogglePause={state.togglePause}
            onAdjustOffset={state.adjustOffset}
            onResyncAll={state.resyncAll}
          />
        )}

        {state.view === 'timeline' && (
          <Timeline config={state.config} now={state.now} />
        )}

        {state.view === 'config' && (
          <ConfigPanel config={state.config} onSave={state.setConfig} />
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
