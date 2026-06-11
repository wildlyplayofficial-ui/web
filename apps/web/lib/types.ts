/**
 * Public web types — mirror supabase/schema.sql.
 * Only published material ever reaches the web (RLS), so 'draft' is excluded.
 */

export type PickMarket = "ah" | "ou" | "1x2" | "btts" | "other";
export type PickStatus = "published" | "won" | "lost" | "push" | "void";
export type RawOutcome = "win" | "half_win" | "push" | "half_loss" | "loss" | "void";
export type PostType = "recap" | "preview" | "news";

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

export interface Post {
  id: string;
  type: PostType;
  slug: string;
  lang: "en" | "vi";
  title: string;
  body_md: string;
  pick_ids: string[];
  status: "published";
  published_at: string | null;
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
