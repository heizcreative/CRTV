import { useRef, useState } from 'react';
import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import { GlassInput, GlassSelect } from '../components/GlassInput';
import type { AppSettings, JournalState } from '../types/trade';
import { clearAllImages } from '../utils/imageStore';
import { defaultSettings } from '../store/seed';
import {
  loadSyncConfig,
  saveSyncConfig,
  pushToCloud,
  pullFromCloud,
  generateSyncKey,
  isValidRtdbUrl,
  timeAgo,
  loadSyncMeta,
  type SyncConfig,
} from '../utils/cloudSync';

export function Settings() {
  const { state, dispatch, suppressNextPush } = useJournal();
  const { settings, trades } = state;

  // ── Appearance ──────────────────────────────────────────────────────────────
  function update(patch: Partial<AppSettings>) {
    dispatch({ type: 'UPDATE_SETTINGS', settings: patch });
  }

  // ── Data management ─────────────────────────────────────────────────────────
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

  const importFileRef = useRef<HTMLInputElement>(null);

  function importJSON() {
    importFileRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<JournalState>;
        if (!Array.isArray(parsed.trades)) throw new Error('missing trades array');
        const toLoad: JournalState = {
          trades: parsed.trades,
          settings: parsed.settings ?? defaultSettings,
        };
        if (!window.confirm(`Import ${toLoad.trades.length} trade(s)? This will replace your current data.`)) return;
        dispatch({ type: 'LOAD_STATE', state: toLoad });
      } catch {
        alert('Could not import: invalid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  async function resetJournal() {
    if (window.confirm('Reset all trades and settings? This cannot be undone.')) {
      await clearAllImages().catch(() => {});
      dispatch({ type: 'RESET_JOURNAL' });
    }
  }

  // ── Cloud Sync ───────────────────────────────────────────────────────────────
  const [syncCfg, setSyncCfg] = useState<SyncConfig>(() => loadSyncConfig() ?? { rtdbUrl: '', syncKey: '' });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pushing' | 'pulling' | 'ok' | 'error'>('idle');
  const [syncMsg, setSyncMsg] = useState('');
  const syncMeta = loadSyncMeta();

  function updateSyncCfg(patch: Partial<SyncConfig>) {
    const next = { ...syncCfg, ...patch };
    setSyncCfg(next);
    saveSyncConfig(next.rtdbUrl && next.syncKey ? next : null);
  }

  function handleGenKey() {
    updateSyncCfg({ syncKey: generateSyncKey() });
  }

  async function handlePush() {
    if (!syncCfg.rtdbUrl || !syncCfg.syncKey) return;
    setSyncStatus('pushing');
    setSyncMsg('');
    try {
      await pushToCloud(syncCfg, state);
      setSyncStatus('ok');
      setSyncMsg('Pushed successfully.');
    } catch (err) {
      setSyncStatus('error');
      setSyncMsg(String(err instanceof Error ? err.message : err));
    }
  }

  async function handlePull() {
    if (!syncCfg.rtdbUrl || !syncCfg.syncKey) return;
    setSyncStatus('pulling');
    setSyncMsg('');
    try {
      const remote = await pullFromCloud(syncCfg);
      if (!remote) {
        setSyncStatus('ok');
        setSyncMsg('No cloud data found for this sync key.');
        return;
      }
      if (!window.confirm('Replace your local data with the cloud copy?')) {
        setSyncStatus('idle');
        return;
      }
      suppressNextPush();
      dispatch({ type: 'LOAD_STATE', state: remote.state as JournalState });
      setSyncStatus('ok');
      setSyncMsg(`Pulled successfully (cloud snapshot from ${timeAgo(remote.updatedAt)}).`);
    } catch (err) {
      setSyncStatus('error');
      setSyncMsg(String(err instanceof Error ? err.message : err));
    }
  }

  const syncReady = syncCfg.rtdbUrl.trim() !== '' && syncCfg.syncKey.trim() !== '' && isValidRtdbUrl(syncCfg.rtdbUrl);
  const rtdbUrlError = syncCfg.rtdbUrl && !isValidRtdbUrl(syncCfg.rtdbUrl)
    ? 'Enter a valid Firebase RTDB URL, e.g. https://your-project-default-rtdb.firebaseio.com'
    : '';

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
          <button className="btn-secondary" onClick={importJSON}>Import JSON</button>
        </div>
        {/* Hidden file input for JSON import */}
        <input
          ref={importFileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
        <button className="btn-danger" onClick={resetJournal}>Reset Journal</button>
      </GlassCard>

      {/* Cloud Sync */}
      <GlassCard className="form-section">
        <div className="form-section-title">Cloud Sync</div>
        <p className="text-dim" style={{ lineHeight: 1.6 }}>
          Sync your journal across devices via{' '}
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noreferrer"
            className="sync-link"
          >
            Firebase Realtime Database
          </a>
          . Create a free project, enable the Realtime Database, then paste the
          database URL and a sync key below.
        </p>

        <GlassInput
          label="Firebase RTDB URL"
          placeholder="https://your-project-default-rtdb.firebaseio.com"
          value={syncCfg.rtdbUrl}
          onChange={e => updateSyncCfg({ rtdbUrl: e.target.value.trim() })}
        />
        {rtdbUrlError && <p className="glass-error">{rtdbUrlError}</p>}

        <div className="sync-key-row">
          <div style={{ flex: 1 }}>
            <GlassInput
              label="Sync Key  (shared secret — use the same key on every device)"
              placeholder="XXXX-XXXX-XXXX"
              value={syncCfg.syncKey}
              onChange={e => updateSyncCfg({ syncKey: e.target.value.trim() })}
            />
          </div>
          <button
            className="btn-secondary sync-gen-btn"
            onClick={handleGenKey}
            title="Generate a new random sync key"
          >
            Generate
          </button>
        </div>

        {syncMeta.lastPushedAt > 0 && (
          <div className="settings-info-row">
            <span className="settings-info-label">Last synced</span>
            <span className="settings-info-value">{timeAgo(syncMeta.lastPushedAt)}</span>
          </div>
        )}

        <div className="settings-actions">
          <button
            className="btn-secondary"
            onClick={handlePush}
            disabled={!syncReady || syncStatus === 'pushing'}
          >
            {syncStatus === 'pushing' ? 'Pushing…' : 'Push to Cloud'}
          </button>
          <button
            className="btn-secondary"
            onClick={handlePull}
            disabled={!syncReady || syncStatus === 'pulling'}
          >
            {syncStatus === 'pulling' ? 'Pulling…' : 'Pull from Cloud'}
          </button>
        </div>

        {syncStatus !== 'idle' && syncMsg && (
          <p className={`sync-status sync-status--${syncStatus === 'error' ? 'error' : 'ok'}`}>
            {syncMsg}
          </p>
        )}

        <p className="text-dim" style={{ marginTop: 4 }}>
          Changes auto-push within 2 s. The app auto-pulls when it regains focus
          and the cloud copy is newer than your local data.
        </p>
      </GlassCard>

      <div className="settings-footer">
        <p className="text-dim">CRTV Trading Journal</p>
      </div>
    </div>
  );
}
