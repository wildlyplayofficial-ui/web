/**
 * i18n strings for Daily Line — EN, VI, TH, ES.
 * All user-facing copy lives here.
 */

import type { Lang } from "@/lib/i18n";

export interface DailyLineDict {
  BRAND: string;
  TAGLINE: string;
  HOW_IT_WORKS: string;
  STEP_1_TITLE: string;
  STEP_1_DESC: string;
  STEP_2_TITLE: string;
  STEP_2_DESC: string;
  STEP_3_TITLE: string;
  STEP_3_DESC: string;
  NO_CARD_TITLE: string;
  NO_CARD_BODY: string;
  CARD_LABEL: string;
  GOAL_LINE_LABEL: string;
  OVER: string;
  UNDER: string;
  METHOD_LABEL: string;
  CUTOFF_LABEL: string;
  LOCK_CTA: string;
  CONFIRM_TITLE: string;
  CONFIRM_BODY: (side: string, line: number, odds: number) => string;
  CONFIRM_BTN: string;
  CANCEL_BTN: string;
  LOCKED_TITLE: string;
  YOUR_PICK: string;
  ODDS_LOCKED: string;
  POTENTIAL_PAYOUT: string;
  COMMUNITY_SPLIT: string;
  FIRST_KO: string;
  LIVE_TITLE: string;
  TOTAL_GOALS: string;
  OVER_NEEDS: (n: number) => string;
  UNDER_SURVIVES: (n: number) => string;
  WINNING_SIDE: string;
  MATCHES_PROGRESS: (done: number, total: number) => string;
  RESULT_TITLE: string;
  TOTAL_VS_LINE: string;
  WINNING_SIDE_LABEL: string;
  YOUR_RESULT: string;
  POINTS_EARNED: string;
  WON: string;
  LOST: string;
  VIEW_LEADERBOARD: string;
  VOIDED_TITLE: string;
  VOIDED_BODY: string;
  LEADERBOARD_TITLE: string;
  WEEKLY_TAB: string;
  SKILL_TAB: string;
  RANK: string;
  PLAYER: string;
  SCORE: string;
  WINS: string;
  STREAK: string;
  SKILL_COMING_SOON: string;
  DAY_STREAK: (n: number) => string;
  PLAYERS_PICKED: (n: number) => string;
  PICK_LOCKED_TITLE: string;
  YOU_PICKED: (side: string, line: number, odds: number) => string;
  PTS_STAKED: string;
  POTENTIAL_RETURN: (pts: number) => string;
  HOW_IT_WORKS_TITLE: string;
  GOT_IT: string;
  DISCLAIMER: string;
  NOT_SPORTSBOOK: string;
  NAV_MY_PICKS: string;
  NAV_ARCHIVE: string;
  NAV_BOARD: string;
  ALL_TIME_TAB: string;
  NO_ENTRIES_WEEK: string;
  NO_SETTLED_PICKS: string;
  ADMIN_TITLE: string;
  CREATE_CARD: string;
  DATE_LABEL: string;
  MATCH_IDS_LABEL: string;
  EXISTING_CARDS: string;
  PUBLISH: string;
  LOCK: string;
  SETTLE: string;
  VOID: string;
  SHARE_TG_CTA: string;
  SHARE_TG_CAPTION: (cardNum: number) => string;
}

const en: DailyLineDict = {
  BRAND: "Daily Line",
  TAGLINE: "One line. Over or Under. Daily.",
  HOW_IT_WORKS: "Predict whether today\u2019s selected matches will produce Over or Under the goal line. Pick your side, climb the leaderboard.",
  STEP_1_TITLE: "Check the line",
  STEP_1_DESC: "We pick 3 matches and set a combined goal line using real bookmaker odds.",
  STEP_2_TITLE: "Make your pick",
  STEP_2_DESC: "Over or Under \u2014 lock in before cut-off. 100 pts per card.",
  STEP_3_TITLE: "Watch & climb",
  STEP_3_DESC: "Goals count across all 3 matches. Win points, rise on the leaderboard.",
  NO_CARD_TITLE: "No card today",
  NO_CARD_BODY: "Check back tomorrow for the next Daily Line card.",
  CARD_LABEL: "Card",
  GOAL_LINE_LABEL: "Goal Line",
  OVER: "Over",
  UNDER: "Under",
  METHOD_LABEL: "How the line is set",
  CUTOFF_LABEL: "Cut-off",
  LOCK_CTA: "Lock My Pick",
  CONFIRM_TITLE: "Confirm your pick",
  CONFIRM_BODY: (side, line, odds) => `You are choosing ${side} ${line} at ${odds}. Uses your Daily Ticket (100 pts). Cannot be changed.`,
  CONFIRM_BTN: "Confirm",
  CANCEL_BTN: "Go Back",
  LOCKED_TITLE: "Pick locked",
  YOUR_PICK: "Your pick",
  ODDS_LOCKED: "Odds locked",
  POTENTIAL_PAYOUT: "Potential payout",
  COMMUNITY_SPLIT: "Community split",
  FIRST_KO: "First kick-off",
  LIVE_TITLE: "Live",
  TOTAL_GOALS: "Total goals",
  OVER_NEEDS: (n) => `Over needs ${n} more goal${n === 1 ? "" : "s"}`,
  UNDER_SURVIVES: (n) => `Under survives if total stays at or below ${n}`,
  WINNING_SIDE: "Currently winning",
  MATCHES_PROGRESS: (done, total) => `${done}/${total} matches complete`,
  RESULT_TITLE: "Result",
  TOTAL_VS_LINE: "Total vs Line",
  WINNING_SIDE_LABEL: "Winning side",
  YOUR_RESULT: "Your result",
  POINTS_EARNED: "Points earned",
  WON: "Won",
  LOST: "Lost",
  VIEW_LEADERBOARD: "View Leaderboard",
  VOIDED_TITLE: "Card voided",
  VOIDED_BODY: "This card has been voided. All picks are refunded.",
  LEADERBOARD_TITLE: "Leaderboard",
  WEEKLY_TAB: "Weekly",
  SKILL_TAB: "Skill (Season)",
  RANK: "Rank",
  PLAYER: "Player",
  SCORE: "Score",
  WINS: "Wins",
  STREAK: "Streak",
  SKILL_COMING_SOON: "Skill leaderboard coming soon. Claim your account to qualify.",
  DAY_STREAK: (n: number) => `${n} day streak`,
  PLAYERS_PICKED: (n: number) => `${n} ${n === 1 ? "player" : "players"} picked today`,
  PICK_LOCKED_TITLE: "Pick Locked!",
  YOU_PICKED: (side: string, line: number, odds: number) => `You picked ${side} ${line} @ ${odds.toFixed(2)}`,
  PTS_STAKED: "100 pts staked",
  POTENTIAL_RETURN: (pts: number) => `Potential return: ${pts} pts`,
  HOW_IT_WORKS_TITLE: "How it works",
  GOT_IT: "Got it",
  NAV_MY_PICKS: "My Picks",
  NAV_ARCHIVE: "Archive",
  NAV_BOARD: "Board",
  ALL_TIME_TAB: "All-Time",
  NO_ENTRIES_WEEK: "No entries this week yet.",
  NO_SETTLED_PICKS: "No settled picks yet.",
  DISCLAIMER: "Entertainment only. Not financial advice.",
  NOT_SPORTSBOOK: "Not a sportsbook.",
  ADMIN_TITLE: "Admin Panel",
  CREATE_CARD: "Create Card",
  DATE_LABEL: "Date",
  MATCH_IDS_LABEL: "Match IDs (3 required)",
  EXISTING_CARDS: "Existing Cards",
  PUBLISH: "Publish",
  LOCK: "Lock",
  SETTLE: "Settle",
  VOID: "Void",
  SHARE_TG_CTA: "Challenge your crew",
  SHARE_TG_CAPTION: (cardNum: number) => `\u{1F525} Daily Line #${cardNum} — predict Over/Under tonight's matches. Who tops the group board? \u{1F447}`,
};

const vi: DailyLineDict = {
  ...en,
  TAGLINE: "M\u1ED9t line. T\u00E0i ho\u1EB7c X\u1EC9u. M\u1ED7i ng\u00E0y.",
  HOW_IT_WORKS: "D\u1EF1 \u0111o\u00E1n t\u1ED5ng b\u00E0n th\u1EAFng c\u1EE7a c\u00E1c tr\u1EADn \u0111\u01B0\u1EE3c ch\u1ECDn h\u00F4m nay s\u1EBD T\u00E0i hay X\u1EC9u. Ch\u1ECDn phe, leo b\u1EA3ng x\u1EBFp h\u1EA1ng.",
  STEP_1_TITLE: "Xem line",
  STEP_1_DESC: "Ch\u00FAng t\u00F4i ch\u1ECDn 3 tr\u1EADn v\u00E0 \u0111\u1EB7t line t\u1ED5ng b\u00E0n th\u1EAFng t\u1EEB t\u1EF7 l\u1EC7 nh\u00E0 c\u00E1i th\u1EADt.",
  STEP_2_TITLE: "Ch\u1ECDn phe",
  STEP_2_DESC: "T\u00E0i ho\u1EB7c X\u1EC9u \u2014 kh\u00F3a tr\u01B0\u1EDBc gi\u1EDD c\u1EAFt. 100 \u0111i\u1EC3m m\u1ED7i card.",
  STEP_3_TITLE: "Xem & leo h\u1EA1ng",
  STEP_3_DESC: "B\u00E0n th\u1EAFng t\u00EDnh t\u1EEB c\u1EA3 3 tr\u1EADn. Th\u1EAFng \u0111i\u1EC3m, leo b\u1EA3ng x\u1EBFp h\u1EA1ng.",
  NO_CARD_TITLE: "H\u00F4m nay kh\u00F4ng c\u00F3 card",
  NO_CARD_BODY: "Quay l\u1EA1i ng\u00E0y mai \u0111\u1EC3 xem card Daily Line m\u1EDBi.",
  GOAL_LINE_LABEL: "Line",
  OVER: "T\u00E0i",
  UNDER: "X\u1EC9u",
  CUTOFF_LABEL: "Gi\u1EDD c\u1EAFt",
  LOCK_CTA: "Kh\u00F3a l\u1EF1a ch\u1ECDn",
  CONFIRM_TITLE: "X\u00E1c nh\u1EADn l\u1EF1a ch\u1ECDn",
  CONFIRM_BODY: (side, line, odds) => `B\u1EA1n ch\u1ECDn ${side} ${line} v\u1EDBi t\u1EF7 l\u1EC7 ${odds}. D\u00F9ng v\u00E9 h\u00E0ng ng\u00E0y (100 \u0111i\u1EC3m). Kh\u00F4ng th\u1EC3 thay \u0111\u1ED5i.`,
  CONFIRM_BTN: "X\u00E1c nh\u1EADn",
  CANCEL_BTN: "Quay l\u1EA1i",
  LOCKED_TITLE: "\u0110\u00E3 kh\u00F3a",
  YOUR_PICK: "L\u1EF1a ch\u1ECDn c\u1EE7a b\u1EA1n",
  ODDS_LOCKED: "T\u1EF7 l\u1EC7 \u0111\u00E3 kh\u00F3a",
  POTENTIAL_PAYOUT: "Ti\u1EC1m n\u0103ng nh\u1EADn",
  COMMUNITY_SPLIT: "T\u1EF7 l\u1EC7 c\u1ED9ng \u0111\u1ED3ng",
  FIRST_KO: "Tr\u1EADn \u0111\u1EA7u ti\u00EAn",
  TOTAL_GOALS: "T\u1ED5ng b\u00E0n th\u1EAFng",
  OVER_NEEDS: (n) => `T\u00E0i c\u1EA7n th\u00EAm ${n} b\u00E0n`,
  UNDER_SURVIVES: (n) => `X\u1EC9u gi\u1EEF n\u1EBFu t\u1ED5ng \u2264 ${n}`,
  WINNING_SIDE: "\u0110ang th\u1EAFng",
  MATCHES_PROGRESS: (done, total) => `${done}/${total} tr\u1EADn xong`,
  RESULT_TITLE: "K\u1EBFt qu\u1EA3",
  TOTAL_VS_LINE: "T\u1ED5ng vs Line",
  WINNING_SIDE_LABEL: "Phe th\u1EAFng",
  YOUR_RESULT: "K\u1EBFt qu\u1EA3 c\u1EE7a b\u1EA1n",
  POINTS_EARNED: "\u0110i\u1EC3m nh\u1EADn \u0111\u01B0\u1EE3c",
  WON: "Th\u1EAFng",
  LOST: "Thua",
  VIEW_LEADERBOARD: "Xem b\u1EA3ng x\u1EBFp h\u1EA1ng",
  VOIDED_TITLE: "Card \u0111\u00E3 h\u1EE7y",
  VOIDED_BODY: "Card n\u00E0y \u0111\u00E3 b\u1ECB h\u1EE7y. T\u1EA5t c\u1EA3 l\u1EF1a ch\u1ECDn \u0111\u01B0\u1EE3c ho\u00E0n \u0111i\u1EC3m.",
  LEADERBOARD_TITLE: "B\u1EA3ng x\u1EBFp h\u1EA1ng",
  WEEKLY_TAB: "Tu\u1EA7n",
  SKILL_TAB: "K\u1EF9 n\u0103ng (M\u00F9a)",
  SKILL_COMING_SOON: "B\u1EA3ng x\u1EBFp h\u1EA1ng k\u1EF9 n\u0103ng s\u1EAFp ra m\u1EAFt.",
  DAY_STREAK: (n: number) => `${n} ng\u00E0y li\u00EAn ti\u1EBFp`,
  PLAYERS_PICKED: (n: number) => `${n} ng\u01B0\u1EDDi \u0111\u00E3 ch\u1ECDn h\u00F4m nay`,
  PICK_LOCKED_TITLE: "\u0110\u00E3 kh\u00F3a l\u1EF1a ch\u1ECDn!",
  YOU_PICKED: (side: string, line: number, odds: number) => `B\u1EA1n ch\u1ECDn ${side} ${line} @ ${odds.toFixed(2)}`,
  PTS_STAKED: "100 \u0111i\u1EC3m \u0111\u1EB7t c\u01B0\u1EE3c",
  POTENTIAL_RETURN: (pts: number) => `Ti\u1EC1m n\u0103ng: ${pts} \u0111i\u1EC3m`,
  HOW_IT_WORKS_TITLE: "C\u00E1ch ch\u01A1i",
  GOT_IT: "Hi\u1EC3u r\u1ED3i",
  NAV_MY_PICKS: "L\u01B0\u1EE3t ch\u1ECDn",
  NAV_ARCHIVE: "L\u01B0u tr\u1EEF",
  NAV_BOARD: "BXH",
  ALL_TIME_TAB: "T\u1EA5t c\u1EA3",
  NO_ENTRIES_WEEK: "Ch\u01B0a c\u00F3 ai tu\u1EA7n n\u00E0y.",
  NO_SETTLED_PICKS: "Ch\u01B0a c\u00F3 l\u01B0\u1EE3t ch\u1ECDn n\u00E0o.",
  DISCLAIMER: "Ch\u1EC9 mang t\u00EDnh gi\u1EA3i tr\u00ED. Kh\u00F4ng ph\u1EA3i t\u01B0 v\u1EA5n t\u00E0i ch\u00EDnh.",
  NOT_SPORTSBOOK: "Kh\u00F4ng ph\u1EA3i nh\u00E0 c\u00E1i.",
  SHARE_TG_CTA: "R\u1EE7 h\u1ED9i b\u1EA1n v\u00E0o k\u00E8o",
  SHARE_TG_CAPTION: (cardNum: number) => `\u{1F525} L\u1EADp k\u00E8o nh\u00F3m m\u00ECnh! Daily Line #${cardNum} \u2014 \u0110o\u00E1n Over/Under c\u00E1c tr\u1EADn hot t\u1ED1i nay \u2014 ai l\u00EAn TOP b\u1EA3ng nh\u00F3m? \u{1F447}`,
};

const th: DailyLineDict = {
  ...en,
  TAGLINE: "\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E40\u0E2A\u0E49\u0E19. \u0E2A\u0E39\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E48\u0E33. \u0E17\u0E38\u0E01\u0E27\u0E31\u0E19.",
  HOW_IT_WORKS: "\u0E17\u0E32\u0E22\u0E27\u0E48\u0E32\u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E08\u0E30\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E23\u0E27\u0E21\u0E2A\u0E39\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E40\u0E2A\u0E49\u0E19. \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1D\u0E31\u0E48\u0E07 \u0E44\u0E15\u0E48\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A.",
  STEP_1_TITLE: "\u0E14\u0E39\u0E40\u0E2A\u0E49\u0E19",
  STEP_1_DESC: "\u0E40\u0E23\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01 3 \u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E41\u0E25\u0E30\u0E15\u0E31\u0E49\u0E07\u0E40\u0E2A\u0E49\u0E19\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E23\u0E27\u0E21\u0E08\u0E32\u0E01\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E15\u0E48\u0E2D\u0E23\u0E2D\u0E07\u0E08\u0E23\u0E34\u0E07.",
  STEP_2_TITLE: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1D\u0E31\u0E48\u0E07",
  STEP_2_DESC: "\u0E2A\u0E39\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E48\u0E33 \u2014 \u0E25\u0E47\u0E2D\u0E04\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32. 100 \u0E41\u0E15\u0E49\u0E21\u0E15\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E4C\u0E14.",
  STEP_3_TITLE: "\u0E14\u0E39\u0E41\u0E25\u0E30\u0E44\u0E15\u0E48\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A",
  STEP_3_DESC: "\u0E19\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E23\u0E27\u0E21\u0E08\u0E32\u0E01 3 \u0E41\u0E21\u0E15\u0E0A\u0E4C. \u0E0A\u0E19\u0E30\u0E41\u0E15\u0E49\u0E21 \u0E44\u0E15\u0E48\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A.",
  NO_CARD_TITLE: "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E4C\u0E14",
  NO_CARD_BODY: "\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E1E\u0E23\u0E38\u0E48\u0E07\u0E19\u0E35\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E43\u0E2B\u0E21\u0E48.",
  GOAL_LINE_LABEL: "\u0E40\u0E2A\u0E49\u0E19",
  OVER: "\u0E2A\u0E39\u0E07",
  UNDER: "\u0E15\u0E48\u0E33",
  CUTOFF_LABEL: "\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32",
  LOCK_CTA: "\u0E25\u0E47\u0E2D\u0E04\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01",
  CONFIRM_TITLE: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01",
  CONFIRM_BODY: (side, line, odds) => `\u0E04\u0E38\u0E13\u0E40\u0E25\u0E37\u0E2D\u0E01 ${side} ${line} \u0E17\u0E35\u0E48 ${odds}. \u0E43\u0E0A\u0E49\u0E15\u0E31\u0E4B\u0E27\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19 (100 \u0E41\u0E15\u0E49\u0E21). \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49.`,
  CONFIRM_BTN: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19",
  CANCEL_BTN: "\u0E01\u0E25\u0E31\u0E1A",
  LOCKED_TITLE: "\u0E25\u0E47\u0E2D\u0E04\u0E41\u0E25\u0E49\u0E27",
  YOUR_PICK: "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13",
  ODDS_LOCKED: "\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E17\u0E35\u0E48\u0E25\u0E47\u0E2D\u0E04",
  POTENTIAL_PAYOUT: "\u0E23\u0E31\u0E1A\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14",
  COMMUNITY_SPLIT: "\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E0A\u0E38\u0E21\u0E0A\u0E19",
  FIRST_KO: "\u0E40\u0E15\u0E30\u0E41\u0E23\u0E01",
  TOTAL_GOALS: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E23\u0E27\u0E21",
  OVER_NEEDS: (n) => `\u0E2A\u0E39\u0E07\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E35\u0E01 ${n} \u0E1B\u0E23\u0E30\u0E15\u0E39`,
  UNDER_SURVIVES: (n) => `\u0E15\u0E48\u0E33\u0E23\u0E2D\u0E14\u0E16\u0E49\u0E32\u0E23\u0E27\u0E21\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 ${n}`,
  WINNING_SIDE: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E19\u0E33",
  MATCHES_PROGRESS: (done, total) => `${done}/${total} \u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E08\u0E1A`,
  RESULT_TITLE: "\u0E1C\u0E25",
  TOTAL_VS_LINE: "\u0E23\u0E27\u0E21 vs \u0E40\u0E2A\u0E49\u0E19",
  WINNING_SIDE_LABEL: "\u0E1D\u0E31\u0E48\u0E07\u0E0A\u0E19\u0E30",
  YOUR_RESULT: "\u0E1C\u0E25\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13",
  POINTS_EARNED: "\u0E41\u0E15\u0E49\u0E21\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49",
  WON: "\u0E0A\u0E19\u0E30",
  LOST: "\u0E41\u0E1E\u0E49",
  VIEW_LEADERBOARD: "\u0E14\u0E39\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A",
  VOIDED_TITLE: "\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01",
  VOIDED_BODY: "\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01. \u0E04\u0E37\u0E19\u0E41\u0E15\u0E49\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14.",
  LEADERBOARD_TITLE: "\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A",
  WEEKLY_TAB: "\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C",
  SKILL_TAB: "\u0E17\u0E31\u0E01\u0E29\u0E30 (\u0E24\u0E14\u0E39)",
  SKILL_COMING_SOON: "\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E17\u0E31\u0E01\u0E29\u0E30\u0E40\u0E23\u0E47\u0E27\u0E46\u0E19\u0E35\u0E49.",
  DAY_STREAK: (n: number) => `${n} \u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D`,
  PLAYERS_PICKED: (n: number) => `${n} \u0E04\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49`,
  PICK_LOCKED_TITLE: "\u0E25\u0E47\u0E2D\u0E04\u0E41\u0E25\u0E49\u0E27!",
  YOU_PICKED: (side: string, line: number, odds: number) => `\u0E04\u0E38\u0E13\u0E40\u0E25\u0E37\u0E2D\u0E01 ${side} ${line} @ ${odds.toFixed(2)}`,
  PTS_STAKED: "100 \u0E41\u0E15\u0E49\u0E21",
  POTENTIAL_RETURN: (pts: number) => `\u0E23\u0E31\u0E1A\u0E44\u0E14\u0E49: ${pts} \u0E41\u0E15\u0E49\u0E21`,
  HOW_IT_WORKS_TITLE: "\u0E27\u0E34\u0E18\u0E35\u0E40\u0E25\u0E48\u0E19",
  GOT_IT: "\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08",
  NAV_MY_PICKS: "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01",
  NAV_ARCHIVE: "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34",
  NAV_BOARD: "\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A",
  ALL_TIME_TAB: "\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14",
  NO_ENTRIES_WEEK: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49.",
  NO_SETTLED_PICKS: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01.",
  DISCLAIMER: "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E1A\u0E31\u0E19\u0E40\u0E17\u0E34\u0E07\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19.",
  NOT_SPORTSBOOK: "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E40\u0E27\u0E47\u0E1A\u0E1E\u0E19\u0E31\u0E19.",
  SHARE_TG_CTA: "\u0E0A\u0E27\u0E19\u0E41\u0E01\u0E4A\u0E07\u0E21\u0E32\u0E17\u0E32\u0E22\u0E1A\u0E2D\u0E25",
  SHARE_TG_CAPTION: (cardNum: number) => `\u{1F525} Daily Line #${cardNum} \u2014 \u0E17\u0E32\u0E22\u0E2A\u0E39\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E48\u0E33\u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E04\u0E37\u0E19\u0E19\u0E35\u0E49 \u2014 \u0E43\u0E04\u0E23\u0E02\u0E36\u0E49\u0E19 TOP \u0E01\u0E25\u0E38\u0E48\u0E21? \u{1F447}`,
};

const es: DailyLineDict = {
  ...en,
  TAGLINE: "Una l\u00EDnea. M\u00E1s o Menos. Cada d\u00EDa.",
  HOW_IT_WORKS: "Predice si los partidos seleccionados de hoy producir\u00E1n M\u00E1s o Menos goles que la l\u00EDnea. Elige tu lado, sube en la tabla.",
  STEP_1_TITLE: "Revisa la l\u00EDnea",
  STEP_1_DESC: "Elegimos 3 partidos y fijamos una l\u00EDnea de goles combinada con cuotas reales.",
  STEP_2_TITLE: "Haz tu elecci\u00F3n",
  STEP_2_DESC: "M\u00E1s o Menos \u2014 bloquea antes del cierre. 100 pts por tarjeta.",
  STEP_3_TITLE: "Mira y sube",
  STEP_3_DESC: "Los goles cuentan en los 3 partidos. Gana puntos, sube en la tabla.",
  NO_CARD_TITLE: "No hay tarjeta hoy",
  NO_CARD_BODY: "Vuelve ma\u00F1ana para la nueva tarjeta de Daily Line.",
  GOAL_LINE_LABEL: "L\u00EDnea",
  OVER: "M\u00E1s",
  UNDER: "Menos",
  CUTOFF_LABEL: "Cierre",
  LOCK_CTA: "Bloquear elecci\u00F3n",
  CONFIRM_TITLE: "Confirmar elecci\u00F3n",
  CONFIRM_BODY: (side, line, odds) => `Eliges ${side} ${line} a ${odds}. Usa tu boleto diario (100 pts). No se puede cambiar.`,
  CONFIRM_BTN: "Confirmar",
  CANCEL_BTN: "Volver",
  LOCKED_TITLE: "Elecci\u00F3n bloqueada",
  YOUR_PICK: "Tu elecci\u00F3n",
  ODDS_LOCKED: "Cuota bloqueada",
  POTENTIAL_PAYOUT: "Pago potencial",
  COMMUNITY_SPLIT: "Divisi\u00F3n comunitaria",
  FIRST_KO: "Primer saque",
  TOTAL_GOALS: "Goles totales",
  OVER_NEEDS: (n) => `M\u00E1s necesita ${n} gol${n === 1 ? "" : "es"} m\u00E1s`,
  UNDER_SURVIVES: (n) => `Menos sobrevive si el total es \u2264 ${n}`,
  WINNING_SIDE: "Ganando actualmente",
  MATCHES_PROGRESS: (done, total) => `${done}/${total} partidos completos`,
  RESULT_TITLE: "Resultado",
  TOTAL_VS_LINE: "Total vs L\u00EDnea",
  WINNING_SIDE_LABEL: "Lado ganador",
  YOUR_RESULT: "Tu resultado",
  POINTS_EARNED: "Puntos ganados",
  WON: "Ganaste",
  LOST: "Perdiste",
  VIEW_LEADERBOARD: "Ver tabla",
  VOIDED_TITLE: "Tarjeta anulada",
  VOIDED_BODY: "Esta tarjeta fue anulada. Todos los puntos han sido reembolsados.",
  LEADERBOARD_TITLE: "Tabla de posiciones",
  WEEKLY_TAB: "Semanal",
  SKILL_TAB: "Habilidad (Temporada)",
  SKILL_COMING_SOON: "Tabla de habilidades pr\u00F3ximamente.",
  DAY_STREAK: (n: number) => `${n} d\u00EDas seguidos`,
  PLAYERS_PICKED: (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"} hoy`,
  PICK_LOCKED_TITLE: "\u00A1Elecci\u00F3n bloqueada!",
  YOU_PICKED: (side: string, line: number, odds: number) => `Elegiste ${side} ${line} @ ${odds.toFixed(2)}`,
  PTS_STAKED: "100 pts apostados",
  POTENTIAL_RETURN: (pts: number) => `Retorno potencial: ${pts} pts`,
  HOW_IT_WORKS_TITLE: "C\u00F3mo funciona",
  GOT_IT: "Entendido",
  NAV_MY_PICKS: "Mis picks",
  NAV_ARCHIVE: "Archivo",
  NAV_BOARD: "Tabla",
  ALL_TIME_TAB: "Hist\u00F3rico",
  NO_ENTRIES_WEEK: "Sin entradas esta semana.",
  NO_SETTLED_PICKS: "Sin picks resueltos a\u00FAn.",
  DISCLAIMER: "Solo entretenimiento. No es asesor\u00EDa financiera.",
  NOT_SPORTSBOOK: "No es una casa de apuestas.",
  SHARE_TG_CTA: "Reta a tu grupo",
  SHARE_TG_CAPTION: (cardNum: number) => `\u{1F525} Daily Line #${cardNum} \u2014 \u00BFM\u00E1s o Menos goles en los partidos de hoy? \u00BFQui\u00E9n lidera el grupo? \u{1F447}`,
};

const dicts: Record<Lang, DailyLineDict> = { en, vi, th, es };

/** Get Daily Line strings for a given language. */
export function getDailyLineDict(lang: Lang): DailyLineDict {
  return dicts[lang] ?? en;
}

/** Default English strings (backward compat for components not yet i18n-aware). */
export const S = en;
