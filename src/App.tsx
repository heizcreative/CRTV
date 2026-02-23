import { useState, useEffect } from 'react';
import { JournalProvider, useJournal } from './store/JournalContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { AddTrade } from './pages/AddTrade';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import type { AppView, JournalState } from './types/trade';
import { loadSyncConfig, loadSyncMeta, pullFromCloud } from './utils/cloudSync';

/** Handles automatic cloud pull: once on mount, then whenever the window regains focus. */
function SyncEffect() {
  const { dispatch, suppressNextPush } = useJournal();

  useEffect(() => {
    async function tryPull() {
      const config = loadSyncConfig();
      if (!config?.rtdbUrl || !config?.syncKey) return;
      const meta = loadSyncMeta();
      try {
        const remote = await pullFromCloud(config);
        if (!remote) return;
        // Only replace local state when the cloud copy is strictly newer.
        if (remote.updatedAt > meta.lastPushedAt) {
          suppressNextPush();
          dispatch({ type: 'LOAD_STATE', state: remote.state as JournalState });
        }
      } catch {
        // Silently ignore network errors during background pull.
      }
    }

    tryPull();

    function onFocus() { tryPull(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dispatch, suppressNextPush]);

  return null;
}

function AppInner() {
  const { state } = useJournal();
  const [view, setView] = useState<AppView>('dashboard');
  const [editTradeId, setEditTradeId] = useState<string | undefined>();
  const [viewTradeId, setViewTradeId] = useState<string | undefined>();

  // Sync --glass-blur CSS variable with settings.blurIntensity
  useEffect(() => {
    document.documentElement.style.setProperty('--glass-blur', `${state.settings.blurIntensity}px`);
  }, [state.settings.blurIntensity]);

  function navigate(v: AppView, tradeId?: string) {
    if (v === 'add-trade' && tradeId) {
      setEditTradeId(tradeId);
    } else {
      setEditTradeId(undefined);
    }
    if (v === 'journal' && tradeId) {
      setViewTradeId(tradeId);
    } else {
      setViewTradeId(undefined);
    }
    setView(v);
  }

  function handleAddDone() {
    setEditTradeId(undefined);
    setView('journal');
  }

  function handleEditFromJournal(id: string) {
    setEditTradeId(id);
    setView('add-trade');
  }

  return (
    <div className="app-shell" data-theme={state.settings.theme}>
      <div className="app-bg">
        <div className="bg-bloom" />
        <div className="bg-grain" />
        <div className="bg-vignette" />
      </div>

      <SyncEffect />

      <main className="app-main">
        {view === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {view === 'journal' && <Journal onEdit={handleEditFromJournal} selectedId={viewTradeId} />}
        {view === 'add-trade' && <AddTrade editId={editTradeId} onDone={handleAddDone} />}
        {view === 'analytics' && <Analytics />}
        {view === 'settings' && <Settings />}
      </main>

      {view !== 'add-trade' && (
        <Navigation current={view} onChange={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <JournalProvider>
      <AppInner />
    </JournalProvider>
  );
}
