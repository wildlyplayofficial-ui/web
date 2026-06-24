/**
 * "The Booth" — AI generation pipeline for dual-persona live football commentary.
 * Sonny (Strategist) and Cole (Skeptic) banter about match events.
 * One Sonnet call generates EN → then Haiku translates to VI/TH/ES.
 * Never throws — returns null on failure.
 */
import type { BoothEventType } from './booth-detector';
import { log } from './log';

interface BoothLine { who: 'sonny' | 'cole'; text: string; }

export interface BoothOutput {
  lines_en: BoothLine[];
  lines_vi: BoothLine[] | null;
  lines_th: BoothLine[] | null;
  lines_es: BoothLine[] | null;
  lead_voice: 'sonny' | 'cole';
  model: string;
}

interface BoothGenDeps {
  apiKey: string;
  sonnetModel?: string;
  haikuModel?: string;
}

interface PickContext {
  selection: string;
  odds: number;
  market: string;
  line: number | null;
  stake: number;
  thesis: string;
  status: string;
}

interface EventContext {
  type: BoothEventType;
  minute: string;
  player: string | null;
  assist: string | null;
  homeAway: 'h' | 'a' | null;
  homeTeam: string;
  awayTeam: string;
  score: { home: number; away: number };
}

const DEFAULT_SONNET = 'claude-sonnet-4-6';
const DEFAULT_HAIKU = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT = `You are "The Booth" — WildlyPlay's two-person live football commentary duo. Write a short banter exchange between two analysts about ONE match event. NEVER give betting tips; NEVER tell anyone to bet/take/double a position. NEVER claim an edge or that WildlyPlay beats the bookmaker. NEVER invent events/scores/stats/xG — use ONLY the facts provided. Stay calibrated: a coin-flip is a coin-flip.
Voices:
🟢 SONNY (Strategist, optimist): reads momentum/upside/what's still open. Warm, controlled-enthusiasm, lightly self-deprecating about his optimism; concedes cleanly when momentum doesn't convert. ROTATE openers — use a DIFFERENT one each time: "Glass half-full here…", "What I'm seeing is…", "Hold on, there's still…", "Don't bury this lot yet…". NEVER repeat the same opener or phrase across events. When mentioning time remaining, CALCULATE from the event minute (e.g. event at 69' = ~21 minutes left, NOT "12 minutes").
🔴 COLE (Skeptic, risk/price realist): reads what the board already priced; calls coin-flips; enforces no-hindsight. Dry, deadpan, NOT a doomer; concedes when a real verified angle exists. ROTATE tics — vary between: "Board priced that already.", "That's variance, not edge.", "Ask again at the 90th.", deadpan one-liners. NEVER repeat the same tic across events.
Soul = two-way concede + self-awareness → humour emerges from real tension, never forced jokes.
If a Curator pick is provided: tie the banter to the Curator's pre-match READ (call it "the read" or "the lean", NOT "thesis" — that's a Curator-formal term, the Booth is casual). Pick winning → honest, no victory-lap, stay HUMBLE (Cole will poke any victory-lap). Pick losing → honest, no spin/double-down (Cole enforces). NEVER re-tip.
BANNED WORDS (do not use even in negation — rephrase instead): lock, guaranteed, smash, banker, sure thing, slam.
Output: a 2–3 line exchange. ONE analyst LEADS (per lead_voice) + ONE response, then STOP. Each line ≤ ~25 words. Write in ENGLISH — this is the SOURCE generation. Return JSON: {"lines":[{"who":"sonny|cole","text":"..."}]}`;

// -- Few-shot examples by event type (spec §8c) --
const FEW_SHOTS: Partial<Record<BoothEventType, string>> = {
  goal: `Example (goal confirms): {"lines":[{"who":"cole","text":"Board priced that already. Home favourite converts — nothing the line didn't see."},{"who":"sonny","text":"Fair. But the speed of that build-up? That's live momentum."}]}
Example (goal subverts): {"lines":[{"who":"sonny","text":"Okay, the underdog's got teeth. Love it — match just came alive."},{"who":"cole","text":"One goal doesn't rewrite the price. Ask again at the 90th."}]}`,
  goal_penalty: `Example: {"lines":[{"who":"cole","text":"Penalty converted. That's conversion variance, not a tactical read."},{"who":"sonny","text":"Still changes the scoreboard — and the body language out there."}]}`,
  own_goal: `Example: {"lines":[{"who":"cole","text":"Own goal. That's variance, not a read anyone can claim."},{"who":"sonny","text":"Chaotic, sure — but watch how the trailing side responds now."}]}`,
  red_card: `Example: {"lines":[{"who":"sonny","text":"Red card — the entire game state just shifted. Ten men changes everything."},{"who":"cole","text":"Temper that. Ten-man sides park the bus; it doesn't guarantee goals."}]}`,
  ht: `Example: {"lines":[{"who":"cole","text":"Half-time. Thesis was pressing high — the scoreline says it's working so far."},{"who":"sonny","text":"Second half's a different animal. But the shape is there."}]}`,
  ft: `Example: {"lines":[{"who":"cole","text":"Full-time. The result speaks for itself — thesis held up where it mattered."},{"who":"sonny","text":"Honest accounting. On to the next one."}]}`,
};

/** Does this goal confirm the match expectation? Determines Sonny vs Cole lead.
 *  "Confirm" = favourite scores (as priced) → Cole.
 *  "Subvert" = underdog scores (upset/against run) → Sonny.
 *  For Over picks: goal that hits the line → Cole; earlier goals → Sonny (game opening). */
function goalConfirmsThesis(event: EventContext, pick: PickContext): boolean {
  const sel = pick.selection.toLowerCase();
  const isOver = sel.includes('over');

  if (isOver) {
    // For Over: the goal that HITS the line confirms thesis (Cole)
    // Earlier goals = game opening up (Sonny leads — more exciting, momentum)
    const totalGoals = event.score.home + event.score.away;
    const line = pick.line ?? 2.5;
    return totalGoals > line; // at/above line = thesis confirmed
  }

  // For side bets: check if scoring side = picked team
  const homeInSel = event.homeTeam.toLowerCase().split(/\s+/).some((w) => w.length > 2 && sel.includes(w));
  const awayInSel = event.awayTeam.toLowerCase().split(/\s+/).some((w) => w.length > 2 && sel.includes(w));
  if (homeInSel && event.homeAway === 'h') return true;
  if (awayInSel && event.homeAway === 'a') return true;
  // Opponent scores = subvert
  if (homeInSel && event.homeAway === 'a') return false;
  if (awayInSel && event.homeAway === 'h') return false;
  return false;
}

/** Determine who leads the exchange (spec §6A). */
function pickLeadVoice(event: EventContext, pick: PickContext): 'sonny' | 'cole' {
  switch (event.type) {
    case 'goal':
      return goalConfirmsThesis(event, pick) ? 'cole' : 'sonny';
    case 'goal_penalty':
    case 'own_goal':
      return 'cole';
    case 'red_card':
      return 'sonny';
    case 'ht':
      return goalConfirmsThesis(event, pick) ? 'cole' : 'sonny';
    case 'ft':
      return 'cole';
    default:
      return 'cole';
  }
}

function describeEvent(event: EventContext): string {
  const { type, minute, player, homeAway } = event;
  const side = homeAway === 'h' ? event.homeTeam : homeAway === 'a' ? event.awayTeam : 'Unknown';
  switch (type) {
    case 'goal': return `GOAL by ${player ?? 'unknown'} (${side}) at ${minute}'`;
    case 'goal_penalty': return `PENALTY GOAL by ${player ?? 'unknown'} (${side}) at ${minute}'`;
    case 'own_goal': return `OWN GOAL by ${player ?? 'unknown'} (${side}) at ${minute}'`;
    case 'red_card': return `RED CARD to ${player ?? 'unknown'} (${side}) at ${minute}'`;
    case 'ht': return `HALF-TIME: ${event.score.home}-${event.score.away}`;
    case 'ft': return `FULL-TIME: ${event.score.home}-${event.score.away}`;
  }
}

function buildUserPrompt(event: EventContext, pick: PickContext, thesis: string, leadVoice: 'sonny' | 'cole'): string {
  const shots = FEW_SHOTS[event.type] ?? '';
  return `${shots ? shots + '\n\n' : ''}MATCH: ${event.homeTeam} vs ${event.awayTeam} (${event.minute}', score ${event.score.home}-${event.score.away})
PRE-MATCH THESIS (Curator): ${thesis}
PICK: ${pick.selection} @ ${pick.odds} (${pick.market}, ${pick.stake}u)
EVENT (feed-confirmed): ${describeEvent(event)}
LEAD VOICE: ${leadVoice}
Write the Booth exchange now.`;
}

/** Call Anthropic Messages API — returns raw text or null (never throws). */
async function callAnthropic(
  apiKey: string, model: string, system: string, userMsg: string, maxTokens: number, label: string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn(`booth-gen ${label}: API ${res.status} — ${body.slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      log.warn(`booth-gen ${label}: empty response`);
      return null;
    }
    return text.trim();
  } catch (err) {
    log.warn(`booth-gen ${label}: failed`, err);
    return null;
  }
}

/** Extract JSON from model output (may be wrapped in markdown fences). */
function extractJson(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const toParse = fenced ? fenced[1].trim() : raw.trim();
  try { return JSON.parse(toParse); } catch { return null; }
}

function parseLines(raw: string): BoothLine[] | null {
  const obj = extractJson(raw) as any;
  if (!obj?.lines || !Array.isArray(obj.lines)) return null;
  const lines: BoothLine[] = [];
  for (const l of obj.lines) {
    if ((l.who === 'sonny' || l.who === 'cole') && typeof l.text === 'string' && l.text.trim()) {
      lines.push({ who: l.who, text: l.text.trim() });
    }
  }
  return lines.length >= 2 ? lines : null;
}

const TRANSLATE_GLOSSARY: Record<string, string> = {
  Vietnamese: 'thesis/read=nhận định/đọc kèo (NOT luận án/luận văn), board=nhà cái, coin-flip=may rủi/5-5, Glass half-full=Lạc quan, stake=mức cược, honest call=nhận định thẳng thắn, crow/brag=khoe khoang',
  Thai: 'thesis/read=การวิเคราะห์/แนวคิด (NOT วิทยานิพนธ์), board=เจ้ามือ, coin-flip=เสี่ยงดวง, Glass half-full=มองโลกในแง่ดี, stake=เงินเดิมพัน, crow/brag=อวดอ้าง',
  Spanish: 'thesis/read=análisis/lectura (NOT tesis académica), board=casa de apuestas, coin-flip=cara o cruz, Glass half-full=Vaso medio lleno, stake=apuesta',
};

/** Translate via Sonnet with betting glossary. Returns translated lines or null. */
async function translateLines(
  apiKey: string, model: string, lines: BoothLine[], targetLang: string,
): Promise<BoothLine[] | null> {
  const glossary = TRANSLATE_GLOSSARY[targetLang] ?? '';
  const prompt = `You are translating football betting/tipster commentary for WildlyPlay. Translate the following JSON lines to ${targetLang}. Keep "who" labels exactly as-is.

CRITICAL GLOSSARY (use these translations, NOT literal/academic equivalents):
${glossary}

Preserve ALL numbers, odds, percentages, team names, player names EXACTLY. Translate idioms by MEANING not literally. Return ONLY valid JSON: {"lines":[{"who":"...","text":"..."}]}

${JSON.stringify({ lines })}`;
  const raw = await callAnthropic(apiKey, model, '', prompt, 400, `translate-${targetLang}`);
  if (!raw) return null;
  return parseLines(raw);
}

export async function generateBoothExchange(
  deps: BoothGenDeps,
  event: EventContext,
  pick: PickContext,
  thesis: string,
): Promise<BoothOutput | null> {
  const sonnetModel = deps.sonnetModel ?? DEFAULT_SONNET;
  const haikuModel = deps.haikuModel ?? DEFAULT_HAIKU;
  const leadVoice = pickLeadVoice(event, pick);

  // Step 1: Generate EN exchange via Sonnet
  const userPrompt = buildUserPrompt(event, pick, thesis, leadVoice);
  const raw = await callAnthropic(deps.apiKey, sonnetModel, SYSTEM_PROMPT, userPrompt, 400, 'en-gen');
  if (!raw) return null;

  const linesEn = parseLines(raw);
  if (!linesEn) {
    log.warn('booth-gen: failed to parse EN lines from model output');
    return null;
  }

  // Step 2: Translate to VI/TH/ES in parallel via Sonnet (glossary-aware, not Haiku)
  const [linesVi, linesTh, linesEs] = await Promise.all([
    translateLines(deps.apiKey, sonnetModel, linesEn, 'Vietnamese'),
    translateLines(deps.apiKey, sonnetModel, linesEn, 'Thai'),
    translateLines(deps.apiKey, sonnetModel, linesEn, 'Spanish'),
  ]);

  return {
    lines_en: linesEn,
    lines_vi: linesVi,
    lines_th: linesTh,
    lines_es: linesEs,
    lead_voice: leadVoice,
    model: sonnetModel,
  };
}
