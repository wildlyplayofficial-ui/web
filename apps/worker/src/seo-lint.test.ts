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

describe('lintSeoArticle — title ≤60 gate (audit 8/9: 6/12 bài dính, Google cắt SERP)', () => {
  const cleanBody = 'This is a solid analysis of the match with plenty of detail about tactics, form, and the odds movement over the past few days. '.repeat(3);

  it('flags a title over 60 chars', () => {
    const longTitle = 'Isak lập cú đúp giúp Liverpool thắng đậm Ipswich ngay tại Portman Road'; // 70 ký tự
    const result = lintSeoArticle(cleanBody, undefined, 'en', longTitle);
    expect(result.passed).toBe(false);
    expect(result.flags.some((f) => f.startsWith('TITLE:'))).toBe(true);
  });

  it('passes a title at exactly 60 chars', () => {
    const title60 = 'x'.repeat(60);
    const result = lintSeoArticle(cleanBody, undefined, 'en', title60);
    expect(result.flags.some((f) => f.startsWith('TITLE:'))).toBe(false);
  });

  it('does not flag when title is omitted (backward compat)', () => {
    const result = lintSeoArticle(cleanBody, undefined, 'en');
    expect(result.flags.some((f) => f.startsWith('TITLE:'))).toBe(false);
  });
});

describe('lintSeoArticle — mức độ sâu theo loại bài (Peter 8/9)', () => {
  const short = 'Trận đấu tối nay rất đáng xem. '.repeat(20); // ~120 từ
  const long = 'Trận đấu tối nay rất đáng xem vì hai đội đều có phong độ tốt. '.repeat(80);

  it('gắn cờ DEPTH khi bài analysis dưới 700 từ', () => {
    const r = lintSeoArticle(short, undefined, 'vi', 'Tiêu đề ngắn gọn', 'analysis');
    expect(r.flags.some((f) => f.startsWith('DEPTH:'))).toBe(true);
  });

  it('không gắn cờ DEPTH khi bài analysis đủ dài', () => {
    const r = lintSeoArticle(long, undefined, 'vi', 'Tiêu đề ngắn gọn', 'analysis');
    expect(r.flags.some((f) => f.startsWith('DEPTH:'))).toBe(false);
  });

  it('không gắn cờ DEPTH cho loại bài không đặt mức (no-play)', () => {
    const r = lintSeoArticle(short, undefined, 'vi', 'Tiêu đề ngắn gọn', 'no-play');
    expect(r.flags.some((f) => f.startsWith('DEPTH:'))).toBe(false);
  });

  it('không gắn cờ DEPTH khi không truyền type (tương thích ngược)', () => {
    const r = lintSeoArticle(short, undefined, 'vi', 'Tiêu đề ngắn gọn');
    expect(r.flags.some((f) => f.startsWith('DEPTH:'))).toBe(false);
  });
});

describe('lintSeoArticle — mức chữ bài blog/guide', () => {
  const w = (n: number) => 'Bóng đá là môn thể thao vua trên toàn thế giới. '.repeat(n);
  it('bài blog dưới 1200 từ bị gắn cờ DEPTH', () => {
    const r = lintSeoArticle(w(60), undefined, 'vi', 'Tiêu đề ngắn', 'blog'); // ~540 từ
    expect(r.flags.some((f) => f.startsWith('DEPTH:'))).toBe(true);
  });
  it('bài blog đủ 1200 từ thì không bị gắn cờ', () => {
    const r = lintSeoArticle(w(160), undefined, 'vi', 'Tiêu đề ngắn', 'blog'); // ~1440 từ
    expect(r.flags.some((f) => f.startsWith('DEPTH:'))).toBe(false);
  });
});
