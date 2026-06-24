/**
 * Public web types — mirror supabase/schema.sql.
 * Only published material ever reaches the web (RLS), so 'draft' is excluded.
 */

export type PickMarket = "ah" | "ou" | "1x2" | "btts" | "other";
export type PickStatus = "published" | "won" | "lost" | "push" | "void";
export type RawOutcome = "win" | "half_win" | "push" | "half_loss" | "loss" | "void";
export type PostType = "recap" | "preview" | "news" | "analysis" | "no-play" | "post-mortem";

export interface Pick {
  id: string;
  fixture_id: number;
  league: string;
  kickoff_utc: string;
  home_team: string;
  away_team: string;
  market: PickMarket;
  selection: string;
  line: number | null;
  odds_publish: number;
  odds_close: number | null;
  stake_units: number;
  thesis: string;
  status: PickStatus;
  published_at: string | null;
  home_score: number | null;
  away_score: number | null;
  raw_outcome: RawOutcome | null;
  units_pl: number | null;
  settled_at: string | null;
  /** Score at publish time for in-play picks — AH settles on final − publish. */
  publish_score_home: number | null;
  publish_score_away: number | null;
  /** odds-api participant ids for team logos (13/6). Null for older/manual picks. */
  home_id: number | null;
  away_id: number | null;
}

export interface Post {
  id: string;
  type: PostType;
  slug: string;
  lang: Lang4;
  title: string;
  body_md: string;
  pick_ids: string[];
  status: "published";
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  target_keyword: string | null;
  source_refs: Record<string, unknown> | null;
}

/** Watching teaser: the Curator is watching a match before committing a pick. */
export type WatchingStatus = "active" | "picked" | "expired";

export type Lang4 = "en" | "vi" | "th" | "es";

export interface BuzzSnapshot {
  timestamp: string;
  sentiment_pct: number;
  lean_label: Record<Lang4, string>;
  themes: Record<Lang4, string[]>;
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
  note_translations: Record<Lang4, string> | null;
  status: WatchingStatus;
  created_at: string;
  pick_id: string | null;
  buzz_history: BuzzSnapshot[];
}

/** Crowd poll (decision #5, 11/6): per-pick Follow / Fade / Skip tallies. */
export type VoteKind = "follow" | "fade" | "skip";
export type VoteCounts = Record<VoteKind, number>;

/** Aggregated match hub — all content about a single match. */
export interface MatchData {
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffUtc: string;
  fixtureId: number;
  watching: WatchingRow | null;
  picks: Pick[];
  posts: Post[];
}

/** Mirrors the `track_record` view. Display rule (decision #2): half-win counts
 *  as WON / half-loss as LOST in W-L-P, while units_pl keeps the real AH math. */
export interface TrackRecord {
  wins: number;
  losses: number;
  pushes: number;
  units_pl: number;
  settled: number;
}
