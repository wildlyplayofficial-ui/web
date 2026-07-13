/**
 * fetch wrapper for livescore-api.com calls that counts usage in Supabase
 * (api_call_counters via increment_api_calls RPC — daily quota tracking).
 * Best-effort: counting never blocks or fails the actual fetch.
 * Increments are batched in-memory and flushed every 60s or every 20 calls.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SOURCE = 'livescore-worker';
const FLUSH_MS = 60_000;
const FLUSH_AT = 20;

let pending = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let db: SupabaseClient | null | undefined;

function client(): SupabaseClient | null {
  if (db !== undefined) return db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return db;
}

async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  const n = pending;
  pending = 0;
  if (n === 0) return;
  try {
    await client()?.rpc('increment_api_calls', { p_source: SOURCE, p_n: n });
  } catch { /* best-effort — drop on error */ }
}

export function lsFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  pending += 1;
  if (pending >= FLUSH_AT) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(() => void flush(), FLUSH_MS);
    timer.unref?.();
  }
  return fetch(url, init);
}
