/**
 * Pure parser for the /noplay command. Documents why the Curator is
 * passing on a match — no edge, price too short, etc.
 * String in, ParsedNoPlay or error list out.
 */
import type { PickAuthor } from './parse-pick';

export type NoPlayReason =
  | 'NO_EDGE'
  | 'PRICE_TOO_SHORT'
  | 'VARIANCE_TOO_HIGH'
  | 'TEAM_NEWS_UNCLEAR'
  | 'MARKET_EFFICIENT'
  | 'SIGNAL_UNSTABLE'
  | 'VALUE_GONE';

const VALID_REASONS = new Set<NoPlayReason>([
  'NO_EDGE', 'PRICE_TOO_SHORT', 'VARIANCE_TOO_HIGH',
  'TEAM_NEWS_UNCLEAR', 'MARKET_EFFICIENT',
  'SIGNAL_UNSTABLE', 'VALUE_GONE',
]);

export interface ParsedNoPlay {
  homeTeam: string;
  awayTeam: string;
  league: string;
  reason: NoPlayReason;
  watching: string | null;
  note: string | null;
  /** Tiered Picks firewall (§12): who this no-play decision belongs to. Default 'curator'. */
  author: PickAuthor;
}

export type ParseNoPlayResult =
  | { ok: true; noplay: ParsedNoPlay }
  | { ok: false; errors: string[] };

const KNOWN_KEYS = new Set(['match', 'league', 'reason', 'watching', 'note', 'author']);
const AUTHOR_VALUES: readonly string[] = ['curator', 'scout'];

export function parseNoPlay(text: string): ParseNoPlayResult {
  const errors: string[] = [];
  const fields = new Map<string, string>();
  let note: string | null = null;

  const lines = text.replace(/^\s*\/noplay(@\w+)?/, '').split('\n');
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
    if (key === 'note') {
      note = [m[2], ...lines.slice(i + 1)].join('\n').trim();
      break;
    }
    if (fields.has(key)) errors.push(`duplicate field: "${key}"`);
    fields.set(key, m[2].trim());
  }

  // match -> home/away
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

  const league = fields.get('league') ?? 'FIFA World Cup 2026';

  // reason — must be a valid NoPlayReason
  let reason: NoPlayReason = 'NO_EDGE';
  const reasonRaw = fields.get('reason');
  if (!reasonRaw) {
    errors.push('missing field: reason');
  } else {
    const upper = reasonRaw.toUpperCase().replace(/\s+/g, '_') as NoPlayReason;
    if (!VALID_REASONS.has(upper)) {
      errors.push(`reason must be one of: ${[...VALID_REASONS].join(', ')} — got "${reasonRaw}"`);
    } else {
      reason = upper;
    }
  }

  const watching = fields.get('watching')?.trim() || null;

  // author (optional) — Tiered Picks firewall (§12): curator (default) or scout.
  let author: PickAuthor = 'curator';
  const authorRaw = fields.get('author');
  if (authorRaw !== undefined && authorRaw !== '') {
    const val = authorRaw.toLowerCase();
    if (AUTHOR_VALUES.includes(val)) author = val as PickAuthor;
    else errors.push(`author must be curator/scout, got "${authorRaw}"`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    noplay: { homeTeam, awayTeam, league, reason, watching, note: note || null, author },
  };
}
