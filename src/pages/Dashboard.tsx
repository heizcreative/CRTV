import { useMemo } from 'react';
import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge, TagBadge } from '../components/StatusBadge';
import type { AppView, Trade } from '../types/trade';
import { TrendingUp, TrendingDown, Target, Clock } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: AppView, tradeId?: string) => void;
}

function formatCurrency(val: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;
  return `${val >= 0 ? '+' : ''}${symbol}${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { state } = useJournal();
  const { trades, settings } = state;

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const todayTrades = trades.filter(t => new Date(t.date).toDateString() === today);
    const weekTrades = trades.filter(t => new Date(t.date) >= weekAgo);
    const wins = trades.filter(t => t.pnl > 0);

    const todayPL = todayTrades.reduce((s, t) => s + t.pnl, 0);
    const weekPL = weekTrades.reduce((s, t) => s + t.pnl, 0);
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;

    return { todayPL, weekPL, winRate, todayTrades };
  }, [trades]);

  const recentTrades = trades.slice(0, 5);

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Good morning</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="header-date">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </header>

      {/* Primary metrics row */}
      <div className="metrics-grid">
        <GlassCard className="metric-primary" padding="20px">
          <div className="metric-icon-row">
            {stats.todayPL >= 0
              ? <TrendingUp size={16} className="icon-win" />
              : <TrendingDown size={16} className="icon-loss" />}
            <span className="metric-label">Today's P/L</span>
          </div>
          <div className={`metric-value-lg ${stats.todayPL >= 0 ? 'text-win' : 'text-loss'}`}>
            {formatCurrency(stats.todayPL, settings.currency)}
          </div>
          <div className="metric-sub">{stats.todayTrades.length} trade{stats.todayTrades.length !== 1 ? 's' : ''} today</div>
        </GlassCard>

        <GlassCard className="metric-primary" padding="20px">
          <div className="metric-icon-row">
            {stats.weekPL >= 0
              ? <TrendingUp size={16} className="icon-win" />
              : <TrendingDown size={16} className="icon-loss" />}
            <span className="metric-label">Weekly P/L</span>
          </div>
          <div className={`metric-value-lg ${stats.weekPL >= 0 ? 'text-win' : 'text-loss'}`}>
            {formatCurrency(stats.weekPL, settings.currency)}
          </div>
          <div className="metric-sub">Last 7 days</div>
        </GlassCard>
      </div>

      {/* Secondary metrics */}
      <div className="metrics-grid">
        <GlassCard padding="16px">
          <div className="metric-icon-row">
            <Target size={14} className="icon-muted" />
            <span className="metric-label-sm">Win Rate</span>
          </div>
          <div className="metric-value-md">{stats.winRate.toFixed(1)}%</div>
        </GlassCard>

        <GlassCard padding="16px">
          <div className="metric-icon-row">
            <Clock size={14} className="icon-muted" />
            <span className="metric-label-sm">Total Trades</span>
          </div>
          <div className="metric-value-md">{trades.length}</div>
        </GlassCard>
      </div>

      {/* Recent trades */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Recent Trades</h2>
          <button className="text-btn" onClick={() => onNavigate('journal')}>View all</button>
        </div>
        <div className="trade-list">
          {recentTrades.length === 0 && (
            <GlassCard padding="32px">
              <p className="text-muted text-center">No trades yet. Log your first trade.</p>
            </GlassCard>
          )}
          {recentTrades.map(trade => (
            <TradeRow key={trade.id} trade={trade} onClick={() => onNavigate('journal', trade.id)} currency={settings.currency} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TradeRow({ trade, onClick, currency }: { trade: Trade; onClick: () => void; currency: string }) {
  const cur = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;
  return (
    <GlassCard hover padding="14px 18px" onClick={onClick}>
      <div className="trade-row">
        <div className="trade-row-left">
          <div className="trade-symbol">{trade.symbol}</div>
          <div className="trade-meta-row">
            <StatusBadge direction={trade.direction} />
            <TagBadge label={trade.session} />
            <TagBadge label={trade.setup} />
          </div>
        </div>
        <div className="trade-row-right">
          <div className={`trade-pnl ${trade.pnl >= 0 ? 'text-win' : 'text-loss'}`}>
            {trade.pnl >= 0 ? '+' : ''}{cur}{Math.abs(trade.pnl).toFixed(2)}
          </div>
          <StatusBadge result={trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'BE'} size="sm" />
        </div>
      </div>
    </GlassCard>
  );
}
