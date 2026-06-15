import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only writes (crowd poll votes, decision #5).
 * SUPABASE_SERVICE_ROLE_KEY is a server env var — NEVER prefix it NEXT_PUBLIC_.
 * Returns null when not configured — callers then fall back to mock behaviour,
 * consistent with lib/supabase.ts.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
