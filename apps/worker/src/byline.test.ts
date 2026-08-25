import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import bylineJson from './data/byline.json';

/**
 * Tên toà soạn phải CHỈ CÓ MỘT NƠI quyết định.
 *
 * Trước 25/8 trong repo có ba tên khác nhau cùng ghi vào một bảng:
 *   src/news-gen.ts     → "Banh Bóng News"
 *   src/news-gen-p2.ts  → "banhbong.net News"   ← lệch, chưa kịp ra bài nào
 *   jane-upsert-article.mjs → "Banh Bóng Desk"
 * và đường đăng nhận byline làm THAM SỐ nên gõ nhầm là lọt lên web.
 *
 * Worker không import được apps/web nên phải chép sang data/byline.json — test
 * này đọc CẢ HAI FILE và đỏ nếu chúng lệch, giống cách news-gen.test.ts canh
 * GEN_NEWS_TYPES với NEWS_TYPES của apps/web.
 */
const BRAND = readFileSync(new URL('../../web/lib/brand.ts', import.meta.url), 'utf8');

function hangSo(ten: string): string {
  const m = new RegExp(`export const ${ten} = "([^"]+)"`).exec(BRAND);
  if (!m) throw new Error(`apps/web/lib/brand.ts không còn export const ${ten}`);
  return m[1];
}

describe('byline: worker khớp apps/web/lib/brand.ts', () => {
  it('desk khớp DESK', () => {
    expect(bylineJson.desk).toBe(hangSo('DESK'));
  });

  it('news khớp NEWS_DESK', () => {
    expect(bylineJson.news).toBe(hangSo('NEWS_DESK'));
  });

  it('chỉ có đúng hai tên toà soạn, không sinh thêm biến thể', () => {
    const ten = Object.entries(bylineJson).filter(([k]) => !k.startsWith('_')).map(([, v]) => v);
    expect(ten.sort()).toEqual(['Banh Bóng Desk', 'Banh Bóng News']);
  });

  it('không còn tên thương hiệu đã bỏ', () => {
    for (const v of Object.values(bylineJson)) expect(String(v)).not.toMatch(/WildlyPlay/i);
  });
});

describe('byline: không còn chuỗi tên toà soạn gõ tay trong code ghi DB', () => {
  const FILES = [
    './news-gen.ts', './news-gen-p2.ts', './analysis-api.ts',
    '../jane-upsert-article.mjs', '../news-engine.mjs', '../upsert-news.mjs',
  ];

  for (const f of FILES) {
    it(`${f} lấy byline từ data/byline.json`, () => {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      // Bỏ chú thích trước khi soi — chú thích được phép nhắc tên để giải thích.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/['"`]Banh Bóng (?:Desk|News)['"`]/);
      expect(code).not.toMatch(/['"`]banhbong\.net News['"`]/);
      expect(code).toMatch(/byline/i);
    });
  }
});
