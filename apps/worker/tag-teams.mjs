/**
 * Gắn nhãn CLB cho bài đã đăng, để 5 trang hub /doi/<clb> có nội dung.
 *
 * LUẬT GẮN (cách B, Gwen đo 25/8 rồi Jane duyệt):
 *   gắn khi tên CLB xuất hiện trong TIÊU ĐỀ, HOẶC trong NỘI DUNG từ 2 lần trở lên.
 *
 * Vì sao không lỏng hơn: chỉ cần nhắc 1 lần là gắn thì bài về Liverpool lỡ nhắc
 * Arsenal một câu cũng chui vào hub Arsenal — hub đầy bài không liên quan bị coi
 * là trang rác, hại hơn lợi.
 * Vì sao không chặt hơn: chỉ khớp tiêu đề thì 4/5 hub không đủ 12 bài để được
 * index (đo thật: Arsenal 9, Man City 6, MU 4, Chelsea 4).
 *
 * Chạy thử:  railway run node apps/worker/tag-teams.mjs
 * Ghi thật:  railway run node apps/worker/tag-teams.mjs --live
 */
import { createClient } from '@supabase/supabase-js';

const LIVE = process.argv.includes('--live');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

/** slug hub -> các cách gọi tên CLB đó trên mặt báo. */
const HUB = {
  'man-united': ['manchester united', 'man united', 'man utd'],
  'arsenal': ['arsenal'],
  'chelsea': ['chelsea'],
  'man-city': ['manchester city', 'man city'],
  'vietnam': ['việt nam', 'viet nam', 'vietnam'],
};

const low = (s) => String(s ?? '').toLowerCase();
const demLan = (hay, keys) => keys.reduce((n, k) => n + (hay.split(k).length - 1), 0);

/** Cách B: tiêu đề khớp, hoặc nội dung nhắc >= 2 lần. */
function doiCuaBai(tieuDe, noiDung) {
  const ra = [];
  for (const [slug, keys] of Object.entries(HUB)) {
    if (keys.some((k) => tieuDe.includes(k)) || demLan(noiDung, keys) >= 2) ra.push(slug);
  }
  return ra;
}

// analysis_articles KHÔNG có cột id — khoá chính là slug (Gwen kiểm 25/8, script
// bản đầu dùng id nên chết ngay ở bảng này). Mỗi bảng khai rõ khoá của mình.
const BANG = [
  { ten: 'news_items', khoa: 'id', cot: 'id,slug,headline_vi,headline_en,body_vi,body_en,teams',
    tieuDe: (r) => low(`${r.headline_vi || r.headline_en} ${r.slug}`), noiDung: (r) => low(r.body_vi || r.body_en) },
  { ten: 'analysis_articles', khoa: 'slug', cot: 'slug,title,body,teams',
    tieuDe: (r) => low(`${r.title} ${r.slug}`), noiDung: (r) => low(r.body) },
];

let tongSua = 0;
for (const b of BANG) {
  const { data, error } = await sb.from(b.ten).select(b.cot).eq('status', 'published').limit(1000);
  if (error) { console.error(`${b.ten}: ${error.message}`); process.exit(1); }
  const dem = {};
  let sua = 0;
  for (const r of data) {
    const moi = doiCuaBai(b.tieuDe(r), b.noiDung(r));
    const cu = r.teams ?? [];
    moi.forEach((s) => { dem[s] = (dem[s] || 0) + 1; });
    // Chỉ ghi khi thật sự đổi — khỏi đụng vào dòng đã đúng.
    if (moi.length === cu.length && moi.every((x) => cu.includes(x))) continue;
    sua++;
    if (LIVE) {
      const { error: e2 } = await sb.from(b.ten).update({ teams: moi }).eq(b.khoa, r[b.khoa]);
      if (e2) console.warn(`  ✗ ${r.slug}: ${e2.message}`);
    }
  }
  console.log(`\n${b.ten}: ${data.length} bài · ${sua} bài cần gắn/đổi nhãn`);
  for (const s of Object.keys(HUB)) {
    const n = dem[s] || 0;
    console.log(`   ${s.padEnd(12)} ${String(n).padStart(3)} bài ${n >= 12 ? '✓ đủ 12, Google index được' : '✗ chưa đủ 12'}`);
  }
  tongSua += sua;
}
console.log(`\n${LIVE ? 'ĐÃ GHI' : 'CHẠY THỬ — chưa ghi gì'} · tổng ${tongSua} bài`);
if (!LIVE) console.log('Thêm --live để ghi thật.');
