/**
 * i18n-ready string constants (English MVP).
 * All user-facing copy lives here — swap for a translation function later.
 */

export const S = {
  // Brand
  BRAND: "GoalLine Daily",
  TAGLINE: "One line. Over or Under. Daily.",

  // Empty / no card
  NO_CARD_TITLE: "No card today",
  NO_CARD_BODY: "Check back tomorrow for the next GoalLine Daily card.",

  // Card
  CARD_LABEL: "Card",
  GOAL_LINE_LABEL: "Goal Line",
  OVER: "Over",
  UNDER: "Under",
  OVER_VI: "Tai",
  UNDER_VI: "Xiu",
  METHOD_LABEL: "How the line is set",
  CUTOFF_LABEL: "Cut-off",
  LOCK_CTA: "Lock My Pick",

  // Confirmation
  CONFIRM_TITLE: "Confirm your pick",
  CONFIRM_BODY: (side: string, line: number, odds: number) =>
    `You are choosing ${side} ${line} at ${odds}. Uses your Daily Ticket (100 pts). Cannot be changed.`,
  CONFIRM_BTN: "Confirm",
  CANCEL_BTN: "Go Back",

  // Locked pick
  LOCKED_TITLE: "Pick locked",
  YOUR_PICK: "Your pick",
  ODDS_LOCKED: "Odds locked",
  POTENTIAL_PAYOUT: "Potential payout",
  COMMUNITY_SPLIT: "Community split",
  FIRST_KO: "First kick-off",

  // Live
  LIVE_TITLE: "Live",
  TOTAL_GOALS: "Total goals",
  OVER_NEEDS: (n: number) => `Over needs ${n} more goal${n === 1 ? "" : "s"}`,
  UNDER_SURVIVES: (n: number) =>
    `Under survives if total stays at or below ${n}`,
  WINNING_SIDE: "Currently winning",
  MATCHES_PROGRESS: (done: number, total: number) =>
    `${done}/${total} matches complete`,

  // Settled
  RESULT_TITLE: "Result",
  TOTAL_VS_LINE: "Total vs Line",
  WINNING_SIDE_LABEL: "Winning side",
  YOUR_RESULT: "Your result",
  POINTS_EARNED: "Points earned",
  WON: "Won",
  LOST: "Lost",
  VIEW_LEADERBOARD: "View Leaderboard",

  // Voided
  VOIDED_TITLE: "Card voided",
  VOIDED_BODY: "This card has been voided. All picks are refunded.",

  // Leaderboard
  LEADERBOARD_TITLE: "Leaderboard",
  WEEKLY_TAB: "Weekly",
  SKILL_TAB: "Skill (Season)",
  RANK: "Rank",
  PLAYER: "Player",
  SCORE: "Score",
  WINS: "Wins",
  STREAK: "Streak",
  SKILL_COMING_SOON: "Skill leaderboard coming soon. Claim your account to qualify.",

  // Footer
  DISCLAIMER: "Entertainment only. Not financial advice.",
  NOT_SPORTSBOOK: "Not a sportsbook.",

  // Admin
  ADMIN_TITLE: "Admin Panel",
  CREATE_CARD: "Create Card",
  DATE_LABEL: "Date",
  MATCH_IDS_LABEL: "Match IDs (3 required)",
  EXISTING_CARDS: "Existing Cards",
  PUBLISH: "Publish",
  LOCK: "Lock",
  SETTLE: "Settle",
  VOID: "Void",
} as const;
