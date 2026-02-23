import { useMemo } from 'react';
import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const CHART_COLORS = {
  win: 'rgba(110, 188, 140, 0.8)',
  loss: 'rgba(200, 100, 95, 0.8)',
  neutral: 'rgba(160, 160, 180, 0.7)',
  line: 'rgba(180, 190, 210, 0.9)',
};

interface TooltipPayload {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency?: string;
}

function CustomTooltip({ active, payload, label, currency = '$' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span>{p.name}</span>
          <span>{typeof p.value === 'number' && p.name?.includes('P/L') ? `${currency}${p.value.toFixed(2)}` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Analytics() {
  const { state } = useJournal();
  const { trades, settings } = state;
  const currency = settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency;

  const equityData = useMemo(() => {
    return [...trades].reverse().reduce<{ i: number; equity: number; label: string; running: number }[]>((acc, t, i) => {
      const prev = acc[i - 1];
      const running = (prev ? prev.running : 0) + t.pnl;
      acc.push({
        i: i + 1,
        equity: parseFloat(running.toFixed(2)),
        label: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        running,
      });
      return acc;
    }, []);
  }, [trades]);

  const sessionPerf = useMemo(() => {
    const sessions = ['London', 'New York', 'Asian', 'Other'];
    return sessions.map(s => {
      const st = trades.filter(t => t.session === s);
      const wins = st.filter(t => t.pnl > 0).length;
      const pnl = st.reduce((a, t) => a + t.pnl, 0);
      return { session: s, trades: st.length, wins, winRate: st.length ? (wins / st.length) * 100 : 0, pnl: parseFloat(pnl.toFixed(2)) };
    }).filter(s => s.trades > 0);
  }, [trades]);

  const setupPerf = useMemo(() => {
    const setupMap: Record<string, { total: number; wins: number; pnl: number }> = {};
    trades.forEach(t => {
      if (!setupMap[t.setup]) setupMap[t.setup] = { total: 0, wins: 0, pnl: 0 };
      setupMap[t.setup].total++;
      if (t.pnl > 0) setupMap[t.setup].wins++;
      setupMap[t.setup].pnl += t.pnl;
    });
    return Object.entries(setupMap).map(([setup, data]) => ({
      setup,
      ...data,
      pnl: parseFloat(data.pnl.toFixed(2)),
      winRate: (data.wins / data.total) * 100,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const dirComparison = useMemo(() => {
    const longs = trades.filter(t => t.direction === 'Long');
    const shorts = trades.filter(t => t.direction === 'Short');
    return [
      {
        label: 'Long',
        trades: longs.length,
        winRate: longs.length ? (longs.filter(t => t.pnl > 0).length / longs.length) * 100 : 0,
        pnl: longs.reduce((a, t) => a + t.pnl, 0),
      },
      {
        label: 'Short',
        trades: shorts.length,
        winRate: shorts.length ? (shorts.filter(t => t.pnl > 0).length / shorts.length) * 100 : 0,
        pnl: shorts.reduce((a, t) => a + t.pnl, 0),
      },
    ];
  }, [trades]);

  const profitFactor = useMemo(() => {
    const grossWin = trades.filter(t => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((a, t) => a + t.pnl, 0));
    return grossLoss > 0 ? parseFloat((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? Infinity : 0;
  }, [trades]);

  const winRate = trades.length ? (trades.filter(t => t.pnl > 0).length / trades.length * 100) : 0;
  const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
      </header>

      {/* Summary pills */}
      <div className="analytics-summary">
        <GlassCard padding="14px 18px" className="summary-pill">
          <div className="metric-label-sm">Win Rate</div>
          <div className="metric-value-md">{winRate.toFixed(1)}%</div>
        </GlassCard>
        <GlassCard padding="14px 18px" className="summary-pill">
          <div className="metric-label-sm">Profit Factor</div>
          <div className="metric-value-md">{profitFactor === Infinity ? '∞' : profitFactor}</div>
        </GlassCard>
        <GlassCard padding="14px 18px" className="summary-pill">
          <div className="metric-label-sm">Total P/L</div>
          <div className={`metric-value-md ${totalPnL >= 0 ? 'text-win' : 'text-loss'}`}>
            {totalPnL >= 0 ? '+' : ''}{currency}{Math.abs(totalPnL).toFixed(2)}
          </div>
        </GlassCard>
        <GlassCard padding="14px 18px" className="summary-pill">
          <div className="metric-label-sm">Total Trades</div>
          <div className="metric-value-md">{trades.length}</div>
        </GlassCard>
      </div>

      {trades.length === 0 && (
        <GlassCard padding="32px">
          <p className="text-muted text-center">No trades yet. Log trades to see analytics.</p>
        </GlassCard>
      )}

      {/* Equity Curve */}
      {equityData.length > 0 && (
        <GlassCard>
          <div className="chart-title">Equity Curve</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={equityData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.line} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.line} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: 'rgba(200,200,220,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'rgba(200,200,220,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${currency}${v}`} width={55} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
              <Area type="monotone" dataKey="equity" name="P/L" stroke={CHART_COLORS.line} strokeWidth={1.5} fill="url(#eqGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Session Performance */}
      {sessionPerf.length > 0 && (
        <GlassCard>
          <div className="chart-title">Performance by Session</div>
          <div className="perf-table">
            <div className="perf-header">
              <span>Session</span>
              <span>Trades</span>
              <span>Win %</span>
              <span>P/L</span>
            </div>
            {sessionPerf.map(s => (
              <div key={s.session} className="perf-row">
                <span className="perf-name">{s.session}</span>
                <span>{s.trades}</span>
                <span>{s.winRate.toFixed(0)}%</span>
                <span className={s.pnl >= 0 ? 'text-win' : 'text-loss'}>{s.pnl >= 0 ? '+' : ''}{currency}{Math.abs(s.pnl).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Setup Performance */}
      {setupPerf.length > 0 && (
        <GlassCard>
          <div className="chart-title">Performance by Setup</div>
          <div className="perf-table">
            <div className="perf-header">
              <span>Setup</span>
              <span>Trades</span>
              <span>Win %</span>
              <span>P/L</span>
            </div>
            {setupPerf.map(s => (
              <div key={s.setup} className="perf-row">
                <span className="perf-name">{s.setup}</span>
                <span>{s.total}</span>
                <span>{s.winRate.toFixed(0)}%</span>
                <span className={s.pnl >= 0 ? 'text-win' : 'text-loss'}>{s.pnl >= 0 ? '+' : ''}{currency}{Math.abs(s.pnl).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Long vs Short */}
      {trades.length > 0 && (
        <GlassCard>
          <div className="chart-title">Long vs Short</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dirComparison} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tick={{ fill: 'rgba(200,200,220,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(200,200,220,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${currency}${v}`} width={55} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Bar dataKey="pnl" name="P/L" radius={[4, 4, 0, 0]}>
                {dirComparison.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.pnl >= 0 ? CHART_COLORS.win : CHART_COLORS.loss}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="dir-comparison-stats">
            {dirComparison.map(d => (
              <div key={d.label} className="dir-stat">
                <div className="dir-stat-label">{d.label}</div>
                <div className="dir-stat-row"><span>Win Rate</span><strong>{d.winRate.toFixed(0)}%</strong></div>
                <div className="dir-stat-row"><span>Trades</span><strong>{d.trades}</strong></div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
