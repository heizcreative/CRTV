import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import { GlassInput, GlassTextarea, GlassSelect } from '../components/GlassInput';
import type { Trade, Direction, Session, Setup } from '../types/trade';
import { ChevronDown, Upload, X } from 'lucide-react';
import { storeImage, loadImageUrl } from '../utils/imageStore';

interface AddTradeProps {
  editId?: string;
  onDone: () => void;
}

const SESSIONS: Session[] = ['London', 'New York', 'Asian', 'Other'];
const SETUPS: Setup[] = ['A++ Setup', 'A+ Setup', 'A Setup'];
const STRATEGIES = [
  'IFVG', 'FVG', 'Order Block', 'Breaker Block', 'Mitigation Block',
  'Liquidity Sweep', 'Turtle Soup', 'Judas Swing', 'Market Structure Shift (MSS)',
  'Displacement', 'OTE', 'Premium/Discount', 'Session High/Low Raid', 'Killzone Model',
];
const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'FOMO', 'Neutral', 'Focused'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'D', 'W'];

type FormErrors = Partial<Record<string, string>>;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function AddTrade({ editId, onDone }: AddTradeProps) {
  const { state, dispatch } = useJournal();
  const existing = editId ? state.trades.find(t => t.id === editId) : undefined;

  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [direction, setDirection] = useState<Direction>(existing?.direction ?? 'Long');
  const [timeframe, setTimeframe] = useState(existing?.timeframe ?? '15m');
  const [session, setSession] = useState<Session>(existing?.session ?? 'New York');
  const [setup, setSetup] = useState<Setup>(existing?.setup ?? SETUPS[0]);
  const [strategyType, setStrategyType] = useState(existing?.strategyType ?? STRATEGIES[0]);
  const [pnl, setPnl] = useState(existing?.pnl !== undefined ? String(existing.pnl) : '');
  const [emotion, setEmotion] = useState(existing?.emotion ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [tradeDate, setTradeDate] = useState(
    existing ? new Date(existing.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [errors, setErrors] = useState<FormErrors>({});

  // Image state: existing IDs + new pending files + their preview URLs
  const [existingImageIds, setExistingImageIds] = useState<string[]>(existing?.imageUrls ?? []);
  const [existingPreviews, setExistingPreviews] = useState<{ id: string; url: string }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const initialImageIds = useRef(existing?.imageUrls ?? []);

  // Load existing image previews from IndexedDB (runs once on mount)
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    const ids = initialImageIds.current;
    if (!ids.length) return;
    Promise.all(ids.map(id => loadImageUrl(id))).then(results => {
      if (cancelled) return;
      const previews = ids
        .map((id, i) => ({ id, url: results[i] ?? '' }))
        .filter(p => p.url);
      setExistingPreviews(previews);
      urls.push(...(results.filter(Boolean) as string[]));
    });
    return () => {
      cancelled = true;
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  // Revoke pending preview URLs on unmount
  useEffect(() => {
    return () => { pendingPreviews.forEach(u => URL.revokeObjectURL(u)); };
  }, [pendingPreviews]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPendingFiles(prev => [...prev, ...files]);
    setPendingPreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePending(index: number) {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function removeExisting(id: string) {
    setExistingImageIds(prev => prev.filter(x => x !== id));
    setExistingPreviews(prev => {
      const found = prev.find(p => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter(p => p.id !== id);
    });
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!symbol.trim()) e.symbol = 'Symbol is required';
    const pnlNum = parseFloat(pnl);
    if (!pnl || isNaN(pnlNum)) e.pnl = 'Valid P&L amount required (e.g. +120.50 or -45.00)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const newImageIds = await Promise.all(pendingFiles.map(f => storeImage(f)));
      const allImageUrls = [...existingImageIds, ...newImageIds];

      const trade: Trade = {
        id: existing?.id ?? generateId(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        symbol: symbol.toUpperCase().trim(),
        direction,
        timeframe,
        session,
        setup,
        strategyType,
        pnl: parseFloat(parseFloat(pnl).toFixed(2)),
        emotion: emotion || undefined,
        notes: notes || undefined,
        imageUrls: allImageUrls.length ? allImageUrls : undefined,
        date: new Date(tradeDate).toISOString(),
      };

      if (existing) {
        dispatch({ type: 'UPDATE_TRADE', trade });
      } else {
        dispatch({ type: 'ADD_TRADE', trade });
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <button className="back-btn" onClick={onDone}>
          <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
          <span>Cancel</span>
        </button>
        <h1 className="page-title-sm">{existing ? 'Edit Trade' : 'Log Trade'}</h1>
        <div style={{ width: 60 }} />
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {/* Trade Details */}
        <GlassCard className="form-section">
          <div className="form-section-title">Trade Details</div>
          <div className="form-grid-2">
            <GlassInput
              label="Symbol"
              placeholder="e.g. NQ, ES, AAPL"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              error={errors.symbol}
            />
            <div className="glass-field">
              <label className="glass-label">Direction</label>
              <div className="direction-toggle">
                <button
                  type="button"
                  className={`dir-btn${direction === 'Long' ? ' dir-btn--active dir-btn--long' : ''}`}
                  onClick={() => setDirection('Long')}
                >Long</button>
                <button
                  type="button"
                  className={`dir-btn${direction === 'Short' ? ' dir-btn--active dir-btn--short' : ''}`}
                  onClick={() => setDirection('Short')}
                >Short</button>
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <GlassSelect
              label="Timeframe"
              value={timeframe}
              onChange={setTimeframe}
              options={TIMEFRAMES.map(t => ({ value: t, label: t }))}
            />
            <GlassInput
              label="Date & Time"
              type="datetime-local"
              value={tradeDate}
              onChange={e => setTradeDate(e.target.value)}
            />
          </div>

          <GlassInput
            label="P&L (signed)"
            type="number"
            step="0.01"
            placeholder="e.g. +120.50 or -45.00"
            value={pnl}
            onChange={e => setPnl(e.target.value)}
            error={errors.pnl}
          />
        </GlassCard>

        {/* Tags & Context */}
        <GlassCard className="form-section">
          <div className="form-section-title">Tags & Context</div>
          <div className="form-grid-2">
            <GlassSelect
              label="Session"
              value={session}
              onChange={v => setSession(v as Session)}
              options={SESSIONS.map(s => ({ value: s, label: s }))}
            />
            <GlassSelect
              label="Setup"
              value={setup}
              onChange={v => setSetup(v as Setup)}
              options={SETUPS.map(s => ({ value: s, label: s }))}
            />
          </div>
          <div className="form-grid-2">
            <GlassSelect
              label="Strategy Type"
              value={strategyType}
              onChange={setStrategyType}
              options={STRATEGIES.map(s => ({ value: s, label: s }))}
            />
            <GlassSelect
              label="Emotion Tag"
              value={emotion}
              onChange={setEmotion}
              options={[{ value: '', label: 'None' }, ...EMOTIONS.map(s => ({ value: s, label: s }))]}
            />
          </div>
        </GlassCard>

        {/* Notes */}
        <GlassCard className="form-section">
          <div className="form-section-title">Notes</div>
          <GlassTextarea
            label="Trade notes"
            placeholder="Setup rationale, observations, lessons…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
        </GlassCard>

        {/* Screenshots */}
        <GlassCard className="form-section">
          <div className="form-section-title">Screenshots</div>

          {(existingPreviews.length > 0 || pendingPreviews.length > 0) && (
            <div className="screenshot-thumbs">
              {existingPreviews.map(p => (
                <div key={p.id} className="screenshot-thumb">
                  <img src={p.url} alt="screenshot" className="thumb-img" />
                  <button type="button" className="thumb-remove" onClick={() => removeExisting(p.id)}>
                    <X size={10} />
                  </button>
                </div>
              ))}
              {pendingPreviews.map((url, i) => (
                <div key={i} className="screenshot-thumb">
                  <img src={url} alt="screenshot" className="thumb-img" />
                  <button type="button" className="thumb-remove" onClick={() => removePending(i)}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="screenshot-zone-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} className="icon-muted" />
            <span className="screenshot-label">Add Screenshots</span>
            <span className="screenshot-sub">PNG, JPEG or WebP</span>
          </button>
        </GlassCard>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Log Trade'}
          </button>
          <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
