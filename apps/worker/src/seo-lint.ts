/**
 * SEO uniqueness-gate lint — deterministic checks on AI-generated articles
 * BEFORE they publish. Mirrors booth-lint.ts pattern: code enforcement, not prompt.
 *
 * Catches: thin content, missing unique data, banned vocabulary, template-speak.
 * Articles that fail are flagged (not published) for human review.
 */

export interface SeoLintResult {
  passed: boolean;
  flags: string[];
  wordCount: number;
}

interface LintRule {
  pattern: RegExp;
  category: string;
  description: string;
}

const rules: LintRule[] = [
  // Thin content indicators
  { pattern: /^.{0,300}$/s, category: 'THIN', description: 'Article under 300 chars' },

  // Missing unique data anchor (must reference pick/odds/score/thesis)
  // Inverted: we CHECK for presence below, not absence via regex

  // Banned vocabulary (YMYL/gambling compliance)
  { pattern: /\b(sure win|guaranteed|can't lose|100% accurate)\b/i, category: 'BANNED', description: 'Guaranteed-outcome language' },
  { pattern: /\b(lock|banker|dead cert)\b/i, category: 'BANNED', description: 'Gambling hype slang' },
  { pattern: /\b(bet now|place your bet|sign up.*bookmaker)\b/i, category: 'BANNED', description: 'Betting CTA' },
  { pattern: /\b(beat the book|beat the bookie)\b/i, category: 'BANNED', description: 'Edge claim' },

  // Vietnamese banned
  { pattern: /(ăn chắc|kèo thơm|chắc thắng|100% thắng|kèo ngon ăn)/i, category: 'BANNED', description: 'Vietnamese hype language' },
  // Thai banned
  { pattern: /(แทงเลย|ได้ชัวร์|การันตี|100% ชนะ)/i, category: 'BANNED', description: 'Thai hype language' },

  // Template-speak (generic filler AI loves)
  { pattern: /\bin this article we will\b/i, category: 'TEMPLATE', description: 'Generic opener' },
  { pattern: /\bwithout further ado\b/i, category: 'TEMPLATE', description: 'Filler phrase' },
  { pattern: /\bit's worth noting that\b/i, category: 'TEMPLATE', description: 'Filler phrase' },
  { pattern: /\bin conclusion,?\s/i, category: 'TEMPLATE', description: 'Generic closer' },

  // AI tell phrases
  { pattern: /\bdelve into\b/i, category: 'AI-TELL', description: 'Common AI phrase' },
  { pattern: /\btapestry of\b/i, category: 'AI-TELL', description: 'Common AI phrase' },
  { pattern: /\bunlock the secrets\b/i, category: 'AI-TELL', description: 'Common AI phrase' },
  { pattern: /\blandscape of\b.*\blandscape\b/i, category: 'AI-TELL', description: 'Repeated "landscape"' },
];

/**
 * Script-consistency check (Nick 4/7 item ②): none of the 4 languages we
 * publish in (en/vi/th/es) use CJK, Greek, or Cyrillic script — any codepoint
 * in these ranges is a generation glitch (e.g. "แพรากουย" — Thai text with
 * 2 stray Greek letters "ου", or an earlier CJK glitch in a TH post-mortem).
 * Wordlists can't catch this class of bug since the glyphs read fluently.
 */
const STRAY_SCRIPT_RE = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7A3\u0370-\u03FF\u0400-\u04FF]/;

/** Unique data anchors — at least ONE must be present for the article to pass. */
const DATA_ANCHORS = [
  /\d+\.\d{2}/, // odds (e.g. 2.03, 1.85)
  /\d+-\d+/, // score (e.g. 1-2, 3-0)
  /[+-]\d+(\.\d+)?\s*u/i, // units P/L (e.g. +0.26u, -1u)
  /\b(over|under)\s+\d+\.\d+/i, // over/under line
  /\b[A-Z][a-z]+\s+(vs|v)\s+[A-Z][a-z]+/i, // team matchup
];

/**
 * GEO readiness checks — ensure articles are AI-citation-ready.
 * §4 of SEO Master Guide: atomic answer at top, analysis section present.
 *
 * Scoped to pick/recap/analysis/preview articles only (not no-play/newsroom).
 * Runs on EN body only (VI/TH/ES translations won't have EN markers).
 * WARN mode only — do NOT elevate to BLOCK until false-rate measured on real content.
 */
const GEO_CHECKS = {
  /** First 300 chars must contain a direct factual statement (score, outcome, or thesis). */
  REQUIRE_ATOMIC_ANSWER: (body: string): boolean => {
    const first300 = body.slice(0, 300);
    return /\d+-\d+/.test(first300) ||
      /\d+\.\d{2}/.test(first300) ||
      /\b(won|lost|push|result|beat|defeated|drew)\b/i.test(first300) ||
      /\b(prediction|analysis|preview|recap)\b/i.test(first300);
  },
  /** Body must contain an analysis/opinion section, not just bare facts. */
  REQUIRE_ANALYSIS: (body: string): boolean => {
    const analysisMarkers = [
      /\b(analysis|phân tích|nhận định|đánh giá)\b/i,
      /\b(thesis|read|lean|expect|outlook)\b/i,
      /\b(why|because|factor|reason|key)\b/i,
      /\b(post-mortem|review|takeaway|วิเคราะห์|análisis)\b/i,
    ];
    return analysisMarkers.some((re) => re.test(body));
  },
};

/** Article types that should pass GEO checks — only post-match content with real data. */
const GEO_SCOPED_SLUGS = ['recap-', 'analysis-', 'post-mortem-'];

export function lintSeoArticle(body: string, slug?: string, lang?: string): SeoLintResult {
  const flags: string[] = [];
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  // Word count check — lower threshold for non-EN (Thai/Vietnamese are more compact)
  const isNonEn = lang ? lang !== 'en' : false;
  const minWords = isNonEn ? 40 : 100;
  if (wordCount < minWords) {
    flags.push(`THIN: under ${minWords} words`);
  }

  // Rule checks
  for (const rule of rules) {
    if (rule.category === 'THIN') {
      if (rule.pattern.test(body)) flags.push(`${rule.category}: ${rule.description}`);
    } else {
      const match = body.match(rule.pattern);
      if (match) {
        flags.push(`${rule.category}: ${rule.description} (matched: '${match[0]}')`);
      }
    }
  }

  // Script-consistency check — CJK/Greek/Cyrillic codepoints never belong in en/vi/th/es output.
  const strayScript = body.match(STRAY_SCRIPT_RE);
  if (strayScript) {
    flags.push(`SCRIPT: unexpected script character '${strayScript[0]}' — CJK/Greek/Cyrillic codepoints not valid in en/vi/th/es output`);
  }

  // GEO readiness checks — scoped to post-match content with real data.
  // Only run on EN body — VI/TH/ES translations won't have EN markers (per design doc line 66).
  const isGeoScoped = slug && (!lang || lang === "en")
    ? GEO_SCOPED_SLUGS.some((p) => slug.startsWith(p))
    : false;

  // Unique data anchor check — only for post-match content (recap/analysis/post-mortem)
  if (isGeoScoped) {
    const hasDataAnchor = DATA_ANCHORS.some((re) => re.test(body));
    if (!hasDataAnchor) {
      flags.push('NO-DATA: Article has no unique data anchor (odds/score/units/matchup)');
    }
  }
  if (isGeoScoped) {
    if (!GEO_CHECKS.REQUIRE_ATOMIC_ANSWER(body)) {
      flags.push('GEO-ATOMIC: First 300 chars missing direct factual answer (score/odds/result/thesis)');
    }
    if (!GEO_CHECKS.REQUIRE_ANALYSIS(body)) {
      flags.push('GEO-ANALYSIS: Article missing analysis/opinion section (no analysis markers found)');
    }
  }

  return {
    passed: flags.length === 0,
    flags,
    wordCount,
  };
}
