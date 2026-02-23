import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { Trade, AppSettings, JournalState } from '../types/trade';
import { defaultSettings } from './seed';
import { loadSyncConfig, pushToCloud } from '../utils/cloudSync';

const STORAGE_KEY = 'crtv_journal';

type Action =
  | { type: 'ADD_TRADE'; trade: Trade }
  | { type: 'UPDATE_TRADE'; trade: Trade }
  | { type: 'DELETE_TRADE'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'RESET_JOURNAL' }
  | { type: 'LOAD_STATE'; state: JournalState };

function loadState(): JournalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as JournalState;
      // Migrate: always force theme back to 'default' on load
      if (parsed.settings && parsed.settings.theme !== 'default') {
        parsed.settings.theme = 'default';
      }
      return parsed;
    }
  } catch {
    // localStorage unavailable or invalid JSON — start fresh
  }
  return { trades: [], settings: defaultSettings };
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
    case 'RESET_JOURNAL': {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return { trades: [], settings: defaultSettings };
    }
    case 'LOAD_STATE':
      return action.state;
    default:
      return state;
  }
}

interface JournalContextValue {
  state: JournalState;
  dispatch: React.Dispatch<Action>;
  /** Call this before dispatching LOAD_STATE from a cloud pull to suppress the
   *  resulting auto-push (prevents echoing the pulled data straight back). */
  suppressNextPush: () => void;
}

const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persist to localStorage on every state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-push to cloud when state changes (debounced 2 s).
  // skipNextPush guards against pushing state that was just pulled from the cloud.
  const skipNextPush = useRef(false);
  const suppressNextPush = useCallback(() => { skipNextPush.current = true; }, []);

  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    const config = loadSyncConfig();
    if (!config?.supabaseUrl || !config?.anonKey || !config?.syncKey) return;
    const timer = setTimeout(() => {
      pushToCloud(config, state).catch(err => {
        console.warn('[CRTV] Auto-push failed:', err);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <JournalContext.Provider value={{ state, dispatch, suppressNextPush }}>
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
