/**
 * Cloud Sync via Supabase REST API (PostgREST).
 * No SDK dependency — uses plain fetch() calls against the Supabase REST endpoint.
 *
 * Setup instructions:
 *  1. Go to https://supabase.com and create a free project.
 *  2. In the SQL Editor, run the following to create the journals table:
 *       create table journals (
 *         sync_key   text   primary key,
 *         payload    text   not null,
 *         updated_at bigint not null
 *       );
 *       alter table journals enable row level security;
 *       -- Anon access is gated by the sync_key column (shared secret). The
 *       -- generated key has ~60 bits of entropy, making brute-force infeasible.
 *       create policy "Public access" on journals
 *         for all using (true) with check (true);
 *  3. Go to Project Settings → API and copy the Project URL and the anon public key.
 *  4. Paste them and a sync key into Settings → Cloud Sync.
 */

export interface SyncConfig {
  /** Supabase project URL, e.g. https://xyzcompany.supabase.co */
  supabaseUrl: string;
  /** Supabase anon (public) API key */
  anonKey: string;
  /** Shared secret used as the row key — treat like a password */
  syncKey: string;
}

/** Keys for localStorage */
const SYNC_CONFIG_KEY = 'crtv_sync_config';
const SYNC_META_KEY = 'crtv_sync_meta';

/** Built-in credentials — pre-configured for personal use.
 *  These are used the first time the app loads (before any user input)
 *  and are automatically persisted to localStorage so sync works immediately. */
const DEFAULT_SYNC_CONFIG: SyncConfig = {
  supabaseUrl: 'https://snolxaadnbqgqhycgbeg.supabase.co',
  anonKey: 'sb_publishable_l8as_h0nObdKx5FLXydPig_XkvqMhMt',
  syncKey: 'CRTV-MY-JOURNAL',
};

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
  // No saved config found — seed localStorage with built-in credentials so the
  // user never has to re-enter them.
  saveSyncConfig(DEFAULT_SYNC_CONFIG);
  return DEFAULT_SYNC_CONFIG;
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

// ─── Supabase REST helpers ────────────────────────────────────────────────────

function buildHeaders(anonKey: string): Record<string, string> {
  return {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };
}

function buildTableUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/journals`;
}

/** Push local state to the cloud (upsert). */
export async function pushToCloud(config: SyncConfig, state: unknown): Promise<void> {
  if (!isValidSupabaseUrl(config.supabaseUrl)) throw new Error('Invalid Supabase URL');
  const updatedAt = Date.now();
  const body = JSON.stringify({
    sync_key: config.syncKey,
    payload: JSON.stringify(state),
    updated_at: updatedAt,
  });
  const res = await fetch(`${buildTableUrl(config.supabaseUrl)}?on_conflict=sync_key`, {
    method: 'POST',
    headers: {
      ...buildHeaders(config.anonKey),
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(text);
  }
  saveSyncMeta({ lastPushedAt: updatedAt });
}

/** Pull state from the cloud. Returns null if no cloud data exists yet. */
export async function pullFromCloud(config: SyncConfig): Promise<{ state: unknown; updatedAt: number } | null> {
  if (!isValidSupabaseUrl(config.supabaseUrl)) throw new Error('Invalid Supabase URL');
  const url = `${buildTableUrl(config.supabaseUrl)}?sync_key=eq.${encodeURIComponent(config.syncKey)}&select=payload,updated_at`;
  const res = await fetch(url, { headers: buildHeaders(config.anonKey) });
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(text);
  }
  const rows = (await res.json()) as Array<{ payload: string; updated_at: number }>;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  try {
    return { state: JSON.parse(row.payload), updatedAt: row.updated_at };
  } catch {
    throw new Error('Invalid cloud data format');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Returns true if the URL looks like a valid Supabase project endpoint. */
export function isValidSupabaseUrl(url: string): boolean {
  return /^https:\/\/[a-zA-Z0-9_-]+\.supabase\.co\/?$/.test(url);
}

/** Generates a readable random sync key like "ABCD-EFGH-IJKL".
 *  Uses crypto.getRandomValues for a cryptographically secure key. */
export function generateSyncKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars (2^5), omit confusable chars
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  // chars.length is 32 (2^5). Extracting the top 5 bits (byte >> 3) gives a
  // uniform distribution over [0, 31] without any modulo bias.
  const group = (offset: number) =>
    Array.from({ length: 4 }, (_, i) => chars[bytes[offset + i] >> 3]).join('');
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
