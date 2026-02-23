export type Direction = 'Long' | 'Short';
export type Session = 'London' | 'New York' | 'Asian' | 'Other';
export type Setup = 'A++ Setup' | 'A+ Setup' | 'A Setup';

// UI-only helper (computed from pnl, not stored on Trade)
export type TradeResult = 'Win' | 'Loss' | 'BE';

export interface Trade {
  id: string;
  createdAt: string;
  symbol: string;
  direction: Direction;
  timeframe: string;
  session: Session;
  setup: Setup;
  strategyType: string;
  pnl: number;
  emotion?: string;
  notes?: string;
  imageUrls?: string[];
  date: string;
}

export type AppView = 'dashboard' | 'journal' | 'add-trade' | 'analytics' | 'settings';

export interface AppSettings {
  currency: string;
  blurIntensity: number;
  theme: 'default' | 'warm' | 'cool';
}

export interface JournalState {
  trades: Trade[];
  settings: AppSettings;
}
