import { useState } from 'react';
import { JournalProvider, useJournal } from './store/JournalContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { AddTrade } from './pages/AddTrade';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import type { AppView } from './types/trade';

function AppInner() {
  const { state } = useJournal();
  const [view, setView] = useState<AppView>('dashboard');
  const [editTradeId, setEditTradeId] = useState<string | undefined>();
  const [viewTradeId, setViewTradeId] = useState<string | undefined>();

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
