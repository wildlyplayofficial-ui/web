import { getServiceSupabase } from "./supabase-server";
import type { Pick, Post, TrackRecord, WatchingRow } from "./types";

interface AdminStats {
  totalPicks: number;
  activePicks: number;
  totalWatching: number;
  activeWatching: number;
  record: TrackRecord;
}

/** Dashboard stats — counts + track record. */
export async function getAdminStats(): Promise<AdminStats> {
  const sb = getServiceSupabase();
  if (!sb) {
    return {
      totalPicks: 0,
      activePicks: 0,
      totalWatching: 0,
      activeWatching: 0,
      record: { wins: 0, losses: 0, pushes: 0, units_pl: 0, settled: 0 },
    };
  }

  const [picksRes, activePicksRes, watchRes, activeWatchRes, recordRes] =
    await Promise.all([
      sb.from("picks").select("id", { count: "exact", head: true }),
      sb
        .from("picks")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      sb.from("watching").select("id", { count: "exact", head: true }),
      sb
        .from("watching")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      sb.from("track_record").select("*").single(),
    ]);

  const record: TrackRecord = recordRes.data ?? {
    wins: 0,
    losses: 0,
    pushes: 0,
    units_pl: 0,
    settled: 0,
  };

  return {
    totalPicks: picksRes.count ?? 0,
    activePicks: activePicksRes.count ?? 0,
    totalWatching: watchRes.count ?? 0,
    activeWatching: activeWatchRes.count ?? 0,
    record,
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const ADMIN_PER_PAGE = 20;

/** Picks with server-side pagination, newest first. */
export async function getPicks(page = 1, perPage = ADMIN_PER_PAGE): Promise<Paginated<Pick>> {
  const sb = getServiceSupabase();
  if (!sb) return { items: [], total: 0, page, perPage, totalPages: 0 };
  const from = (page - 1) * perPage;
  const [{ count }, { data, error }] = await Promise.all([
    sb.from("picks").select("id", { count: "exact", head: true }),
    sb.from("picks").select("*").order("created_at", { ascending: false }).range(from, from + perPage - 1),
  ]);
  if (error) throw new Error(`getPicks: ${error.message}`);
  const total = count ?? 0;
  return { items: (data ?? []) as Pick[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

/** Watching with server-side pagination, newest first. */
export async function getWatching(page = 1, perPage = ADMIN_PER_PAGE): Promise<Paginated<WatchingRow>> {
  const sb = getServiceSupabase();
  if (!sb) return { items: [], total: 0, page, perPage, totalPages: 0 };
  const from = (page - 1) * perPage;
  const [{ count }, { data, error }] = await Promise.all([
    sb.from("watching").select("id", { count: "exact", head: true }),
    sb.from("watching").select("*").order("created_at", { ascending: false }).range(from, from + perPage - 1),
  ]);
  if (error) throw new Error(`getWatching: ${error.message}`);
  const total = count ?? 0;
  return { items: (data ?? []) as WatchingRow[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

/** Posts with server-side pagination, newest first. Optional type filter. */
export async function getAdminPosts(
  page = 1,
  perPage = ADMIN_PER_PAGE,
  typeFilter?: string,
): Promise<Paginated<Post>> {
  const sb = getServiceSupabase();
  if (!sb) return { items: [], total: 0, page, perPage, totalPages: 0 };
  const from = (page - 1) * perPage;

  let countQuery = sb.from("posts").select("id", { count: "exact", head: true });
  let dataQuery = sb.from("posts").select("*").order("published_at", { ascending: false }).range(from, from + perPage - 1);

  if (typeFilter && typeFilter !== "all") {
    countQuery = countQuery.eq("type", typeFilter);
    dataQuery = dataQuery.eq("type", typeFilter);
  }

  const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);
  if (error) throw new Error(`getAdminPosts: ${error.message}`);
  const total = count ?? 0;
  return { items: (data ?? []) as Post[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

/** Single post by ID for admin edit page. */
export async function getAdminPost(id: string): Promise<Post | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getAdminPost: ${error.message}`);
  return (data as Post) ?? null;
}

export interface ChannelLogRow {
  id: string;
  pick_id: string | null;
  post_id: string | null;
  channel: string;
  external_id: string | null;
  ok: boolean;
  detail: string | null;
  posted_at: string;
}

/** Channel log with server-side pagination, newest first. */
export async function getChannelLog(page = 1, perPage = ADMIN_PER_PAGE): Promise<Paginated<ChannelLogRow>> {
  const sb = getServiceSupabase();
  if (!sb) return { items: [], total: 0, page, perPage, totalPages: 0 };
  const from = (page - 1) * perPage;
  const [{ count }, { data, error }] = await Promise.all([
    sb.from("channel_log").select("id", { count: "exact", head: true }),
    sb.from("channel_log").select("*").order("posted_at", { ascending: false }).range(from, from + perPage - 1),
  ]);
  if (error) throw new Error(`getChannelLog: ${error.message}`);
  const total = count ?? 0;
  return { items: (data ?? []) as ChannelLogRow[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
}
