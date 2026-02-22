import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Trade, AppSettings, JournalState } from '../types/trade';
import { generateSeedTrades, defaultSettings } from './seed';

const STORAGE_KEY = 'crtv_journal';

type Action =
  | { type: 'ADD_TRADE'; trade: Trade }
  | { type: 'UPDATE_TRADE'; trade: Trade }
  | { type: 'DELETE_TRADE'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'RESET_JOURNAL' };

function loadState(): JournalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as JournalState;
  } catch {
    // localStorage unavailable or invalid JSON — fall through to seed data
  }
  return { trades: generateSeedTrades(), settings: defaultSettings };
}

function saveState(state: JournalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — ignore
  }
}

function reducer(state: JournalState, action: Action): JournalState {
  switch (action.type) {
    case 'ADD_TRADE':
      return { ...state, trades: [action.trade, ...state.trades] };
    case 'UPDATE_TRADE':
      return {
        ...state,
        trades: state.trades.map(t => t.id === action.trade.id ? action.trade : t),
      };
    case 'DELETE_TRADE':
      return { ...state, trades: state.trades.filter(t => t.id !== action.id) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'RESET_JOURNAL':
      return { trades: generateSeedTrades(), settings: defaultSettings };
    default:
      return state;
  }
}

interface JournalContextValue {
  state: JournalState;
  dispatch: React.Dispatch<Action>;
}

const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <JournalContext.Provider value={{ state, dispatch }}>
      {children}
    </JournalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
