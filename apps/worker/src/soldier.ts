/**
 * "Đàn lính" — free-tier LLM (Groq) for muscle work: translations, summaries.
 * Same contract as callClaude: NEVER throws, null on any failure, so callers
 * can fall back to Claude without extra handling. Peter 22/8: soldiers must
 * never be able to stall the worker — hard 15s timeout.
 */
import { log } from './log';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_SOLDIER_MODEL = 'openai/gpt-oss-120b';
const TIMEOUT_MS = 15_000;

export function soldierEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function callSoldier(
  prompt: string,
  context: string,
  maxTokens = 1000,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = process.env.SOLDIER_MODEL ?? DEFAULT_SOLDIER_MODEL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      log.warn(`soldier (${model}) HTTP ${res.status} for ${context}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? null;
    if (text) log.info(`soldier (${model}) ok for ${context} — ${data.usage?.total_tokens ?? '?'} tokens`);
    return text;
  } catch (err) {
    log.warn(`soldier (${model}) failed for ${context}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
