/**
 * Pure parser for the /watching command. Simpler than /pick — only match, league,
 * kickoff and an optional note. String in, ParsedWatching or error list out.
 */
import type { PickAuthor } from './parse-pick';

export interface ParsedWatching {
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffUtc: string; // ISO 8601
  note: string | null;
  /** Hand-written one-sentence card hook (R5). Card-only — never auto-filled from note/article. */
  reason: string | null;
  /** Tiered Picks firewall (§12): who this watching entry belongs to. Default 'curator'. */
  author: PickAuthor;
}

const AUTHOR_VALUES: readonly string[] = ['curator', 'scout'];

export type ParseWatchingResult =
  | { ok: true; watching: ParsedWatching }
  | { ok: false; errors: string[] };

const KNOWN_KEYS = new Set(['match', 'league', 'kickoff', 'reason', 'note', 'author']);

export function parseWatching(text: string, now: Date = new Date()): ParseWatchingResult {
  const errors: string[] = [];
  const fields = new Map<string, string>();
  let note: string | null = null;

  const lines = text.replace(/^\s*\/watching(@\w+)?/, '').split('\n');
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
      // note is free text: rest of this line + all remaining lines
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

  // kickoff — ISO datetime, must be in the future
  let kickoffUtc = '';
  const kickoffRaw = fields.get('kickoff');
  if (!kickoffRaw) {
    errors.push('missing field: kickoff');
  } else {
    const d = new Date(kickoffRaw);
    if (Number.isNaN(d.getTime())) errors.push(`kickoff is not a valid ISO datetime: "${kickoffRaw}"`);
    else if (d.getTime() <= now.getTime()) errors.push(`kickoff must be in the future: "${kickoffRaw}"`);
    else kickoffUtc = d.toISOString();
  }

  const reason = fields.get('reason')?.trim() || null;

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
    watching: { homeTeam, awayTeam, league, kickoffUtc, note: note || null, reason, author },
  };
}
