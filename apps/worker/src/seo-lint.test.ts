import { describe, expect, it } from 'vitest';
import { lintSeoArticle } from './seo-lint';

describe('lintSeoArticle — script-consistency check (Nick 4/7 item ②)', () => {
  it('flags Greek letters stray inside Thai text', () => {
    // Repro from Nick: TH hype-scan rendered "Paraguay" as "แพรากουย"
    // — Thai text with 2 Greek letters (ου) mixed in.
    const body = 'ทีมชาติแพรากουยเตรียมพร้อมสำหรับการแข่งขันในสัปดาห์นี้ ทีมมีผู้เล่นที่แข็งแกร่งมาก'.repeat(2);
    const result = lintSeoArticle(body, undefined, 'th');
    expect(result.passed).toBe(false);
    expect(result.flags.some((f) => f.startsWith('SCRIPT:'))).toBe(true);
  });

  it('flags CJK characters stray inside English text', () => {
    const body = `This is a solid analysis of the match with plenty of detail about tactics and 誠实 form. `.repeat(3);
    const result = lintSeoArticle(body, undefined, 'en');
    expect(result.flags.some((f) => f.startsWith('SCRIPT:'))).toBe(true);
  });

  it('does not flag clean Thai text', () => {
    const body = 'ทีมชาติปารากวัยเตรียมพร้อมสำหรับการแข่งขันในสัปดาห์นี้ ทีมมีผู้เล่นที่แข็งแกร่งมากและมีประสบการณ์สูง'.repeat(2);
    const result = lintSeoArticle(body, undefined, 'th');
    expect(result.flags.some((f) => f.startsWith('SCRIPT:'))).toBe(false);
  });

  it('does not flag clean English text', () => {
    const body = 'This is a solid analysis of the match with plenty of detail about tactics, form, and the odds movement over the past few days. '.repeat(3);
    const result = lintSeoArticle(body, undefined, 'en');
    expect(result.flags.some((f) => f.startsWith('SCRIPT:'))).toBe(false);
  });
});
