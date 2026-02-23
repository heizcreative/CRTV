import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import { GlassInput, GlassSelect } from '../components/GlassInput';
import type { AppSettings } from '../types/trade';
import { clearAllImages } from '../utils/imageStore';

export function Settings() {
  const { state, dispatch } = useJournal();
  const { settings, trades } = state;

  function update(patch: Partial<AppSettings>) {
    dispatch({ type: 'UPDATE_SETTINGS', settings: patch });
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ trades, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crtv-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const headers = ['id', 'date', 'symbol', 'direction', 'timeframe', 'session', 'setup', 'strategyType', 'pnl', 'emotion', 'notes'];
    const rows = trades.map(t => headers.map(h => (t as unknown as Record<string, unknown>)[h] ?? '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crtv-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function resetJournal() {
    if (window.confirm('Reset all trades and settings? This cannot be undone.')) {
      await clearAllImages().catch(() => {});
      dispatch({ type: 'RESET_JOURNAL' });
    }
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      {/* Appearance */}
      <GlassCard className="form-section">
        <div className="form-section-title">Appearance</div>
        <GlassSelect
          label="Currency"
          value={settings.currency}
          onChange={v => update({ currency: v })}
          options={[
            { value: 'USD', label: 'USD — US Dollar' },
            { value: 'EUR', label: 'EUR — Euro' },
            { value: 'GBP', label: 'GBP — British Pound' },
            { value: 'JPY', label: 'JPY — Japanese Yen' },
          ]}
        />
        <GlassInput
          label={`Glass Blur Intensity — ${settings.blurIntensity}px`}
          type="range"
          min="8"
          max="40"
          step="1"
          value={String(settings.blurIntensity)}
          onChange={e => update({ blurIntensity: parseInt(e.target.value) })}
          className="glass-slider"
        />
        <div className="glass-field">
          <label className="glass-label">Theme Variant</label>
          <div className="theme-row">
            {(['default', 'warm', 'cool'] as const).map(t => (
              <button
                key={t}
                className={`theme-btn${settings.theme === t ? ' theme-btn--active' : ''}`}
                onClick={() => update({ theme: t })}
              >
                <div className={`theme-swatch theme-swatch--${t}`} />
                <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Data */}
      <GlassCard className="form-section">
        <div className="form-section-title">Data Management</div>
        <div className="settings-info-row">
          <span className="settings-info-label">Trades logged</span>
          <span className="settings-info-value">{trades.length}</span>
        </div>
        <div className="settings-actions">
          <button className="btn-secondary" onClick={exportJSON}>Export JSON</button>
          <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
        </div>
        <button className="btn-danger" onClick={resetJournal}>Reset Journal</button>
      </GlassCard>

      <div className="settings-footer">
        <p className="text-dim">CRTV Trading Journal</p>
        <p className="text-dim">All data stored locally on your device.</p>
      </div>
    </div>
  );
}
