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

/** Unique data anchors — at least ONE must be present for the article to pass. */
const DATA_ANCHORS = [
  /\d+\.\d{2}/, // odds (e.g. 2.03, 1.85)
  /\d+-\d+/, // score (e.g. 1-2, 3-0)
  /[+-]\d+(\.\d+)?\s*u/i, // units P/L (e.g. +0.26u, -1u)
  /\b(over|under)\s+\d+\.\d+/i, // over/under line
  /\b[A-Z][a-z]+\s+(vs|v)\s+[A-Z][a-z]+/i, // team matchup
];

export function lintSeoArticle(body: string): SeoLintResult {
  const flags: string[] = [];
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  // Word count check
  if (wordCount < 100) {
    flags.push('THIN: under 100 words');
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

  // Unique data anchor check — at least 1 must be present
  const hasDataAnchor = DATA_ANCHORS.some((re) => re.test(body));
  if (!hasDataAnchor) {
    flags.push('NO-DATA: Article has no unique data anchor (odds/score/units/matchup)');
  }

  return {
    passed: flags.length === 0,
    flags,
    wordCount,
  };
}
