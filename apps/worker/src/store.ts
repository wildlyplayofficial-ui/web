/**
 * Tiny store abstraction: real Supabase (service role) or in-memory mock.
 * Mock mode: SUPABASE_URL unset → MemoryStore, so the bot can be smoke-tested locally.
 */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RawOutcome } from '@wildlyplay/settlement';
import type { Market } from './parse-pick';
import { log } from './log';

export type PickStatus = 'draft' | 'published' | 'won' | 'lost' | 'push' | 'void';

export interface PickRow {
  id: string;
  /** odds-api.io event id used for auto-settlement; 0 = none (manual /score only). */
  fixture_id: number;
  league: string;
  kickoff_utc: string;
  home_team: string;
  away_team: string;
  market: Market;
  selection: string;
  line: number | null;
  odds_publish: number;
  /** CLV: closing odds for the SAME selection+line, captured near kickoff. Null = not captured. */
  odds_close: number | null;
  /** Running pick (12/6): score at publish; AH settles on goals after this. Null = pre-match. */
  publish_score_home: number | null;
  publish_score_away: number | null;
  /** odds-api participant ids for team logos (13/6). Null for older/manual picks. */
  home_id: number | null;
  away_id: number | null;
  stake_units: number;
  thesis: string;
  /** Trust anchor (20/6): pre-registered confidence. Null = legacy picks without confidence. */
  confidence: 'low' | 'medium' | 'high' | null;
  /** T3: Primary Edge taxonomy. */
  primary_edge: string | null;
  /** T4: Supporting Evidence tags (max 2). */
  supporting_evidence: string[] | null;
  /** T8: Loss-type (filled after settlement for losses). */
  loss_type: string | null;
  /** T5/T6: Post-mortem review fields. */
  postmortem_status: 'pending' | 'approved' | 'overdue' | null;
  postmortem_draft: string | null;
  postmortem_approved: string | null;
  postmortem_at: string | null;
  /** T9: market side (over/under/home/away/draw). Auto-derived at pick time. */
  market_side: string | null;
  /** T9: favored/dog/neutral. Auto-derived from odds at pick time. */
  favored_dog: string | null;
  status: PickStatus;
  published_at: string | null;
  home_score: number | null;
  away_score: number | null;
  raw_outcome: RawOutcome | null;
  units_pl: number | null;
  settled_at: string | null;
}

export type NewPick = Omit<PickRow, 'id'>;

/** Newsroom post row. Pick-driven articles (decision #19, 12/6): previews and
 *  recap articles auto-publish; 'draft' remains for anything held back. */
export type PostLang = 'en' | 'vi' | 'th' | 'es';

export interface NewPost {
  type: 'recap' | 'preview' | 'analysis' | 'news' | 'no-play' | 'post-mortem';
  slug: string;
  lang: PostLang;
  title: string;
  body_md: string;
  pick_ids: string[];
  status: 'draft' | 'published';
  published_at: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  target_keyword?: string | null;
  source_refs?: Record<string, unknown> | null;
}

/** Per-language pick analysis row (`pick_content`). Thesis translations:
 *  vi/th/es only — the English thesis lives on the pick itself. */
export interface NewPickContent {
  pick_id: string;
  lang: PostLang;
  title: string;
  body_md: string;
  model: string | null;
}

export interface ChannelLogEntry {
  pick_id: string;
  channel: 'web' | 'telegram' | 'x' | 'facebook';
  external_id?: string;
  ok: boolean;
  detail?: string;
}

export type WatchingStatus = 'active' | 'picked' | 'expired';

export interface BuzzSnapshot {
  timestamp: string;
  sentiment_pct: number;
  lean_label: Record<string, string>;
  themes: Record<string, string[]>;
  confidence: string;
  sources?: string[];
}

export interface WatchingRow {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff_utc: string;
  note: string | null;
  note_translations: Record<string, string> | null;
  status: WatchingStatus;
  created_at: string;
  pick_id: string | null;
  buzz_history: BuzzSnapshot[];
}

export type NewWatching = Omit<WatchingRow, 'id' | 'created_at'>;

export interface Store {
  insertPick(pick: NewPick): Promise<PickRow>;
  getPick(id: string): Promise<PickRow | null>;
  updatePick(id: string, patch: Partial<PickRow>): Promise<PickRow>;
  listByStatus(statuses: PickStatus[]): Promise<PickRow[]>;
  insertChannelLog(entry: ChannelLogEntry): Promise<void>;
  insertPost(post: NewPost): Promise<void>;
  upsertPickContent(rows: NewPickContent[]): Promise<void>;
  /** Distinct pick ids that already have pick_content rows (backfill helper). */
  listPickContentPickIds(): Promise<Set<string>>;
  /** Distinct slugs for a given post type (dedup before AI generation). */
  listPostSlugsByType(type: string): Promise<Set<string>>;
  /** Count posts of a type published today (UTC), lang='en' to count per-article not per-row. */
  countPostsTodayByType(type: string): Promise<number>;
  /** Insert a new watching row. */
  insertWatching(watching: NewWatching): Promise<WatchingRow>;
  /** All active watching rows (status='active'). */
  getActiveWatching(): Promise<WatchingRow[]>;
  /** Expire a watching row by setting status='expired'. */
  expireWatching(id: string): Promise<WatchingRow>;
  /** Link a watching row to a pick: status='picked' + pick_id. */
  linkWatchingToPick(watchingId: string, pickId: string): Promise<WatchingRow>;
  /** Partial update on a watching row (buzz_history, note_translations, etc). */
  updateWatching(id: string, patch: Partial<WatchingRow>): Promise<WatchingRow>;
  /** Check if a channel_log entry exists for a pick+channel combo (dedup guard). */
  hasChannelLog(pickId: string, channel: string, detailPrefix?: string): Promise<boolean>;
}

export class MemoryStore implements Store {
  readonly picks = new Map<string, PickRow>();
  readonly logs: ChannelLogEntry[] = [];
  readonly posts: NewPost[] = [];
  readonly pickContent = new Map<string, NewPickContent>(); // key: `${pick_id}:${lang}`
  readonly watchings = new Map<string, WatchingRow>();

  async insertPick(pick: NewPick): Promise<PickRow> {
    const row: PickRow = { id: randomUUID(), ...pick };
    this.picks.set(row.id, row);
    return row;
  }

  async getPick(id: string): Promise<PickRow | null> {
    return this.picks.get(id) ?? null;
  }

  async updatePick(id: string, patch: Partial<PickRow>): Promise<PickRow> {
    const row = this.picks.get(id);
    if (!row) throw new Error(`updatePick: pick ${id} not found`);
    const next = { ...row, ...patch, id: row.id };
    this.picks.set(id, next);
    return next;
  }

  async listByStatus(statuses: PickStatus[]): Promise<PickRow[]> {
    return [...this.picks.values()]
      .filter((p) => statuses.includes(p.status))
      .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
  }

  async insertChannelLog(entry: ChannelLogEntry): Promise<void> {
    this.logs.push(entry);
  }

  async insertPost(post: NewPost): Promise<void> {
    this.posts.push(post);
  }

  async upsertPickContent(rows: NewPickContent[]): Promise<void> {
    for (const row of rows) this.pickContent.set(`${row.pick_id}:${row.lang}`, row);
  }

  async listPickContentPickIds(): Promise<Set<string>> {
    return new Set([...this.pickContent.values()].map((r) => r.pick_id));
  }

  async listPostSlugsByType(type: string): Promise<Set<string>> {
    return new Set(this.posts.filter((p) => p.type === type).map((p) => p.slug));
  }

  async countPostsTodayByType(type: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    return this.posts.filter((p) =>
      p.type === type && p.lang === 'en' && p.published_at && new Date(p.published_at) >= startOfDay
    ).length;
  }

  async insertWatching(watching: NewWatching): Promise<WatchingRow> {
    const row: WatchingRow = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      buzz_history: [],
      note_translations: null,
      ...watching,
    };
    this.watchings.set(row.id, row);
    return row;
  }

  async getActiveWatching(): Promise<WatchingRow[]> {
    return [...this.watchings.values()]
      .filter((w) => w.status === 'active')
      .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
  }

  async expireWatching(id: string): Promise<WatchingRow> {
    const row = this.watchings.get(id);
    if (!row) throw new Error(`expireWatching: watching ${id} not found`);
    const next = { ...row, status: 'expired' as const };
    this.watchings.set(id, next);
    return next;
  }

  async linkWatchingToPick(watchingId: string, pickId: string): Promise<WatchingRow> {
    const row = this.watchings.get(watchingId);
    if (!row) throw new Error(`linkWatchingToPick: watching ${watchingId} not found`);
    const next = { ...row, status: 'picked' as const, pick_id: pickId };
    this.watchings.set(watchingId, next);
    return next;
  }

  async updateWatching(id: string, patch: Partial<WatchingRow>): Promise<WatchingRow> {
    const row = this.watchings.get(id);
    if (!row) throw new Error(`updateWatching: watching ${id} not found`);
    const next = { ...row, ...patch, id: row.id };
    this.watchings.set(id, next);
    return next;
  }

  async hasChannelLog(pickId: string, channel: string, detailPrefix?: string): Promise<boolean> {
    return this.logs.some(
      (l) => l.pick_id === pickId && l.channel === channel && (!detailPrefix || (l.detail ?? '').startsWith(detailPrefix)),
    );
  }
}

class SupabaseStore implements Store {
  constructor(private readonly db: SupabaseClient) {}

  async insertPick(pick: NewPick): Promise<PickRow> {
    const { data, error } = await this.db.from('picks').insert(pick).select().single();
    if (error) throw new Error(`insertPick failed: ${error.message}`);
    return data as PickRow;
  }

  async getPick(id: string): Promise<PickRow | null> {
    const { data, error } = await this.db.from('picks').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`getPick failed: ${error.message}`);
    return (data as PickRow) ?? null;
  }

  async updatePick(id: string, patch: Partial<PickRow>): Promise<PickRow> {
    const { data, error } = await this.db.from('picks').update(patch).eq('id', id).select().single();
    if (error) throw new Error(`updatePick failed: ${error.message}`);
    return data as PickRow;
  }

  async listByStatus(statuses: PickStatus[]): Promise<PickRow[]> {
    const { data, error } = await this.db
      .from('picks').select('*').in('status', statuses)
      .order('kickoff_utc', { ascending: true });
    if (error) throw new Error(`listByStatus failed: ${error.message}`);
    return (data ?? []) as PickRow[];
  }

  async insertChannelLog(entry: ChannelLogEntry): Promise<void> {
    const { error } = await this.db.from('channel_log').insert(entry);
    if (error) throw new Error(`insertChannelLog failed: ${error.message}`);
  }

  async insertPost(post: NewPost): Promise<void> {
    // SEO uniqueness gate — lint before publish (deterministic, code not prompt)
    const { lintSeoArticle } = await import('./seo-lint');
    const lint = lintSeoArticle(post.body_md);
    if (!lint.passed) {
      log.warn(`seo-lint FAIL for ${post.type}/${post.slug}/${post.lang}: ${lint.flags.join('; ')}`);
      // Still publish but log — flip to block when confident
    }
    const { error } = await this.db.from('posts').insert(post);
    if (error) throw new Error(`insertPost failed: ${error.message}`);
  }

  async upsertPickContent(rows: NewPickContent[]): Promise<void> {
    const { error } = await this.db
      .from('pick_content').upsert(rows, { onConflict: 'pick_id,lang' });
    if (error) throw new Error(`upsertPickContent failed: ${error.message}`);
  }

  async listPickContentPickIds(): Promise<Set<string>> {
    const { data, error } = await this.db.from('pick_content').select('pick_id');
    if (error) throw new Error(`listPickContentPickIds failed: ${error.message}`);
    return new Set(((data ?? []) as { pick_id: string }[]).map((r) => r.pick_id));
  }

  async listPostSlugsByType(type: string): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('posts')
      .select('slug')
      .eq('type', type)
      .eq('lang', 'en');
    if (error) throw new Error(`listPostSlugsByType failed: ${error.message}`);
    return new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
  }

  async countPostsTodayByType(type: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error } = await this.db
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('type', type)
      .eq('lang', 'en')
      .gte('published_at', startOfDay.toISOString());
    if (error) throw new Error(`countPostsTodayByType failed: ${error.message}`);
    return count ?? 0;
  }

  async insertWatching(watching: NewWatching): Promise<WatchingRow> {
    const { data, error } = await this.db.from('watching').insert(watching).select().single();
    if (error) throw new Error(`insertWatching failed: ${error.message}`);
    return data as WatchingRow;
  }

  async getActiveWatching(): Promise<WatchingRow[]> {
    const { data, error } = await this.db
      .from('watching').select('*').eq('status', 'active')
      .order('kickoff_utc', { ascending: true });
    if (error) throw new Error(`getActiveWatching failed: ${error.message}`);
    return (data ?? []) as WatchingRow[];
  }

  async expireWatching(id: string): Promise<WatchingRow> {
    const { data, error } = await this.db
      .from('watching').update({ status: 'expired' }).eq('id', id).select().single();
    if (error) throw new Error(`expireWatching failed: ${error.message}`);
    return data as WatchingRow;
  }

  async linkWatchingToPick(watchingId: string, pickId: string): Promise<WatchingRow> {
    const { data, error } = await this.db
      .from('watching').update({ status: 'picked', pick_id: pickId }).eq('id', watchingId).select().single();
    if (error) throw new Error(`linkWatchingToPick failed: ${error.message}`);
    return data as WatchingRow;
  }

  async updateWatching(id: string, patch: Partial<WatchingRow>): Promise<WatchingRow> {
    const { data, error } = await this.db
      .from('watching').update(patch).eq('id', id).select().single();
    if (error) throw new Error(`updateWatching failed: ${error.message}`);
    return data as WatchingRow;
  }

  async hasChannelLog(pickId: string, channel: string, detailPrefix?: string): Promise<boolean> {
    let query = this.db.from('channel_log').select('id', { count: 'exact', head: true })
      .eq('pick_id', pickId).eq('channel', channel);
    if (detailPrefix) query = query.like('detail', `${detailPrefix}%`);
    const { count } = await query;
    return (count ?? 0) > 0;
  }
}

export function createStore(env: NodeJS.ProcessEnv): Store {
  if (!env.SUPABASE_URL) {
    log.warn('SUPABASE_URL unset — running in MOCK MODE with in-memory store');
    return new MemoryStore();
  }
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required when SUPABASE_URL is set');
  const db = createClient(env.SUPABASE_URL, key, { auth: { persistSession: false } });
  log.info('connected to Supabase (service role)');
  return new SupabaseStore(db);
}
