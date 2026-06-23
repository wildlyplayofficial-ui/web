/**
 * Pure parser for the /pick command message. String in, ParsedPick or error list out.
 * No I/O, no dates other than the injected `now` (for kickoff-in-future check).
 */

export type Market = 'ah' | 'ou' | '1x2' | 'btts' | 'other';
export type Confidence = 'low' | 'medium' | 'high';
const CONFIDENCE_VALUES: readonly string[] = ['low', 'medium', 'high'];

/** T3: Primary Edge — choose exactly one. */
export type PrimaryEdge =
  | 'PRICE_VALUE' | 'TACTICAL_MATCHUP' | 'TEAM_NEWS'
  | 'SCHEDULE_FATIGUE' | 'MOTIVATION' | 'LIVE_STATE' | 'MARKET_MOVEMENT';
const EDGE_VALUES = new Set<string>([
  'PRICE_VALUE', 'TACTICAL_MATCHUP', 'TEAM_NEWS',
  'SCHEDULE_FATIGUE', 'MOTIVATION', 'LIVE_STATE', 'MARKET_MOVEMENT',
]);

/** T4: Supporting Evidence — up to two. */
export type SupportingEvidence =
  | 'RECENT_FORM' | 'HISTORICAL_DATA' | 'EXPECTED_GOALS' | 'CONFIRMED_LINEUP'
  | 'HOME_AWAY_SPLIT' | 'SET_PIECES' | 'DEFENSIVE_WEAKNESS' | 'PUBLIC_SENTIMENT'
  | 'SHOT_CHANCE_QUALITY' | 'INJURY_SUSPENSION';
const EVIDENCE_VALUES = new Set<string>([
  'RECENT_FORM', 'HISTORICAL_DATA', 'EXPECTED_GOALS', 'CONFIRMED_LINEUP',
  'HOME_AWAY_SPLIT', 'SET_PIECES', 'DEFENSIVE_WEAKNESS', 'PUBLIC_SENTIMENT',
  'SHOT_CHANCE_QUALITY', 'INJURY_SUSPENSION',
]);

export interface ParsedPick {
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffUtc: string; // ISO 8601
  market: Market;
  selection: string;
  line: number | null;
  odds: number;
  stake: number;
  thesis: string;
  /** odds-api.io event id; null = auto-settlement off, manual /score only. */
  eventId: number | null;
  /** Running pick (12/6): score when the bet was placed in-play. Null = pre-match pick. */
  publishScoreHome: number | null;
  publishScoreAway: number | null;
  /** Trust anchor (20/6): pre-registered confidence level. Null = not provided. */
  confidence: Confidence | null;
  /** T3: Primary reason for the pick. Required. */
  primaryEdge: PrimaryEdge | null;
  /** T4: Up to 2 supporting evidence tags. */
  supportingEvidence: SupportingEvidence[];
}

export type ParseResult =
  | { ok: true; pick: ParsedPick }
  | { ok: false; errors: string[] };

const MARKETS: readonly Market[] = ['ah', 'ou', '1x2', 'btts', 'other'];
const KNOWN_KEYS = new Set([
  'match', 'league', 'kickoff', 'market', 'selection',
  'line', 'odds', 'stake', 'thesis', 'event', 'score', 'confidence',
  'edge', 'evidence',
]);

export function parsePick(text: string, now: Date = new Date()): ParseResult {
  const errors: string[] = [];
  const fields = new Map<string, string>();
  let thesis: string | null = null;

  const lines = text.replace(/^\s*\/pick(@\w+)?/, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (!m) {
      if (lines[i].trim() !== '') errors.push(`unrecognized line: "${lines[i].trim()}"`);
      continue;
    }
    const key = m[1].toLowerCase();
    if (!KNOWN_KEYS.has(key)) {
      errors.push(`unknown field: "${key}"`);
      continue;
    }
    if (key === 'thesis') {
      // thesis is free text: rest of this line + all remaining lines
      thesis = [m[2], ...lines.slice(i + 1)].join('\n').trim();
      break;
    }
    if (fields.has(key)) errors.push(`duplicate field: "${key}"`);
    fields.set(key, m[2].trim());
  }

  // match → home/away
  let homeTeam = '';
  let awayTeam = '';
  const match = fields.get('match');
  if (!match) {
    errors.push('missing field: match');
  } else {
    const teams = match.split(/\s+vs\.?\s+/i);
    if (teams.length === 2 && teams[0].trim() && teams[1].trim()) {
      homeTeam = teams[0].trim();
      awayTeam = teams[1].trim();
    } else {
      errors.push(`match must be "<home> vs <away>", got "${match}"`);
    }
  }

  const league = fields.get('league') ?? '';
  if (!league) errors.push('missing field: league');

  // score (optional) — present = running pick, placed in-play (Nick, 12/6)
  let publishScoreHome: number | null = null;
  let publishScoreAway: number | null = null;
  const scoreRaw = fields.get('score');
  const isRunning = scoreRaw !== undefined && scoreRaw !== '';
  if (isRunning) {
    const sm = scoreRaw.match(/^(\d+)-(\d+)$/);
    if (sm) {
      publishScoreHome = Number(sm[1]);
      publishScoreAway = Number(sm[2]);
    } else {
      errors.push(`score must be "<home>-<away>" (e.g. "1-0"), got "${scoreRaw}"`);
    }
  }

  // kickoff — ISO datetime, in the future (unless running: the match already started)
  let kickoffUtc = '';
  const kickoffRaw = fields.get('kickoff');
  if (!kickoffRaw) {
    errors.push('missing field: kickoff');
  } else {
    const d = new Date(kickoffRaw);
    if (Number.isNaN(d.getTime())) errors.push(`kickoff is not a valid ISO datetime: "${kickoffRaw}"`);
    else if (!isRunning && d.getTime() <= now.getTime()) errors.push(`kickoff must be in the future: "${kickoffRaw}"`);
    else kickoffUtc = d.toISOString();
  }

  // market
  const marketRaw = (fields.get('market') ?? '').toLowerCase();
  const market = MARKETS.includes(marketRaw as Market) ? (marketRaw as Market) : null;
  if (!fields.get('market')) errors.push('missing field: market');
  else if (!market) errors.push(`market must be one of ${MARKETS.join('/')}, got "${marketRaw}"`);

  const selection = fields.get('selection') ?? '';
  if (!selection) errors.push('missing field: selection');

  // line — required for ah/ou, forbidden for 1x2/btts, optional for other
  let line: number | null = null;
  const lineRaw = fields.get('line');
  if (lineRaw !== undefined && lineRaw !== '') {
    const n = Number(lineRaw);
    if (Number.isNaN(n)) errors.push(`line is not a number: "${lineRaw}"`);
    else line = n;
  }
  if (market === 'ah' || market === 'ou') {
    if (line === null) errors.push(`line is required for market "${market}"`);
  } else if (market === '1x2' || market === 'btts') {
    if (lineRaw !== undefined && lineRaw !== '') {
      errors.push(`line must be omitted for market "${market}"`);
      line = null;
    }
  }

  // odds 1.01–100
  let odds = 0;
  const oddsRaw = fields.get('odds');
  if (!oddsRaw) {
    errors.push('missing field: odds');
  } else {
    const n = Number(oddsRaw);
    if (Number.isNaN(n)) errors.push(`odds is not a number: "${oddsRaw}"`);
    else if (n < 1.01 || n > 100) errors.push(`odds must be between 1.01 and 100, got ${n}`);
    else odds = n;
  }

  // stake 0.25–5 in 0.25 steps
  let stake = 0;
  const stakeRaw = fields.get('stake');
  if (!stakeRaw) {
    errors.push('missing field: stake');
  } else {
    const n = Number(stakeRaw);
    if (Number.isNaN(n)) errors.push(`stake is not a number: "${stakeRaw}"`);
    else if (n < 0.25 || n > 5) errors.push(`stake must be between 0.25 and 5 units, got ${n}`);
    else if ((n * 4) % 1 !== 0) errors.push(`stake must be in 0.25 steps, got ${n}`);
    else stake = n;
  }

  // event (optional) — odds-api.io event id
  let eventId: number | null = null;
  const eventRaw = fields.get('event');
  if (eventRaw !== undefined && eventRaw !== '') {
    if (/^\d+$/.test(eventRaw)) eventId = Number(eventRaw);
    else errors.push(`event must be a numeric odds-api event id, got "${eventRaw}"`);
  }

  // confidence (mandatory — Trust Anchor §5, Nick 20/6)
  let confidence: Confidence | null = null;
  const confidenceRaw = fields.get('confidence');
  if (!confidenceRaw) {
    errors.push('missing field: confidence (LOW / MEDIUM / HIGH)');
  } else {
    const val = confidenceRaw.toLowerCase();
    if (CONFIDENCE_VALUES.includes(val)) {
      confidence = val as Confidence;
    } else {
      errors.push(`confidence must be LOW / MEDIUM / HIGH, got "${confidenceRaw}"`);
    }
  }

  if (thesis === null || thesis === '') errors.push('missing field: thesis');

  // T3: Primary Edge (required)
  let primaryEdge: PrimaryEdge | null = null;
  const edgeRaw = fields.get('edge');
  if (!edgeRaw) {
    errors.push('missing field: edge (PRICE_VALUE / TACTICAL_MATCHUP / TEAM_NEWS / SCHEDULE_FATIGUE / MOTIVATION / LIVE_STATE / MARKET_MOVEMENT)');
  } else {
    const val = edgeRaw.toUpperCase().replace(/[\s/]+/g, '_');
    if (EDGE_VALUES.has(val)) {
      primaryEdge = val as PrimaryEdge;
    } else {
      errors.push(`edge must be one of: ${[...EDGE_VALUES].join(', ')} — got "${edgeRaw}"`);
    }
  }

  // T4: Supporting Evidence (optional, max 2)
  const supportingEvidence: SupportingEvidence[] = [];
  const evidenceRaw = fields.get('evidence');
  if (evidenceRaw) {
    const items = evidenceRaw.split(',').map((s) => s.trim().toUpperCase().replace(/[\s/]+/g, '_'));
    for (const item of items) {
      if (!EVIDENCE_VALUES.has(item)) {
        errors.push(`evidence tag "${item}" not recognized — valid: ${[...EVIDENCE_VALUES].join(', ')}`);
      } else {
        supportingEvidence.push(item as SupportingEvidence);
      }
    }
    if (supportingEvidence.length > 2) {
      errors.push('evidence: max 2 tags allowed');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    pick: {
      homeTeam, awayTeam, league, kickoffUtc,
      market: market as Market, selection, line, odds, stake,
      thesis: thesis as string, eventId, publishScoreHome, publishScoreAway,
      confidence, primaryEdge, supportingEvidence,
    },
  };
}
