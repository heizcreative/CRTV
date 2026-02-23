/**
 * Cloud Sync via Firebase Realtime Database REST API.
 * No SDK dependency — uses plain fetch() calls against the RTDB REST endpoint.
 *
 * Setup instructions:
 *  1. Go to https://console.firebase.google.com and create a project.
 *  2. Enable Realtime Database (start in test mode or set rules as shown below).
 *  3. Copy the database URL (e.g. https://my-project-default-rtdb.firebaseio.com).
 *  4. Paste the URL and a sync key into Settings → Cloud Sync.
 *
 * Recommended Firebase security rules:
 *  {
 *    "rules": {
 *      "crtv_journals": {
 *        "$syncKey": { ".read": true, ".write": true }
 *      }
 *    }
 *  }
 */

export interface SyncConfig {
  /** Firebase Realtime Database URL, e.g. https://my-project-default-rtdb.firebaseio.com */
  rtdbUrl: string;
  /** Shared secret used as the document key — treat like a password */
  syncKey: string;
}

/** Keys for localStorage */
const SYNC_CONFIG_KEY = 'crtv_sync_config';
const SYNC_META_KEY = 'crtv_sync_meta';

interface SyncMeta {
  /** Unix ms — when we last successfully pushed to the cloud */
  lastPushedAt: number;
}

// ─── Config helpers ──────────────────────────────────────────────────────────

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) return JSON.parse(raw) as SyncConfig;
  } catch { /* ignore */ }
  return null;
}

export function saveSyncConfig(config: SyncConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(SYNC_CONFIG_KEY);
    }
  } catch { /* ignore */ }
}

export function loadSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (raw) return JSON.parse(raw) as SyncMeta;
  } catch { /* ignore */ }
  return { lastPushedAt: 0 };
}

export function saveSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

// ─── URL builder ─────────────────────────────────────────────────────────────

function buildUrl(config: SyncConfig): string {
  const base = config.rtdbUrl.replace(/\/$/, '');
  // Firebase node names cannot contain . # $ [ ] — encode the key
  const safeKey = encodeURIComponent(config.syncKey);
  return `${base}/crtv_journals/${safeKey}.json`;
}

// ─── REST helpers ─────────────────────────────────────────────────────────────

interface CloudDocument {
  /** JSON-serialised JournalState */
  payload: string;
  /** Unix ms timestamp of last write */
  updatedAt: number;
}

/** Push local state to the cloud (PUT — full overwrite). */
export async function pushToCloud(config: SyncConfig, state: unknown): Promise<void> {
  if (!isValidRtdbUrl(config.rtdbUrl)) throw new Error('Invalid Firebase RTDB URL');
  const doc: CloudDocument = {
    payload: JSON.stringify(state),
    updatedAt: Date.now(),
  };
  const res = await fetch(buildUrl(config), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(text);
  }
  saveSyncMeta({ lastPushedAt: doc.updatedAt });
}

/** Pull state from the cloud. Returns null if no cloud data exists yet. */
export async function pullFromCloud(config: SyncConfig): Promise<{ state: unknown; updatedAt: number } | null> {
  if (!isValidRtdbUrl(config.rtdbUrl)) throw new Error('Invalid Firebase RTDB URL');
  const res = await fetch(buildUrl(config));
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(text);
  }
  const doc = (await res.json()) as CloudDocument | null;
  if (!doc) return null;
  try {
    return { state: JSON.parse(doc.payload), updatedAt: doc.updatedAt };
  } catch {
    throw new Error('Invalid cloud data format');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Returns true if the URL looks like a valid Firebase RTDB endpoint. */
export function isValidRtdbUrl(url: string): boolean {
  return /^https:\/\/[a-zA-Z0-9-]+(-default-rtdb)?\.firebaseio\.com\/?$/.test(url) ||
         /^https:\/\/[a-zA-Z0-9-]+(-default-rtdb)?\.firebasedatabase\.app\/?$/.test(url);
}

/** Generates a readable random sync key like "ABCD-EFGH-IJKL".
 *  Uses crypto.getRandomValues for a cryptographically secure key. */
export function generateSyncKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit confusable chars
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const group = (offset: number) =>
    Array.from({ length: 4 }, (_, i) => chars[bytes[offset + i] % chars.length]).join('');
  return `${group(0)}-${group(4)}-${group(8)}`;
}

/** Human-readable "X ago" helper. */
export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1_000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}
