/**
 * Đăng bài TIN vào bảng `news_items` từ một file JSON — thay cho script gõ tay.
 *
 * VÌ SAO CÓ FILE NÀY: bộ sinh tin của worker đang TẮT (log thật:
 * `news-gen: disabled (NEWS_GEN_ENABLED !== "true")`, biến đó không được đặt trên
 * Railway), nên mọi thứ nối vào `insertRows()` trong src/news-gen.ts KHÔNG BAO GIỜ
 * CHẠY. Tin chuyển nhượng (type='transfer') tới nay được ghi thẳng vào Supabase
 * bằng script dựng tạm rồi xoá — không còn file nào để chạy lại. Cửa sổ chuyển
 * nhượng hè đóng 23h 1/9 giờ Anh (5h sáng 2/9 giờ VN), là ngày nhiều tin nhất
 * năm; chạy tay hôm đó là vỡ trận.
 *
 *   Chạy thử (KHÔNG ghi gì):  railway run node apps/worker/upsert-news.mjs tin.json
 *   Ghi thật:                 railway run node apps/worker/upsert-news.mjs tin.json --live
 *
 * FILE ĐẦU VÀO là một MẢNG JSON, mỗi phần tử một bài:
 *   {
 *     "slug": "tottenham-chinh-thuc-ky-savio-tu-manchester-city",
 *     "type": "transfer",                    // preview|result|standings|transfer|general
 *     "subjects": ["Sávio", "Tottenham"],    // tên cầu thủ/CLB bài đang nói tới
 *     "headline_vi": "...", "headline_en": "...",
 *     "body_vi": "...",     "body_en": "...",
 *     "source": "Sky Sports",
 *     "source_url": "https://...",           // tuỳ chọn
 *     "competition_id": "epl-2026",          // tuỳ chọn
 *     "teams": ["man-city"],                 // tuỳ chọn — slug hub /doi
 *     "hero_card_url": "https://...",        // tuỳ chọn
 *     "published_at": "2026-09-01 23:30",    // tuỳ chọn — GIỜ VN, xem mocThoiGian()
 *     "status": "published"                  // tuỳ chọn, mặc định published
 *   }
 *
 * KHÔNG có trường "byline": tên toà soạn lấy từ hằng số dùng chung
 * src/data/byline.json (gương của apps/web/lib/brand.ts). Đặt "byline" trong file
 * là LỖI và script từ chối cả mẻ — đường đăng cũ nhận byline làm THAM SỐ nên gõ
 * nhầm là lọt thẳng lên web (đã từng có bài mang tên toà soạn không tồn tại).
 *
 * CHỐNG TRÙNG: đối chiếu slug với DỮ LIỆU THẬT trong bảng trước khi ghi, cộng thêm
 * upsert onConflict='slug' ignoreDuplicates để chạy lại bao nhiêu lần cũng không
 * đăng đè. Bài trùng bị BỎ, không ghi đè bài đã đăng.
 *
 * CÓ MỘT BÀI HỎNG LÀ DỪNG CẢ MẺ: sửa file rồi chạy lại, bài đã ghi tự bị bỏ qua.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ── Hằng số dùng chung ──────────────────────────────────────────────────────

const BYLINES = JSON.parse(
  readFileSync(new URL('./src/data/byline.json', import.meta.url), 'utf8'),
);

/** Tên toà soạn. Hằng số — KHÔNG nhận từ tham số dòng lệnh, KHÔNG nhận từ file. */
export const NEWS_BYLINE = BYLINES.desk;

export const VN_TZ = 'Asia/Ho_Chi_Minh';

/** Chép từ NEWS_TYPES trong apps/web/lib/news.ts (worker không import được apps/web). */
export const NEWS_TYPES = ['preview', 'result', 'standings', 'transfer', 'general'];

export const STATUSES = ['published', 'draft'];

/** Ngưỡng bộ lọc — đo trên 111 bài ĐÃ ĐĂNG ngày 25/8 rồi hạ xuống cho rộng tay:
 *  tiêu đề ngắn nhất 23 ký tự, thân bài tin chuyển nhượng ngắn nhất 1363 ký tự. */
export const MIN_HEADLINE_CHARS = 20;
export const MIN_HEADLINE_WORDS = 4;
export const MIN_BODY_CHARS = 400;
export const MIN_BODY_SENTENCES = 3;

/** Ký tự kết câu — thân bài cụt giữa chừng ("Vào sáng ngày") không có cái nào. */
const KET_CAU = /[.!?…"”'’)\]]$/;

// ── Công cụ nhỏ ─────────────────────────────────────────────────────────────

/** Bỏ dấu + hạ chữ thường, để so tên riêng mà không kẹt vì dấu tiếng Việt. */
export function boDau(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

/** Ngày theo lịch VN của một thời điểm, dạng YYYY-MM-DD. */
export function ngayVN(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }).format(new Date(iso));
}

/** Guard chép từ isSlugSafe() trong src/news-gen.ts: tiền tố `news-` bị chuyển
 *  hướng /news/news-:slug → /analysis/news-:slug nuốt mất URL. */
export function slugAnToan(slug) {
  return typeof slug === 'string' && !slug.startsWith('news-') && /^[a-z0-9-]+$/.test(slug);
}

const KHONG_MUI_GIO = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const CO_MUI_GIO = /(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * Đổi mốc thời gian trong file đầu vào thành một THỜI ĐIỂM tuyệt đối (ISO UTC).
 * Trả `null` nếu không đọc được.
 *
 * Cột `published_at` là `timestamp with time zone` (đọc từ OpenAPI của PostgREST
 * ngày 25/8) — Postgres lưu THỜI ĐIỂM chứ không lưu múi giờ, và ngày hiển thị đã
 * được ghim Asia/Ho_Chi_Minh ở apps/web/components/local-date.tsx (PR #133). Nên
 * chỗ duy nhất còn có thể lệch ngày là LÚC GÕ: "2026-09-01 23:30" mà hiểu thành
 * UTC thì bài nhảy sang 2/9 giờ VN, đúng cái lỗi #133 vừa chữa. Vì vậy mốc KHÔNG
 * kèm múi giờ luôn được đọc là GIỜ VN; muốn ghi giờ UTC thì phải viết rõ `Z`.
 * Việt Nam cố định +07:00, không có giờ mùa hè, nên cộng thẳng được.
 */
export function mocThoiGian(raw, now = new Date()) {
  if (raw === undefined || raw === null || raw === '') return now.toISOString();
  const s = String(raw).trim();
  const m = KHONG_MUI_GIO.exec(s);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    const t = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se ?? '00'}+07:00`);
    return isNaN(t.getTime()) ? null : t.toISOString();
  }
  if (!CO_MUI_GIO.test(s)) return null; // ISO trống múi giờ = không biết giờ nào
  const t = new Date(s);
  return isNaN(t.getTime()) ? null : t.toISOString();
}

function demTu(s) {
  return String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function demCau(s) {
  return String(s ?? '').split(/[.!?…]+(?:\s|$)/).map((c) => c.trim()).filter(Boolean).length;
}

// ── Bộ lọc đầu ra ───────────────────────────────────────────────────────────

/**
 * Chặn bài hỏng TRƯỚC KHI ghi. Trả mảng lỗi, rỗng nghĩa là qua.
 *
 * Vì sao kiểm cả CÂU chứ không chỉ số: đã từng có bài lọt lên web với câu cụt 3
 * chữ "Vào sáng ngày" vì bộ lọc cũ chỉ đếm số liệu. Ba thứ tối thiểu phải có:
 * đủ độ dài · câu kết thúc hẳn · có tên đối tượng đang nói tới.
 */
export function kiemTraBai(bai) {
  const loi = [];
  if (!bai || typeof bai !== 'object' || Array.isArray(bai)) return ['không phải một đối tượng JSON'];

  if ('byline' in bai) {
    loi.push('không được đặt "byline" — tên toà soạn là hằng số dùng chung, xem src/data/byline.json');
  }
  if (!slugAnToan(bai.slug)) {
    loi.push(`slug không hợp lệ: ${JSON.stringify(bai.slug)} (chỉ a-z 0-9 và dấu -, không mở đầu bằng "news-")`);
  }
  if (!NEWS_TYPES.includes(bai.type)) {
    loi.push(`type không hợp lệ: ${JSON.stringify(bai.type)} (phải là ${NEWS_TYPES.join('|')})`);
  }
  if (bai.status !== undefined && !STATUSES.includes(bai.status)) {
    loi.push(`status không hợp lệ: ${JSON.stringify(bai.status)} (phải là ${STATUSES.join('|')})`);
  }
  if (typeof bai.source !== 'string' || bai.source.trim() === '') {
    loi.push('thiếu "source" (cột NOT NULL, và người đọc cần biết tin lấy từ đâu)');
  }
  if (bai.teams !== undefined && (!Array.isArray(bai.teams) || bai.teams.some((t) => typeof t !== 'string'))) {
    loi.push('"teams" phải là mảng chuỗi (slug hub /doi)');
  }
  if (mocThoiGian(bai.published_at) === null) {
    loi.push(`published_at không đọc được: ${JSON.stringify(bai.published_at)} `
      + '(dùng "YYYY-MM-DD HH:mm" giờ VN, hoặc ISO có kèm Z / ±hh:mm)');
  }

  // Tiêu đề + thân bài: bắt buộc cả vi lẫn en (headline_en/body_en là cột NOT NULL).
  for (const [cot, nhan] of [['headline_vi', 'tiêu đề tiếng Việt'], ['headline_en', 'tiêu đề tiếng Anh']]) {
    const v = typeof bai[cot] === 'string' ? bai[cot].trim() : '';
    if (v === '') { loi.push(`thiếu ${cot} (${nhan})`); continue; }
    if (v.length < MIN_HEADLINE_CHARS) loi.push(`${cot} quá ngắn: ${v.length} ký tự < ${MIN_HEADLINE_CHARS}`);
    if (demTu(v) < MIN_HEADLINE_WORDS) loi.push(`${cot} quá ngắn: ${demTu(v)} chữ < ${MIN_HEADLINE_WORDS}`);
  }
  for (const [cot, nhan] of [['body_vi', 'thân bài tiếng Việt'], ['body_en', 'thân bài tiếng Anh']]) {
    const v = typeof bai[cot] === 'string' ? bai[cot].trim() : '';
    if (v === '') { loi.push(`thiếu ${cot} (${nhan})`); continue; }
    if (v.length < MIN_BODY_CHARS) loi.push(`${cot} quá ngắn: ${v.length} ký tự < ${MIN_BODY_CHARS}`);
    if (demCau(v) < MIN_BODY_SENTENCES) loi.push(`${cot} quá ngắn: ${demCau(v)} câu < ${MIN_BODY_SENTENCES}`);
    if (!KET_CAU.test(v)) loi.push(`${cot} cụt giữa chừng — kết thúc bằng "…${v.slice(-24)}", không có dấu kết câu`);
  }

  // Tên đối tượng đang nói tới phải THẬT SỰ xuất hiện trong bài.
  const subjects = bai.subjects;
  if (!Array.isArray(subjects) || subjects.length === 0
      || subjects.some((s) => typeof s !== 'string' || s.trim() === '')) {
    loi.push('thiếu "subjects" — phải liệt kê tên cầu thủ/CLB bài đang nói tới (mảng chuỗi, ít nhất 1)');
  } else {
    const vi = boDau(`${bai.headline_vi ?? ''} ${bai.body_vi ?? ''}`);
    const en = boDau(`${bai.headline_en ?? ''} ${bai.body_en ?? ''}`);
    for (const s of subjects) {
      const k = boDau(s).trim();
      if (!vi.includes(k)) loi.push(`bản tiếng Việt không nhắc tới "${s}"`);
      if (!en.includes(k)) loi.push(`bản tiếng Anh không nhắc tới "${s}"`);
    }
  }

  return loi;
}

// ── Dựng dòng ghi vào bảng ──────────────────────────────────────────────────

/**
 * Dựng đúng một dòng `news_items`. Byline LUÔN là hằng số — mọi giá trị byline
 * trong `bai` bị bỏ qua ở đây, và bị bộ lọc chặn từ trước.
 */
export function dungDong(bai, now = new Date()) {
  const nowIso = now.toISOString();
  const dang = bai.status ?? 'published';
  const moc = mocThoiGian(bai.published_at, now);
  const dong = {
    slug: bai.slug,
    type: bai.type,
    headline_vi: bai.headline_vi.trim(),
    headline_en: bai.headline_en.trim(),
    body_vi: bai.body_vi.trim(),
    body_en: bai.body_en.trim(),
    source: bai.source.trim(),
    source_url: bai.source_url ?? null,
    competition_id: bai.competition_id ?? null,
    match_id: bai.match_id ?? null,
    pick_id: bai.pick_id ?? null,
    hero_card_url: bai.hero_card_url ?? null,
    teams: bai.teams ?? [],
    status: dang,
    // Bài nháp không có ngày đăng — giống buildRow() trong src/news-gen.ts.
    published_at: dang === 'published' ? moc : null,
    updated_at: nowIso,
    byline: NEWS_BYLINE,
  };
  for (const lang of ['th', 'es']) {
    if (typeof bai[`headline_${lang}`] === 'string') dong[`headline_${lang}`] = bai[`headline_${lang}`].trim();
    if (typeof bai[`body_${lang}`] === 'string') dong[`body_${lang}`] = bai[`body_${lang}`].trim();
  }
  return dong;
}

// ── Phân loại mẻ bài ────────────────────────────────────────────────────────

/**
 * Chia mẻ bài thành hỏng / trùng / mới.
 * `slugDaCo` phải là slug ĐỌC TỪ BẢNG THẬT, không phải suy từ file đầu vào.
 */
export function phanLoai(danhSach, slugDaCo) {
  const daCo = slugDaCo instanceof Set ? slugDaCo : new Set(slugDaCo);
  const hong = [];
  const trung = [];
  const moi = [];
  const gapTrongFile = new Set();

  danhSach.forEach((bai, i) => {
    const loi = kiemTraBai(bai);
    if (loi.length > 0) { hong.push({ i, slug: bai?.slug ?? '(không có slug)', loi }); return; }
    if (daCo.has(bai.slug)) { trung.push({ slug: bai.slug, vi_sao: 'đã có trong bảng news_items' }); return; }
    if (gapTrongFile.has(bai.slug)) { trung.push({ slug: bai.slug, vi_sao: 'lặp lại trong chính file đầu vào' }); return; }
    gapTrongFile.add(bai.slug);
    moi.push(bai);
  });

  return { hong, trung, moi };
}

/** Tiêu đề gần giống bài đã có (khác slug) — chỉ CẢNH BÁO, không chặn. Ngày chốt
 *  sổ hai nguồn dễ ra cùng một tin dưới hai slug khác nhau. */
export function canhBaoTieuDeGiong(danhSach, tieuDeDaCo) {
  const chuanHoa = (s) => boDau(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const banDo = new Map();
  for (const r of tieuDeDaCo) banDo.set(chuanHoa(r.headline_vi ?? ''), r.slug);
  const ra = [];
  for (const bai of danhSach) {
    const k = chuanHoa(bai.headline_vi ?? '');
    if (k && banDo.has(k) && banDo.get(k) !== bai.slug) {
      ra.push({ slug: bai.slug, giong: banDo.get(k) });
    }
  }
  return ra;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const CHIA_LO = 200;

function chiaLo(arr, n) {
  const ra = [];
  for (let i = 0; i < arr.length; i += n) ra.push(arr.slice(i, i + n));
  return ra;
}

async function main() {
  const argv = process.argv.slice(2);
  const LIVE = argv.includes('--live');
  const duongDan = argv.find((a) => !a.startsWith('--'));
  if (!duongDan) {
    console.error('Thiếu file JSON.\n'
      + '  Chạy thử: railway run node apps/worker/upsert-news.mjs tin.json\n'
      + '  Ghi thật: railway run node apps/worker/upsert-news.mjs tin.json --live\n'
      + 'Cấu trúc file xem phần chú thích đầu apps/worker/upsert-news.mjs.');
    process.exit(2);
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REVALIDATE_SECRET } = process.env;
  const site = process.env.SITE_URL || 'https://www.banhbong.net';
  for (const [ten, v] of [['SUPABASE_URL', SUPABASE_URL], ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY]]) {
    if (!v) { console.error(`thiếu biến môi trường ${ten} — chạy qua "railway run"`); process.exit(2); }
  }

  let danhSach;
  try {
    danhSach = JSON.parse(readFileSync(duongDan, 'utf8'));
  } catch (err) {
    console.error(`đọc ${duongDan} hỏng: ${err.message}`);
    process.exit(2);
  }
  if (!Array.isArray(danhSach)) { console.error('file đầu vào phải là một MẢNG JSON các bài'); process.exit(2); }
  if (danhSach.length === 0) { console.log('file rỗng — không có gì để làm'); return; }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Slug ĐÃ CÓ — đọc từ bảng thật, không tin file đầu vào.
  const slugCanHoi = danhSach.map((b) => b?.slug).filter((s) => typeof s === 'string');
  const daCo = new Set();
  for (const lo of chiaLo(slugCanHoi, CHIA_LO)) {
    const { data, error } = await sb.from('news_items').select('slug').in('slug', lo);
    if (error) { console.error(`hỏi bảng news_items hỏng: ${error.message}`); process.exit(1); }
    for (const r of data ?? []) daCo.add(r.slug);
  }

  const { hong, trung, moi } = phanLoai(danhSach, daCo);

  const { data: ganDay } = await sb.from('news_items')
    .select('slug, headline_vi').order('published_at', { ascending: false, nullsFirst: false }).limit(300);
  const giong = canhBaoTieuDeGiong(moi, ganDay ?? []);

  // ── Báo cáo ──
  const now = new Date();
  console.log(`\n${duongDan}: ${danhSach.length} bài · ${moi.length} MỚI · ${trung.length} trùng bỏ qua · ${hong.length} hỏng`);

  if (moi.length > 0) {
    console.log('\nSẼ GHI:');
    for (const b of moi) {
      const d = dungDong(b, now);
      const ngay = d.published_at ? ngayVN(d.published_at) : '(nháp)';
      console.log(`  + ${d.slug}`);
      console.log(`      ${d.type} · ${d.status} · ngày VN ${ngay} · byline "${d.byline}" · nguồn ${d.source}`);
      console.log(`      ${d.headline_vi}`);
    }
  }
  if (trung.length > 0) {
    console.log('\nTRÙNG — BỎ QUA:');
    for (const t of trung) console.log(`  = ${t.slug}  (${t.vi_sao})`);
  }
  if (giong.length > 0) {
    console.log('\n⚠ TIÊU ĐỀ GẦN GIỐNG BÀI ĐÃ CÓ (không chặn, tự soi lại):');
    for (const g of giong) console.log(`  ~ ${g.slug}  giống  ${g.giong}`);
  }
  if (hong.length > 0) {
    console.log('\nHỎNG — CHẶN CẢ MẺ:');
    for (const h of hong) {
      console.log(`  ✗ [${h.i}] ${h.slug}`);
      for (const l of h.loi) console.log(`      - ${l}`);
    }
  }

  if (hong.length > 0) {
    console.error('\nCó bài không qua bộ lọc — KHÔNG ghi gì cả. Sửa file rồi chạy lại '
      + '(bài đã ghi lần trước sẽ tự bị bỏ qua).');
    process.exit(1);
  }
  if (!LIVE) {
    console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --live để ghi thật.');
    return;
  }
  if (moi.length === 0) {
    console.log('\nKhông có bài mới — không ghi, không xoá đệm.');
    return;
  }

  // ── Ghi thật ──
  const dong = moi.map((b) => dungDong(b, now));
  for (const lo of chiaLo(dong, 50)) {
    const { error } = await sb.from('news_items')
      .upsert(lo, { onConflict: 'slug', ignoreDuplicates: true });
    if (error) { console.error(`ghi hỏng: ${error.message}`); process.exit(1); }
  }

  // Tự kiểm: đọc lại từ bảng, đừng tin lệnh ghi không báo lỗi là xong.
  const { data: lai, error: eLai } = await sb.from('news_items')
    .select('slug, byline, status, published_at').in('slug', dong.map((d) => d.slug));
  if (eLai) { console.error(`đọc lại hỏng: ${eLai.message}`); process.exit(1); }
  const veLai = new Map((lai ?? []).map((r) => [r.slug, r]));
  let thieu = 0;
  console.log('\nĐÃ GHI — đọc lại từ bảng:');
  for (const d of dong) {
    const r = veLai.get(d.slug);
    if (!r) { console.error(`  ✗ ${d.slug} KHÔNG thấy trong bảng`); thieu++; continue; }
    const saiByline = r.byline !== NEWS_BYLINE;
    if (saiByline) thieu++;
    console.log(`  ${saiByline ? '✗' : '✓'} ${d.slug} · ${r.status}`
      + ` · ngày VN ${r.published_at ? ngayVN(r.published_at) : '(nháp)'} · byline "${r.byline}"`);
  }
  if (thieu > 0) { console.error(`\n${thieu} bài không đúng sau khi ghi — KHÔNG xoá đệm, kiểm tay.`); process.exit(1); }

  // ── Xoá đệm, không thì trang vẫn trả bản cũ ──
  if (!REVALIDATE_SECRET) {
    console.warn('\n⚠ thiếu REVALIDATE_SECRET — CHƯA xoá đệm, trang sẽ còn trả bản cũ tới 5 phút.');
    return;
  }
  const res = await fetch(`${site}/api/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': REVALIDATE_SECRET },
    body: JSON.stringify({ tags: ['news'] }),
  });
  if (!res.ok) {
    console.error(`\n⚠ xoá đệm hỏng: HTTP ${res.status} — bài đã vào bảng, chạy lại lệnh revalidate bằng tay.`);
    process.exit(1);
  }
  console.log(`\nĐã xoá đệm tag "news" trên ${site}. Xong ${dong.length} bài.`);
}

// Chỉ chạy khi gọi thẳng bằng node — để test import được các hàm ở trên.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
