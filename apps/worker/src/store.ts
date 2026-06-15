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
  type: 'recap' | 'preview' | 'analysis' | 'news';
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
}

export class MemoryStore implements Store {
  readonly picks = new Map<string, PickRow>();
  readonly logs: ChannelLogEntry[] = [];
  readonly posts: NewPost[] = [];
  readonly pickContent = new Map<string, NewPickContent>(); // key: `${pick_id}:${lang}`

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
