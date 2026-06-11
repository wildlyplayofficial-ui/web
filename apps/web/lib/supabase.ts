import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anon, read-only client (RLS exposes only published material).
 * Returns null when the Supabase project is not configured yet —
 * the data layer (lib/data.ts) then falls back to typed mock data.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}
