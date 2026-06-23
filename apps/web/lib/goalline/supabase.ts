import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anon, read-only client for GoalLine Daily.
 * RLS exposes only non-draft cards, matches, and leaderboard.
 * Returns null when not configured — callers fall back gracefully.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/**
 * Service-role client for server-only writes (picks, settlement).
 * Returns null when not configured.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
