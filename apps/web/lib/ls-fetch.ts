/**
 * fetch wrapper for livescore-api.com calls that counts usage in Supabase
 * (api_call_counters via increment_api_calls RPC — daily quota tracking).
 * Best-effort fire-and-forget: counting never blocks or fails the actual fetch.
 * No batching — serverless functions are short-lived and call volume is low.
 */
import { getServiceSupabase } from "./supabase-server";

const SOURCE = "livescore-web";

export function lsFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  try {
    void getServiceSupabase()
      ?.rpc("increment_api_calls", { p_source: SOURCE, p_n: 1 })
      .then(() => undefined, () => undefined);
  } catch { /* best-effort */ }
  return fetch(url, init);
}
