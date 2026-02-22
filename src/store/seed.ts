import type { Trade, AppSettings, TradeResult } from '../types/trade';

const SYMBOLS = ['AAPL', 'TSLA', 'SPY', 'QQQ', 'NVDA', 'MSFT', 'AMZN', 'META', 'NQ', 'ES', 'GC', 'CL'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Range Break', 'Momentum', 'VWAP Reclaim', 'Order Block'];
const SESSIONS: Array<'London' | 'New York' | 'Asian' | 'Other'> = ['London', 'New York', 'Asian', 'Other'];
const STRATEGIES = ['Trend Following', 'Mean Reversion', 'Scalping', 'Swing', 'Gap Fill'];
const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'FOMO', 'Neutral', 'Focused'];
const MISTAKES = ['Oversized position', 'Early entry', 'Late exit', 'Chased entry', 'Ignored stop', 'Moved stop'];

function randomBetween(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getResult(pnl: number, riskAmount: number): TradeResult {
  if (pnl > riskAmount * 0.1) return 'Win';
  if (pnl < -riskAmount * 0.1) return 'Loss';
  return 'BE';
}

export function generateSeedTrades(): Trade[] {
  const trades: Trade[] = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const dayCount = Math.floor(Math.random() * 2) + 1;
    for (let j = 0; j < dayCount; j++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(9 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60));

      const entry = randomBetween(100, 500, 2);
      const direction = Math.random() > 0.5 ? 'Long' : 'Short';
      const stop = direction === 'Long'
        ? parseFloat((entry - randomBetween(0.5, 3, 2)).toFixed(2))
        : parseFloat((entry + randomBetween(0.5, 3, 2)).toFixed(2));
      const takeProfit = direction === 'Long'
        ? parseFloat((entry + randomBetween(1, 8, 2)).toFixed(2))
        : parseFloat((entry - randomBetween(1, 8, 2)).toFixed(2));

      const riskPerShare = Math.abs(entry - stop);
      const positionSize = Math.floor(randomBetween(10, 200, 0));
      const riskAmount = parseFloat((riskPerShare * positionSize).toFixed(2));

      const exitBias = Math.random();
      let exit: number;
      if (exitBias > 0.55) {
        exit = direction === 'Long'
          ? parseFloat((entry + randomBetween(riskPerShare, riskPerShare * 3, 2)).toFixed(2))
          : parseFloat((entry - randomBetween(riskPerShare, riskPerShare * 3, 2)).toFixed(2));
      } else if (exitBias > 0.1) {
        exit = direction === 'Long'
          ? parseFloat((entry - randomBetween(0.1, riskPerShare, 2)).toFixed(2))
          : parseFloat((entry + randomBetween(0.1, riskPerShare, 2)).toFixed(2));
      } else {
        exit = parseFloat((entry + randomBetween(-0.2, 0.2, 2)).toFixed(2));
      }

      const pnl = direction === 'Long'
        ? parseFloat(((exit - entry) * positionSize).toFixed(2))
        : parseFloat(((entry - exit) * positionSize).toFixed(2));

      const rMultiple = parseFloat((pnl / riskAmount).toFixed(2));
      const result = getResult(pnl, riskAmount);
      const followedPlan = Math.random() > 0.3;
      const hasMistake = !followedPlan || Math.random() > 0.6;

      trades.push({
        id: generateId(),
        symbol: pick(SYMBOLS),
        direction,
        timeframe: pick(['1m', '5m', '15m', '1H', '4H', 'D']),
        entry,
        stop,
        takeProfit,
        exit,
        positionSize,
        riskAmount,
        leverage: Math.random() > 0.6 ? Math.floor(randomBetween(2, 10, 0)) : undefined,
        pnl,
        rMultiple,
        result,
        session: pick(SESSIONS),
        setup: pick(SETUPS),
        strategyType: pick(STRATEGIES),
        emotionTag: pick(EMOTIONS),
        followedPlan,
        emotionalState: pick(EMOTIONS),
        mistakes: hasMistake ? [pick(MISTAKES)] : [],
        whatWentWell: result === 'Win' ? 'Followed the plan and waited for confirmation.' : 'Risk management was solid.',
        whatWentWrong: result === 'Loss' ? 'Entered too early before confirmation.' : '',
        improvement: 'Wait for the second candle to confirm before entering.',
        date: date.toISOString(),
      });
    }
  }

  return trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const defaultSettings: AppSettings = {
  defaultRisk: 1,
  currency: 'USD',
  blurIntensity: 24,
  theme: 'default',
};
