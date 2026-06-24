/**
 * Deterministic regex guard for "The Booth" live commentary.
 * Checks AI-generated text for forbidden patterns BEFORE storage.
 * Code enforcement — we don't trust the LLM to self-police.
 */

interface BoothLine { who: 'sonny' | 'cole'; text: string }
export interface LintResult { passed: boolean; flags: string[] }

interface Rule { pattern: RegExp; category: string; description: string }

const rules: Rule[] = [
  // Guard #1 — NO-TIP: never tell anyone to bet
  { pattern: /\b(bet this|bet on|back it|take this|double down|go with)\b/i, category: 'NO-TIP', description: 'betting directive' },
  { pattern: /\btake the\b(?!\s+(result|win|loss|point|lead|draw|credit|blame))/i, category: 'NO-TIP', description: 'betting directive (take the)' },
  { pattern: /\b(lock|slam|smash it|banker|sure thing|guaranteed)\b/i, category: 'NO-TIP', description: 'betting slang' },
  { pattern: /(đánh|vào kèo|cược đi|chắc thắng|ăn chắc)/i, category: 'NO-TIP', description: 'Vietnamese betting term' },
  { pattern: /(แทง|ลงเลย)/i, category: 'NO-TIP', description: 'Thai betting term' },
  { pattern: /\b(apuesta|apuesta esto)\b/i, category: 'NO-TIP', description: 'Spanish betting term' },

  // Guard #4 — NO-EDGE: never claim WP beats the book
  { pattern: /\b(we have an edge|edge over|beat the book|beat the bookie)\b/i, category: 'NO-EDGE', description: 'claiming edge over bookmaker' },
  { pattern: /\b(sharp|we'?re sharp)\b/i, category: 'NO-EDGE', description: 'sharp claim' },
  { pattern: /\+EV\b/i, category: 'NO-EDGE', description: '+EV reference' },
  { pattern: /\b(positive EV|expected value)\b/i, category: 'NO-EDGE', description: 'EV terminology' },
  { pattern: /\b(value bet|value play)\b/i, category: 'NO-EDGE', description: 'value bet language' },

  // Guard #2 — NO-VICTORY-LAP
  { pattern: /\b(told you|nailed it|knew it)\b/i, category: 'NO-VICTORY-LAP', description: 'hindsight boast' },
  { pattern: /\bcalled it\b(?!\s+(right|correctly|early|wrong))/i, category: 'NO-VICTORY-LAP', description: 'hindsight boast (called it)' },
  { pattern: /\b(should have bet|should've bet|could have won)\b/i, category: 'NO-VICTORY-LAP', description: 'regret-inducing language' },

  // Guard #3 — NO-FABRICATION: flag suspicious specificity
  { pattern: /\bxG\b/, category: 'NO-FABRICATION', description: 'xG not in feed' },
  { pattern: /\bexpected goals\b/i, category: 'NO-FABRICATION', description: 'expected goals not in feed' },
  { pattern: /\b\d+\s+shots\b/i, category: 'NO-FABRICATION', description: 'specific shot count' },
  { pattern: /\b\d+\s+corners\b/i, category: 'NO-FABRICATION', description: 'specific corner count' },

  // Guard #5 — CALIBRATION: overconfidence
  { pattern: /\b(guaranteed|certain|definitely will|no doubt|100%)\b/i, category: 'CALIBRATION', description: 'overconfident language' },
];

export function lintBoothOutput(lines: BoothLine[]): LintResult {
  const flags: string[] = [];

  for (const line of lines) {
    for (const rule of rules) {
      const match = line.text.match(rule.pattern);
      if (match) {
        flags.push(`${rule.category}: ${rule.description} (matched: '${match[0]}')`);
      }
    }
  }

  return { passed: flags.length === 0, flags };
}
