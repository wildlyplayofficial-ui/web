/**
 * Buzz v2: Community sentiment snapshots for watched matches.
 * Generates AI-powered sentiment summaries in 4 languages (en/vi/th/es),
 * stored as a history array so the web UI can show trends over time.
 * A buzz failure must NEVER break the watching pipeline — every path logs and returns.
 */
import { callClaude } from './recap';
import type { Store, WatchingRow } from './store';
import { log } from './log';

export interface BuzzSnapshot {
  timestamp: string;
  sentiment_pct: number;
  lean_label: Record<BuzzLang, string>;
  themes: Record<BuzzLang, string[]>;
  confidence: string;
  sources?: string[];
}

type BuzzLang = 'en' | 'vi' | 'th' | 'es';

const BUZZ_MODEL = 'claude-haiku-4-5-20251001';
const BUZZ_MAX_TOKENS = 1200;
const BUZZ_INTERVAL_MS = 3 * 60 * 60_000; // 3 hours
const DEDUP_MIN_MS = 2 * 60 * 60_000; // 2 hours
const PRE_KICKOFF_WINDOW_MS = 2 * 60 * 60_000; // 1-2h before kickoff

export interface BuzzDeps {
  store: Store;
  env: { apiKey: string | undefined; model?: string };
  revalidate?: (tags: string[]) => Promise<void>;
}

/** Fetch real forum/community snippets via Serper (Google Search API). Returns snippets + source domains. */
async function searchCommunityBuzz(home: string, away: string): Promise<{ snippets: string; sources: string[] }> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return { snippets: '', sources: [] };
  try {
    const queries = [
      `${home} vs ${away} prediction forum OR reddit OR site:covers.com OR site:asianbookie.com`,
      `${home} vs ${away} tips betting community site:bettingadvice.com OR site:olbg.com OR site:voz.vn OR site:cadovn.com`,
    ];
    const snippets: string[] = [];
    const sourceSet = new Set<string>();
    for (const q of queries) {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 5 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const r of (data.organic ?? [])) {
        if (r.snippet) snippets.push(r.snippet);
        if (r.link) {
          try {
            const host = new URL(r.link).hostname.replace('www.', '');
            // Filter out media/non-forum sites — keep only community sources
            const BLOCKED = ['youtube.com', 'si.com', 'espn.com', 'bbc.com', 'skysports.com', 'goal.com', 'transfermarkt.com', 'google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'];
            if (!BLOCKED.includes(host)) sourceSet.add(host);
          } catch {}
        }
      }
    }
    return { snippets: snippets.slice(0, 8).join('\n'), sources: [...sourceSet].slice(0, 5) };
  } catch {
    return { snippets: '', sources: [] };
  }
}

export function buildBuzzPrompt(w: WatchingRow, communitySnippets: string = ''): string {
  const kickoff = new Date(w.kickoff_utc).toISOString().slice(0, 16).replace('T', ' ');
  return [
    'You are a football community sentiment analyst for WildlyPlay (wildlyplay.com).',
    '',
    `Match: ${w.home_team} vs ${w.away_team}`,
    `League: ${w.league}`,
    `Kickoff: ${kickoff} UTC`,
    w.note ? `Curator note: ${w.note}` : '',
    '',
    communitySnippets ? `Here are REAL community/forum snippets from Google (use these to inform your analysis):\n${communitySnippets}\n` : '',
    'Based on the community snippets above (if provided) and your knowledge of these teams, provide a community buzz summary.',
    '',
    'Output ONLY valid JSON (no markdown fences, no commentary) with this exact shape:',
    '{',
    '  "sentiment_pct": <number 0-100, 50=neutral, >50 favors home>,',
    '  "lean_label": {"en":"<short label>","vi":"<short label>","th":"<short label>","es":"<short label>"},',
    '  "themes": {"en":["<theme1>","<theme2>","<theme3>"],"vi":[...],"th":[...],"es":[...]},',
    '  "confidence": "<low|medium|high>"',
    '}',
    '',
    'Rules:',
    '- lean_label: one short phrase (3-6 words) summarizing the lean, e.g. "Home slight favorites", "Evenly split".',
    '- themes: exactly 3 per language — the top discussion points a bettor community would raise.',
    '- confidence: "low" for obscure matchups, "high" for major fixtures with clear consensus.',
    '- Responsible language: NEVER use "sure win", "guaranteed", or promise profit.',
    '- All 4 languages must be natural — use each language\'s own betting terminology.',
  ].filter(Boolean).join('\n');
}

/** Parse the JSON response from Claude. Returns null on any parse failure. */
export function parseBuzzResponse(text: string): Omit<BuzzSnapshot, 'timestamp'> | null {
  try {
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    const data = JSON.parse(cleaned);

    if (
      typeof data.sentiment_pct !== 'number' ||
      data.sentiment_pct < 0 || data.sentiment_pct > 100 ||
      typeof data.lean_label !== 'object' ||
      typeof data.themes !== 'object' ||
      !['low', 'medium', 'high'].includes(data.confidence)
    ) {
      return null;
    }

    const langs: BuzzLang[] = ['en', 'vi', 'th', 'es'];
    for (const lang of langs) {
      if (typeof data.lean_label[lang] !== 'string') return null;
      if (!Array.isArray(data.themes[lang])) return null;
    }

    return {
      sentiment_pct: Math.round(data.sentiment_pct),
      lean_label: data.lean_label,
      themes: data.themes,
      confidence: data.confidence,
    };
  } catch {
    return null;
  }
}

/** Generate a buzz snapshot for a single watching row. Never throws. */
export async function generateBuzz(
  deps: BuzzDeps,
  watching: WatchingRow,
): Promise<BuzzSnapshot | null> {
  try {
    // Nick 16/6: search real forums via Serper for grounded sentiment
    const { snippets, sources } = await searchCommunityBuzz(watching.home_team, watching.away_team);
    const text = await callClaude(
      { apiKey: deps.env.apiKey, model: deps.env.model ?? BUZZ_MODEL },
      buildBuzzPrompt(watching, snippets),
      `buzz watching ${watching.id}`,
      BUZZ_MAX_TOKENS,
    );
    if (!text) return null;

    const parsed = parseBuzzResponse(text);
    if (!parsed) {
      log.warn(`buzz: failed to parse response for watching ${watching.id}`);
      return null;
    }

    return { timestamp: new Date().toISOString(), sources, ...parsed };
  } catch (err) {
    log.warn(`buzz: generation failed for watching ${watching.id}:`, err);
    return null;
  }
}

/** Check if we should skip this watching row (dedup: last buzz < 2h ago). */
function shouldSkip(buzzHistory: BuzzSnapshot[]): boolean {
  if (buzzHistory.length === 0) return false;
  const last = buzzHistory[buzzHistory.length - 1];
  return Date.now() - new Date(last.timestamp).getTime() < DEDUP_MIN_MS;
}

/** Run buzz generation for all active watching rows. Never throws. */
export async function runBuzzCycle(deps: BuzzDeps): Promise<number> {
  let updated = 0;
  try {
    const active = await deps.store.getActiveWatching();
    if (active.length === 0) return 0;

    for (const watching of active) {
      const history: BuzzSnapshot[] = (watching as any).buzz_history ?? [];
      if (shouldSkip(history)) continue;

      const snapshot = await generateBuzz(deps, watching);
      if (!snapshot) continue;

      const newHistory = [...history, snapshot];
      await deps.store.updateWatching(watching.id, { buzz_history: newHistory });
      updated++;
      log.info(`buzz: updated watching ${watching.id} (${watching.home_team} vs ${watching.away_team}), ${newHistory.length} snapshots`);
    }

    if (updated > 0 && deps.revalidate) {
      void deps.revalidate(['watching']);
    }
  } catch (err) {
    log.warn('buzz: cycle error:', err);
  }
  return updated;
}

/** Check if any watching row has kickoff within 1-2h and needs a pre-kickoff buzz. */
export async function runPreKickoffBuzz(deps: BuzzDeps): Promise<number> {
  let updated = 0;
  try {
    const active = await deps.store.getActiveWatching();
    const now = Date.now();

    for (const watching of active) {
      const kickoff = new Date(watching.kickoff_utc).getTime();
      const timeToKickoff = kickoff - now;

      // Only trigger for matches 1-2h away
      if (timeToKickoff < 0 || timeToKickoff > PRE_KICKOFF_WINDOW_MS) continue;

      const history: BuzzSnapshot[] = (watching as any).buzz_history ?? [];
      // Skip if last buzz was less than 30 min ago (pre-kickoff dedup is tighter)
      if (history.length > 0) {
        const lastAge = now - new Date(history[history.length - 1].timestamp).getTime();
        if (lastAge < 30 * 60_000) continue;
      }

      const snapshot = await generateBuzz(deps, watching);
      if (!snapshot) continue;

      const newHistory = [...history, snapshot];
      await deps.store.updateWatching(watching.id, { buzz_history: newHistory });
      updated++;
      log.info(`buzz: pre-kickoff update for watching ${watching.id} (${watching.home_team} vs ${watching.away_team})`);
    }

    if (updated > 0 && deps.revalidate) {
      void deps.revalidate(['watching']);
    }
  } catch (err) {
    log.warn('buzz: pre-kickoff cycle error:', err);
  }
  return updated;
}

/** Auto-expire watching entries where kickoff passed 3+ hours ago (match finished).
 *  Nick 18/6: trận hết giờ mà watching vẫn active. */
export async function expireFinishedWatching(deps: BuzzDeps): Promise<number> {
  let expired = 0;
  try {
    const active = await deps.store.getActiveWatching();
    const now = Date.now();
    const EXPIRE_AFTER_MS = 2 * 60 * 60_000; // 2 hours after kickoff

    for (const watching of active) {
      const kickoff = new Date(watching.kickoff_utc).getTime();
      if (now - kickoff > EXPIRE_AFTER_MS) {
        await deps.store.expireWatching(watching.id);
        expired++;
        log.info(`buzz: auto-expired watching ${watching.id} (${watching.home_team} vs ${watching.away_team}) — match finished`);
      }
    }

    if (expired > 0 && deps.revalidate) {
      void deps.revalidate(['watching']);
    }
  } catch (err) {
    log.warn('buzz: auto-expire error:', err);
  }
  return expired;
}

/** Start the buzz cron. Returns stop function for graceful shutdown. */
export function startBuzzCron(deps: BuzzDeps): () => void {
  if (!deps.env.apiKey) {
    log.warn('buzz cron: ANTHROPIC_API_KEY unset — disabled');
    return () => {};
  }

  log.info(`buzz cron: started (interval ${BUZZ_INTERVAL_MS / 60_000}min)`);

  const run = async () => {
    await expireFinishedWatching(deps);
    await runBuzzCycle(deps);
    await runPreKickoffBuzz(deps);
  };

  // First run after 45s startup delay (let bot/poller stabilize)
  const startupTimer = setTimeout(() => void run(), 45_000);
  const interval = setInterval(() => void run(), BUZZ_INTERVAL_MS);
  // Pre-kickoff check every 30 min (more frequent than the main 3h cycle)
  // Also expire finished matches on the same 30-min cadence (Nick 18/6)
  const preKickoffInterval = setInterval(() => {
    void expireFinishedWatching(deps);
    void runPreKickoffBuzz(deps);
  }, 30 * 60_000);

  return () => {
    clearTimeout(startupTimer);
    clearInterval(interval);
    clearInterval(preKickoffInterval);
    log.info('buzz cron: stopped');
  };
}
