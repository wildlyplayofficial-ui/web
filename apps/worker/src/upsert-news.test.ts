import { describe, expect, it } from 'vitest';
import {
  NEWS_BYLINE, MIN_BODY_CHARS,
  dungDong, kiemTraBai, mocThoiGian, ngayVN, phanLoai, slugAnToan,
  type NewsInput,
} from '../upsert-news.mjs';

/** Một bài hợp lệ để làm gốc — mỗi test chỉ bẻ đúng một chỗ. */
const CAU = 'Tottenham chính thức ký Sávio từ Manchester City với mức phí có thể lên tới 85 triệu bảng. ';
const CAU_EN = 'Tottenham have officially signed Savio from Manchester City in a deal worth up to 85m. ';

function baiTot(sua: Partial<NewsInput> = {}): NewsInput {
  return {
    slug: 'tottenham-chinh-thuc-ky-savio-tu-manchester-city',
    type: 'transfer',
    subjects: ['Sávio', 'Tottenham'],
    headline_vi: 'CHÍNH THỨC: Tottenham ký Sávio từ Manchester City',
    headline_en: 'Official: Tottenham sign Savio from Manchester City',
    body_vi: CAU.repeat(6),
    body_en: CAU_EN.repeat(6),
    source: 'Sky Sports',
    ...sua,
  } as NewsInput;
}

describe('bài mẫu qua được bộ lọc (nếu test này đỏ thì mấy test dưới vô nghĩa)', () => {
  it('không lỗi nào', () => {
    expect(kiemTraBai(baiTot())).toEqual([]);
    expect(baiTot().body_vi.length).toBeGreaterThan(MIN_BODY_CHARS);
  });
});

// ── Yêu cầu 8a: byline KHÔNG THỂ ghi đè ─────────────────────────────────────

describe('byline không thể ghi đè', () => {
  it('dùng đúng hằng số dùng chung', () => {
    expect(dungDong(baiTot()).byline).toBe(NEWS_BYLINE);
    expect(NEWS_BYLINE).toBe('Banh Bóng Desk');
  });

  it('bộ lọc CHẶN bài có trường byline, dù gõ đúng tên', () => {
    const loi = kiemTraBai({ ...baiTot(), byline: 'Banh Bóng Desk' });
    expect(loi.join(' ')).toContain('không được đặt "byline"');
  });

  it('bộ lọc chặn cả tên toà soạn bịa ra', () => {
    const loi = kiemTraBai({ ...baiTot(), byline: 'WildlyPlay Desk' });
    expect(loi.join(' ')).toContain('không được đặt "byline"');
  });

  it('kể cả lọt qua được bộ lọc, dòng ghi ra vẫn mang hằng số', () => {
    const dong = dungDong({ ...baiTot(), byline: 'WildlyPlay Desk' } as NewsInput);
    expect(dong.byline).toBe(NEWS_BYLINE);
    expect(dong.byline).not.toBe('WildlyPlay Desk');
  });

  it('bài bị chặn thì không bao giờ tới bước dựng dòng', () => {
    const { hong, moi } = phanLoai([{ ...baiTot(), byline: 'WildlyPlay Desk' }], []);
    expect(moi).toHaveLength(0);
    expect(hong).toHaveLength(1);
  });
});

// ── Yêu cầu 8b: chống trùng ─────────────────────────────────────────────────

describe('chống trùng', () => {
  it('bỏ bài đã có trong bảng THẬT, giữ bài mới', () => {
    const a = baiTot({ slug: 'bai-a-ve-savio-toi-tottenham' });
    const b = baiTot({ slug: 'bai-b-ve-savio-toi-tottenham' });
    const { moi, trung } = phanLoai([a, b], new Set(['bai-a-ve-savio-toi-tottenham']));
    expect(moi.map((x) => x.slug)).toEqual(['bai-b-ve-savio-toi-tottenham']);
    expect(trung).toEqual([
      { slug: 'bai-a-ve-savio-toi-tottenham', vi_sao: 'đã có trong bảng news_items' },
    ]);
  });

  it('bỏ slug lặp trong chính file đầu vào, chỉ ghi một lần', () => {
    const { moi, trung } = phanLoai([baiTot(), baiTot(), baiTot()], []);
    expect(moi).toHaveLength(1);
    expect(trung).toHaveLength(2);
    expect(trung[0].vi_sao).toContain('lặp lại trong chính file đầu vào');
  });

  it('chạy lại nguyên mẻ sau khi đã ghi thì không ghi thêm gì', () => {
    const me = [baiTot({ slug: 'tin-mot-ve-savio-toi-tottenham' }), baiTot({ slug: 'tin-hai-ve-savio-toi-tottenham' })];
    const lan1 = phanLoai(me, []);
    expect(lan1.moi).toHaveLength(2);
    const daGhi = new Set(lan1.moi.map((x) => x.slug));
    const lan2 = phanLoai(me, daGhi);
    expect(lan2.moi).toHaveLength(0);
    expect(lan2.trung).toHaveLength(2);
  });

  it('slug mở đầu bằng "news-" bị chặn (chuyển hướng /news/news-* nuốt URL)', () => {
    expect(slugAnToan('news-savio-toi-tottenham')).toBe(false);
    expect(kiemTraBai(baiTot({ slug: 'news-savio-toi-tottenham' })).join(' ')).toContain('slug không hợp lệ');
  });

  it('slug có chữ hoa / khoảng trắng bị chặn', () => {
    for (const s of ['Savio-Toi-Tottenham', 'savio toi tottenham', 'savio_toi_tottenham', '']) {
      expect(slugAnToan(s)).toBe(false);
    }
  });
});

// ── Yêu cầu 8c: bộ lọc câu hỏng ─────────────────────────────────────────────

describe('bộ lọc câu hỏng', () => {
  it('chặn thân bài cụt 3 chữ "Vào sáng ngày" (lỗi thật đã từng lên web)', () => {
    const loi = kiemTraBai(baiTot({ body_vi: 'Vào sáng ngày' }));
    expect(loi.join(' ')).toContain('body_vi quá ngắn');
  });

  it('chặn thân bài đủ dài nhưng đứt giữa chừng, không có dấu kết câu', () => {
    const cut = `${CAU.repeat(6)}Theo nguồn tin thân cận thì Tottenham sẽ`;
    const loi = kiemTraBai(baiTot({ body_vi: cut }));
    expect(loi.join(' ')).toContain('cụt giữa chừng');
  });

  it('chặn tiêu đề quá ngắn', () => {
    expect(kiemTraBai(baiTot({ headline_vi: 'Sávio đi rồi' })).join(' ')).toContain('headline_vi quá ngắn');
  });

  it('chặn thân bài chỉ có một câu dù dài', () => {
    const motCau = `Tottenham ${'rất '.repeat(160)}vui.`;
    expect(motCau.length).toBeGreaterThan(MIN_BODY_CHARS);
    expect(kiemTraBai(baiTot({ body_vi: motCau })).join(' ')).toContain('câu <');
  });

  it('chặn bài KHÔNG nhắc tên cầu thủ/CLB đang nói tới', () => {
    const loi = kiemTraBai(baiTot({ subjects: ['Sávio', 'Arsenal'] }));
    expect(loi).toContain('bản tiếng Việt không nhắc tới "Arsenal"');
    expect(loi).toContain('bản tiếng Anh không nhắc tới "Arsenal"');
  });

  it('so tên bỏ dấu — "Sávio" khớp cả bản tiếng Anh viết "Savio"', () => {
    expect(kiemTraBai(baiTot({ subjects: ['Sávio'] }))).toEqual([]);
  });

  it('chặn bài quên khai subjects', () => {
    const { subjects: _bo, ...khongCo } = baiTot();
    expect(kiemTraBai(khongCo).join(' ')).toContain('thiếu "subjects"');
    expect(kiemTraBai({ ...baiTot(), subjects: [] }).join(' ')).toContain('thiếu "subjects"');
  });

  it('chặn type lạ và thiếu nguồn', () => {
    expect(kiemTraBai(baiTot({ type: 'chuyen-nhuong' })).join(' ')).toContain('type không hợp lệ');
    expect(kiemTraBai(baiTot({ source: '  ' })).join(' ')).toContain('thiếu "source"');
  });

  it('chặn bản tiếng Anh hỏng dù bản tiếng Việt ổn (cột body_en NOT NULL)', () => {
    expect(kiemTraBai(baiTot({ body_en: 'Savio joins.' })).join(' ')).toContain('body_en quá ngắn');
  });
});

// ── Ngày đăng theo giờ VN (PR #133) ─────────────────────────────────────────

describe('ngày đăng theo Asia/Ho_Chi_Minh', () => {
  it('mốc không kèm múi giờ được đọc là GIỜ VN, không phải UTC', () => {
    expect(mocThoiGian('2026-09-01 23:30')).toBe('2026-09-01T16:30:00.000Z');
    expect(ngayVN(mocThoiGian('2026-09-01 23:30')!)).toBe('2026-09-01');
  });

  it('bài đăng rạng sáng giờ VN vẫn mang đúng ngày VN, không lùi một ngày', () => {
    // Đúng cái bẫy PR #133 chữa: 05:12 sáng 25/8 giờ VN = 22:12 ngày 24/8 UTC.
    const iso = mocThoiGian('2026-08-25 05:12')!;
    expect(iso).toBe('2026-08-24T22:12:00.000Z');
    expect(ngayVN(iso)).toBe('2026-08-25');
  });

  it('ISO có kèm Z / ±hh:mm thì giữ nguyên thời điểm', () => {
    expect(mocThoiGian('2026-09-01T16:30:00Z')).toBe('2026-09-01T16:30:00.000Z');
    expect(mocThoiGian('2026-09-01T23:30:00+07:00')).toBe('2026-09-01T16:30:00.000Z');
  });

  it('từ chối ISO trống múi giờ và mốc rác — thà báo lỗi còn hơn lệch ngày', () => {
    expect(mocThoiGian('2026-09-01T23:30:00')).not.toBeNull(); // dạng YYYY-MM-DDTHH:mm:ss = giờ VN
    expect(mocThoiGian('01/09/2026')).toBeNull();
    expect(mocThoiGian('2026-09-01')).toBeNull(); // thiếu giờ = không đoán
    expect(kiemTraBai(baiTot({ published_at: '01/09/2026' })).join(' ')).toContain('published_at không đọc được');
  });

  it('bỏ trống published_at thì lấy lúc chạy', () => {
    const now = new Date('2026-09-01T16:30:00Z');
    expect(dungDong(baiTot(), now).published_at).toBe('2026-09-01T16:30:00.000Z');
  });

  it('bài nháp không có ngày đăng', () => {
    expect(dungDong(baiTot({ status: 'draft' })).published_at).toBeNull();
  });
});

// ── Dòng ghi ra khớp bảng news_items ────────────────────────────────────────

describe('dòng ghi ra', () => {
  it('teams mặc định rỗng (cột NOT NULL default {}), các cột tuỳ chọn là null', () => {
    const d = dungDong(baiTot());
    expect(d.teams).toEqual([]);
    expect(d.source_url).toBeNull();
    expect(d.competition_id).toBeNull();
    expect(d.hero_card_url).toBeNull();
    expect(d.status).toBe('published');
  });

  it('không tự bịa id — để Postgres sinh khoá chính', () => {
    expect(Object.keys(dungDong(baiTot()))).not.toContain('id');
  });

  it('bỏ hẳn headline_th/es khi không có, để web rơi về bản tiếng Anh', () => {
    const d = dungDong(baiTot());
    expect(d).not.toHaveProperty('headline_th');
    expect(dungDong(baiTot({ headline_th: 'ทดสอบ' }))).toHaveProperty('headline_th', 'ทดสอบ');
  });
});
