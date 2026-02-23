import { useState, useMemo, useEffect } from 'react';
import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge, TagBadge } from '../components/StatusBadge';
import type { Trade, Session } from '../types/trade';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { loadImageUrl } from '../utils/imageStore';

interface JournalProps {
  onEdit: (id: string) => void;
  selectedId?: string;
}

type SortKey = 'date' | 'pnl';
type ResultFilter = 'Win' | 'Loss' | 'BE' | '';

export function Journal({ onEdit, selectedId }: JournalProps) {
  const { state } = useJournal();
  const { trades, settings } = state;

  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState<ResultFilter>('');
  const [filterSession, setFilterSession] = useState<Session | ''>('');
  const [filterSetup, setFilterSetup] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(selectedId ?? null);

  const setupOptions = useMemo(() => [...new Set(trades.map(t => t.setup))], [trades]);

  const filtered = useMemo(() => {
    return trades
      .filter(t => {
        if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterResult === 'Win' && t.pnl <= 0) return false;
        if (filterResult === 'Loss' && t.pnl >= 0) return false;
        if (filterResult === 'BE' && t.pnl !== 0) return false;
        if (filterSession && t.session !== filterSession) return false;
        if (filterSetup && t.setup !== filterSetup) return false;
        return true;
      })
      .sort((a, b) => {
        let v = 0;
        if (sortBy === 'date') v = new Date(a.date).getTime() - new Date(b.date).getTime();
        else v = a.pnl - b.pnl;
        return sortDir === 'desc' ? -v : v;
      });
  }, [trades, search, filterResult, filterSession, filterSetup, sortBy, sortDir]);

  const detailTrade = detailId ? trades.find(t => t.id === detailId) : null;
  const currency = settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency;

  if (detailTrade) {
    return <TradeDetail trade={detailTrade} onBack={() => setDetailId(null)} onEdit={onEdit} currency={currency} />;
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">Journal</h1>
        <span className="header-count">{filtered.length} trades</span>
      </header>

      {/* Search & Filter Bar */}
      <div className="search-row">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search symbol…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}><X size={12} /></button>
          )}
        </div>
        <button className={`filter-btn${showFilters ? ' active' : ''}`} onClick={() => setShowFilters(v => !v)}>
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {showFilters && (
        <GlassCard padding="16px" className="filter-panel">
          <div className="filter-grid">
            <select className="glass-input glass-select" value={filterResult} onChange={e => setFilterResult(e.target.value as ResultFilter)}>
              <option value="">All Results</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="BE">Break Even</option>
            </select>
            <select className="glass-input glass-select" value={filterSession} onChange={e => setFilterSession(e.target.value as Session | '')}>
              <option value="">All Sessions</option>
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Asian">Asian</option>
              <option value="Other">Other</option>
            </select>
            <select className="glass-input glass-select" value={filterSetup} onChange={e => setFilterSetup(e.target.value)}>
              <option value="">All Setups</option>
              {setupOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="glass-input glass-select" value={`${sortBy}-${sortDir}`} onChange={e => {
              const [key, dir] = e.target.value.split('-');
              setSortBy(key as SortKey);
              setSortDir(dir as 'asc' | 'desc');
            }}>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="pnl-desc">Best P/L</option>
              <option value="pnl-asc">Worst P/L</option>
            </select>
          </div>
        </GlassCard>
      )}

      <div className="trade-list">
        {filtered.length === 0 && (
          <GlassCard padding="32px">
            <p className="text-muted text-center">
              {trades.length === 0 ? 'No trades yet. Log your first trade.' : 'No trades match your filters.'}
            </p>
          </GlassCard>
        )}
        {filtered.map(trade => (
          <JournalCard
            key={trade.id}
            trade={trade}
            currency={currency}
            onClick={() => setDetailId(trade.id)}
          />
        ))}
      </div>
    </div>
  );
}

function JournalCard({ trade, currency, onClick }: { trade: Trade; currency: string; onClick: () => void }) {
  return (
    <GlassCard hover padding="16px 18px" onClick={onClick}>
      <div className="journal-card-top">
        <div className="journal-card-left">
          <div className="trade-symbol">{trade.symbol}</div>
          <div className="trade-date">{new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="journal-card-right">
          <div className={`trade-pnl ${trade.pnl >= 0 ? 'text-win' : 'text-loss'}`}>
            {trade.pnl >= 0 ? '+' : ''}{currency}{Math.abs(trade.pnl).toFixed(2)}
          </div>
          <StatusBadge result={trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'BE'} size="sm" />
        </div>
      </div>
      <div className="journal-card-bottom">
        <StatusBadge direction={trade.direction} />
        <TagBadge label={trade.session} />
        <TagBadge label={trade.setup} />
        <span className="trade-tf">{trade.timeframe}</span>
      </div>
    </GlassCard>
  );
}

function TradeDetail({ trade, onBack, onEdit, currency }: { trade: Trade; onBack: () => void; onEdit: (id: string) => void; currency: string }) {
  return (
    <div className="page-content">
      <header className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
          <span>Back</span>
        </button>
        <button className="text-btn" onClick={() => onEdit(trade.id)}>Edit</button>
      </header>

      <div className="detail-hero">
        <div className="detail-symbol">{trade.symbol}</div>
        <div className={`detail-pnl ${trade.pnl >= 0 ? 'text-win' : 'text-loss'}`}>
          {trade.pnl >= 0 ? '+' : ''}{currency}{Math.abs(trade.pnl).toFixed(2)}
        </div>
        <div className="detail-badges">
          <StatusBadge direction={trade.direction} size="md" />
          <StatusBadge result={trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'BE'} size="md" />
          <TagBadge label={trade.session} />
          <TagBadge label={trade.timeframe} />
        </div>
        <div className="detail-date">{new Date(trade.date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
      </div>

      <GlassCard>
        <div className="detail-section-title">Trade Details</div>
        <div className="detail-grid">
          <DetailRow label="Setup" value={trade.setup} />
          <DetailRow label="Strategy" value={trade.strategyType} />
          <DetailRow label="Timeframe" value={trade.timeframe} />
          <DetailRow label="Session" value={trade.session} />
          {trade.emotion && <DetailRow label="Emotion" value={trade.emotion} />}
        </div>
      </GlassCard>

      {trade.notes && (
        <GlassCard>
          <div className="detail-section-title">Notes</div>
          <div className="reflection-text">{trade.notes}</div>
        </GlassCard>
      )}

      {trade.imageUrls && trade.imageUrls.length > 0 && (
        <GlassCard>
          <div className="detail-section-title">Screenshots</div>
          <ImageGallery imageUrls={trade.imageUrls} />
        </GlassCard>
      )}
    </div>
  );
}

function ImageGallery({ imageUrls }: { imageUrls: string[] }) {
  return (
    <div className="screenshot-thumbs">
      {imageUrls.map((url, i) => (
        <AsyncImage key={i} idbKey={url} />
      ))}
    </div>
  );
}

function AsyncImage({ idbKey }: { idbKey: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    loadImageUrl(idbKey).then(url => {
      if (cancelled) {
        // Component unmounted before promise resolved — revoke immediately
        if (url && url !== idbKey) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl && objectUrl !== idbKey) URL.revokeObjectURL(objectUrl);
    };
  }, [idbKey]);

  if (!src) return <div className="screenshot-thumb screenshot-thumb--loading" />;
  return (
    <div className="screenshot-thumb screenshot-thumb--full">
      <img src={src} alt="Trade screenshot" className="thumb-img" />
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: 'win' | 'loss' }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className={`detail-row-value ${highlight === 'win' ? 'text-win' : highlight === 'loss' ? 'text-loss' : ''}`}>{value}</span>
    </div>
  );
}
