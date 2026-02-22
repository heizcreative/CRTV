export type Direction = 'Long' | 'Short';
export type Session = 'London' | 'New York' | 'Asian' | 'Other';
export type TradeResult = 'Win' | 'Loss' | 'BE';

export interface Trade {
  id: string;
  symbol: string;
  direction: Direction;
  timeframe: string;
  entry: number;
  stop: number;
  takeProfit: number;
  exit: number;
  positionSize: number;
  riskAmount: number;
  leverage?: number;
  pnl: number;
  rMultiple: number;
  result: TradeResult;
  session: Session;
  setup: string;
  strategyType: string;
  emotionTag: string;
  followedPlan: boolean;
  emotionalState: string;
  mistakes: string[];
  whatWentWell: string;
  whatWentWrong: string;
  improvement: string;
  screenshot?: string;
  date: string;
}

export type AppView = 'dashboard' | 'journal' | 'add-trade' | 'analytics' | 'settings';

export interface AppSettings {
  defaultRisk: number;
  currency: string;
  blurIntensity: number;
  theme: 'default' | 'warm' | 'cool';
}

export interface JournalState {
  trades: Trade[];
  settings: AppSettings;
}
