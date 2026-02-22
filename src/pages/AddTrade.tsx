import { useState, type FormEvent } from 'react';
import { useJournal } from '../store/JournalContext';
import { GlassCard } from '../components/GlassCard';
import { GlassInput, GlassTextarea, GlassSelect } from '../components/GlassInput';
import type { Trade, Direction, Session, TradeResult } from '../types/trade';
import { ChevronDown, Upload } from 'lucide-react';

interface AddTradeProps {
  editId?: string;
  onDone: () => void;
}

const SESSIONS: Session[] = ['London', 'New York', 'Asian', 'Other'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Range Break', 'Momentum', 'VWAP Reclaim', 'Order Block'];
const STRATEGIES = ['Trend Following', 'Mean Reversion', 'Scalping', 'Swing', 'Gap Fill'];
const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'FOMO', 'Neutral', 'Focused'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'D', 'W'];
const MISTAKES_OPTIONS = ['Oversized position', 'Early entry', 'Late exit', 'Chased entry', 'Ignored stop', 'Moved stop', 'Overtraded'];

type FormErrors = Partial<Record<string, string>>;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getResult(pnl: number, riskAmount: number): TradeResult {
  if (pnl > riskAmount * 0.1) return 'Win';
  if (pnl < -riskAmount * 0.1) return 'Loss';
  return 'BE';
}

export function AddTrade({ editId, onDone }: AddTradeProps) {
  const { state, dispatch } = useJournal();
  const existing = editId ? state.trades.find(t => t.id === editId) : undefined;

  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [direction, setDirection] = useState<Direction>(existing?.direction ?? 'Long');
  const [timeframe, setTimeframe] = useState(existing?.timeframe ?? '15m');
  const [entry, setEntry] = useState(String(existing?.entry ?? ''));
  const [stop, setStop] = useState(String(existing?.stop ?? ''));
  const [takeProfit, setTakeProfit] = useState(String(existing?.takeProfit ?? ''));
  const [exitPrice, setExitPrice] = useState(String(existing?.exit ?? ''));
  const [positionSize, setPositionSize] = useState(String(existing?.positionSize ?? ''));
  const [riskAmount, setRiskAmount] = useState(String(existing?.riskAmount ?? ''));
  const [leverage, setLeverage] = useState(String(existing?.leverage ?? ''));
  const [session, setSession] = useState<Session>(existing?.session ?? 'New York');
  const [setup, setSetup] = useState(existing?.setup ?? SETUPS[0]);
  const [strategyType, setStrategyType] = useState(existing?.strategyType ?? STRATEGIES[0]);
  const [emotionTag, setEmotionTag] = useState(existing?.emotionTag ?? EMOTIONS[0]);
  const [followedPlan, setFollowedPlan] = useState(existing?.followedPlan ?? true);
  const [emotionalState, setEmotionalState] = useState(existing?.emotionalState ?? EMOTIONS[0]);
  const [mistakes, setMistakes] = useState<string[]>(existing?.mistakes ?? []);
  const [whatWentWell, setWhatWentWell] = useState(existing?.whatWentWell ?? '');
  const [whatWentWrong, setWhatWentWrong] = useState(existing?.whatWentWrong ?? '');
  const [improvement, setImprovement] = useState(existing?.improvement ?? '');
  const [tradeDate, setTradeDate] = useState(existing ? new Date(existing.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const e: FormErrors = {};
    if (!symbol.trim()) e.symbol = 'Symbol is required';
    if (!entry || isNaN(Number(entry))) e.entry = 'Valid entry price required';
    if (!stop || isNaN(Number(stop))) e.stop = 'Valid stop required';
    if (!exitPrice || isNaN(Number(exitPrice))) e.exit = 'Valid exit price required';
    if (!positionSize || isNaN(Number(positionSize)) || Number(positionSize) <= 0) e.positionSize = 'Valid position size required';
    if (!riskAmount || isNaN(Number(riskAmount)) || Number(riskAmount) <= 0) e.riskAmount = 'Valid risk amount required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const entryNum = Number(entry);
    const exitNum = Number(exitPrice);
    const posSize = Number(positionSize);
    const riskAmt = Number(riskAmount);
    const pnl = direction === 'Long'
      ? parseFloat(((exitNum - entryNum) * posSize).toFixed(2))
      : parseFloat(((entryNum - exitNum) * posSize).toFixed(2));
    const rMultiple = parseFloat((pnl / riskAmt).toFixed(2));

    const trade: Trade = {
      id: existing?.id ?? generateId(),
      symbol: symbol.toUpperCase().trim(),
      direction,
      timeframe,
      entry: entryNum,
      stop: Number(stop),
      takeProfit: Number(takeProfit) || entryNum,
      exit: exitNum,
      positionSize: posSize,
      riskAmount: riskAmt,
      leverage: leverage ? Number(leverage) : undefined,
      pnl,
      rMultiple,
      result: getResult(pnl, riskAmt),
      session,
      setup,
      strategyType,
      emotionTag,
      followedPlan,
      emotionalState,
      mistakes,
      whatWentWell,
      whatWentWrong,
      improvement,
      date: new Date(tradeDate).toISOString(),
    };

    if (existing) {
      dispatch({ type: 'UPDATE_TRADE', trade });
    } else {
      dispatch({ type: 'ADD_TRADE', trade });
    }
    onDone();
  }

  function toggleMistake(m: string) {
    setMistakes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <button className="back-btn" onClick={onDone}>
          <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
          <span>{existing ? 'Cancel' : 'Cancel'}</span>
        </button>
        <h1 className="page-title-sm">{existing ? 'Edit Trade' : 'Log Trade'}</h1>
        <div style={{ width: 60 }} />
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {/* Trade Details */}
        <GlassCard className="form-section">
          <div className="form-section-title">Trade Details</div>
          <div className="form-grid-2">
            <GlassInput label="Symbol" placeholder="e.g. AAPL" value={symbol} onChange={e => setSymbol(e.target.value)} error={errors.symbol} />
            <div className="glass-field">
              <label className="glass-label">Direction</label>
              <div className="direction-toggle">
                <button type="button" className={`dir-btn${direction === 'Long' ? ' dir-btn--active dir-btn--long' : ''}`} onClick={() => setDirection('Long')}>Long</button>
                <button type="button" className={`dir-btn${direction === 'Short' ? ' dir-btn--active dir-btn--short' : ''}`} onClick={() => setDirection('Short')}>Short</button>
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <GlassSelect label="Timeframe" value={timeframe} onChange={setTimeframe} options={TIMEFRAMES.map(t => ({ value: t, label: t }))} />
            <GlassInput label="Date & Time" type="datetime-local" value={tradeDate} onChange={e => setTradeDate(e.target.value)} />
          </div>

          <div className="form-grid-2">
            <GlassInput label="Entry Price" type="number" step="0.01" placeholder="0.00" value={entry} onChange={e => setEntry(e.target.value)} error={errors.entry} />
            <GlassInput label="Stop Loss" type="number" step="0.01" placeholder="0.00" value={stop} onChange={e => setStop(e.target.value)} error={errors.stop} />
          </div>

          <div className="form-grid-2">
            <GlassInput label="Take Profit" type="number" step="0.01" placeholder="0.00" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} />
            <GlassInput label="Exit Price" type="number" step="0.01" placeholder="0.00" value={exitPrice} onChange={e => setExitPrice(e.target.value)} error={errors.exit} />
          </div>

          <div className="form-grid-3">
            <GlassInput label="Position Size" type="number" placeholder="100" value={positionSize} onChange={e => setPositionSize(e.target.value)} error={errors.positionSize} />
            <GlassInput label="Risk Amount" type="number" step="0.01" placeholder="50.00" value={riskAmount} onChange={e => setRiskAmount(e.target.value)} error={errors.riskAmount} />
            <GlassInput label="Leverage (opt.)" type="number" placeholder="1" value={leverage} onChange={e => setLeverage(e.target.value)} />
          </div>
        </GlassCard>

        {/* Tags */}
        <GlassCard className="form-section">
          <div className="form-section-title">Tags & Context</div>
          <div className="form-grid-2">
            <GlassSelect label="Session" value={session} onChange={v => setSession(v as Session)} options={SESSIONS.map(s => ({ value: s, label: s }))} />
            <GlassSelect label="Setup" value={setup} onChange={setSetup} options={SETUPS.map(s => ({ value: s, label: s }))} />
          </div>
          <div className="form-grid-2">
            <GlassSelect label="Strategy Type" value={strategyType} onChange={setStrategyType} options={STRATEGIES.map(s => ({ value: s, label: s }))} />
            <GlassSelect label="Emotion Tag" value={emotionTag} onChange={setEmotionTag} options={EMOTIONS.map(s => ({ value: s, label: s }))} />
          </div>
        </GlassCard>

        {/* Psychology */}
        <GlassCard className="form-section">
          <div className="form-section-title">Psychology</div>

          <div className="glass-field">
            <label className="glass-label">Followed Plan?</label>
            <div className="direction-toggle">
              <button type="button" className={`dir-btn${followedPlan ? ' dir-btn--active dir-btn--long' : ''}`} onClick={() => setFollowedPlan(true)}>Yes</button>
              <button type="button" className={`dir-btn${!followedPlan ? ' dir-btn--active dir-btn--short' : ''}`} onClick={() => setFollowedPlan(false)}>No</button>
            </div>
          </div>

          <GlassSelect label="Emotional State" value={emotionalState} onChange={setEmotionalState} options={EMOTIONS.map(s => ({ value: s, label: s }))} />

          <div className="glass-field">
            <label className="glass-label">Mistakes</label>
            <div className="mistake-chips">
              {MISTAKES_OPTIONS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`mistake-chip${mistakes.includes(m) ? ' mistake-chip--active' : ''}`}
                  onClick={() => toggleMistake(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Reflection */}
        <GlassCard className="form-section">
          <div className="form-section-title">Reflection</div>
          <GlassTextarea label="What went well?" placeholder="Identify positive execution…" value={whatWentWell} onChange={e => setWhatWentWell(e.target.value)} rows={3} />
          <GlassTextarea label="What went wrong?" placeholder="Be honest about mistakes…" value={whatWentWrong} onChange={e => setWhatWentWrong(e.target.value)} rows={3} />
          <GlassTextarea label="Improvement for next trade" placeholder="One clear takeaway…" value={improvement} onChange={e => setImprovement(e.target.value)} rows={3} />
        </GlassCard>

        {/* Screenshot */}
        <GlassCard className="form-section screenshot-zone" padding="24px">
          <div className="screenshot-inner">
            <Upload size={20} className="icon-muted" />
            <span className="screenshot-label">Chart Screenshot</span>
            <span className="screenshot-sub">Tap to upload PNG or JPEG</span>
          </div>
        </GlassCard>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {existing ? 'Save Changes' : 'Log Trade'}
          </button>
          <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
