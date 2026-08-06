const BASE = 'https://rtsyrktpodspdobelyqs.supabase.co/storage/v1/object/public/competition-logos';

/** Maps competition slug → self-hosted logo URL (Supabase Storage). */
export const COMPETITION_LOGOS: Record<string, string> = {
  'bundesliga':       `${BASE}/bundesliga.png`,
  'premier-league':   `${BASE}/premier-league.png`,
  'la-liga':          `${BASE}/la-liga.png`,
  'liga-mx':          `${BASE}/liga-mx.png`,
  'ligue-1':          `${BASE}/ligue-1.png`,
  'mls':              `${BASE}/mls.png`,
  'serie-a':          `${BASE}/serie-a.png`,
  'champions-league': `${BASE}/champions-league.png`,
  'world-cup-2026':   `${BASE}/world-cup-2026.png`,
  // Giải này trước không có logo nên dòng cuối menu bị trống (Nick báo 6/8).
  // Badge lấy từ TheSportsDB, cùng nguồn với logo CLB đang dùng.
  'wc-afc-qualifiers': `${BASE}/wc-afc-qualifiers.png`,
};

/**
 * Tên giải theo tiếng Việt — CHỈ ghi đè khi tên VN khác tên gốc, để bắt đúng cầu
 * tìm kiếm (Route A, 28/7). Ví dụ dân VN gõ "ngoại hạng anh"/"cúp c1", KHÔNG gõ
 * "premier league"/"champions league" → phải hiển thị tên VN ở H1/title bản VI.
 * Slug không có trong map thì dùng tên gốc (La Liga, Serie A... giữ nguyên).
 */
const COMPETITION_NAMES_VI: Record<string, string> = {
  'premier-league':   'Ngoại hạng Anh',
  'champions-league': 'Cúp C1',
  // Giải đội tuyển VN (28/7) — dùng tên dân VN quen gõ, KHÔNG dịch formal ít search.
  'wc-afc-qualifiers': 'Vòng loại World Cup',
  'aff-cup':           'AFF Cup',
  'asian-cup':         'Asian Cup',
  // TH: các giải trên cần tên Thái do người bản ngữ soi → CHƯA thêm (giữ tên gốc).
};

/** Tên giải đã bản địa hoá cho `lang`. Không có bản dịch thì trả tên gốc. */
export function localizedCompetitionName(slug: string, fallback: string, lang: string): string {
  if (lang === 'vi') return COMPETITION_NAMES_VI[slug] ?? fallback;
  return fallback;
}
