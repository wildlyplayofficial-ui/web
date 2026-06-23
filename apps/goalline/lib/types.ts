/** Card lifecycle status (spec §3). */
export type CardStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "locked"
  | "live"
  | "settled"
  | "voided";

/** Pick side. */
export type PickSide = "over" | "under";

/** Pick status after settlement. */
export type PickStatus = "locked" | "won" | "lost" | "void";

/** Settlement result. */
export type SettlementResult = "over" | "under" | "void" | null;

/** Match status from data provider. */
export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "abandoned";

/** Daily card as returned by the API / DB. */
export interface DailyCard {
  id: string;
  card_number: number;
  utc_date: string;
  goal_line: number;
  over_odds: number;
  under_odds: number;
  cutoff_time_utc: string;
  status: CardStatus;
  method_note: string | null;
  settlement_result: SettlementResult;
  void_reason: string | null;
}

/** Match linked to a card. */
export interface CardMatch {
  id: string;
  external_match_id: string;
  home_team: string;
  away_team: string;
  kickoff_time_utc: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  valid_goals: number | null;
  sort_order: number;
}

/** User's pick for a card. */
export interface UserPick {
  id: string;
  side: PickSide;
  odds_locked: number;
  stake_points: number;
  status: PickStatus;
  net_profit: number | null;
  participation_bonus: number | null;
  points_added: number | null;
}

/** Today's card response — card + matches + optional user pick. */
export interface TodayCardResponse {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
  communitySplit: { over: number; under: number } | null;
}

/** Leaderboard entry. */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  discriminator: string;
  score: number;
  winning_days: number;
  current_streak: number;
}

/**
 * Card view state — the state machine key (spec §12).
 * Derived from card.status x user.has_picked.
 */
export type CardViewState =
  | "no_card"
  | "open_unpicked"
  | "open_picked"
  | "locked"
  | "live"
  | "settled"
  | "voided";
