/**
 * Đăng bài tin lên Facebook kèm Story — cho những bài CHƯA lên.
 *
 * Vì sao script riêng chứ không nối vào code máy chủ: tin chuyển nhượng
 * (type='transfer') KHÔNG do bộ sinh tin của worker tạo ra — worker chỉ tạo
 * preview/result/standings. Tin transfer được ghi thẳng vào Supabase bằng
 * script rời, nên nối vào worker sẽ không bao giờ chạy (Gwen kiểm 25/8).
 *
 * KHÔNG cần cột "đã đăng chưa" trong DB: script tự hỏi Facebook xem bài đã
 * lên chưa, bằng cách tìm link /news/<slug> trong các bài gần đây của trang.
 * Nhờ vậy chạy lại bao nhiêu lần cũng không đăng trùng.
 *
 * Chạy thử (không đăng gì):  railway run node apps/worker/post-news-fb.mjs
 * Đăng thật:                 railway run node apps/worker/post-news-fb.mjs --live
 * Một bài cụ thể:            railway run node apps/worker/post-news-fb.mjs --live --slug <slug>
 */
import { createClient } from '@supabase/supabase-js';

const LIVE = process.argv.includes('--live');
const SLUG = (() => { const i = process.argv.indexOf('--slug'); return i > -1 ? process.argv[i + 1] : null; })();
const GIO = Number(process.env.NEWS_FB_HOURS ?? 26); // cửa sổ quét, mặc định 26h phủ 2 nhịp/ngày

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FB_PAGE_ID, FB_PAGE_TOKEN, SITE_URL } = process.env;
const site = SITE_URL || 'https://www.banhbong.net';
for (const [ten, v] of [['SUPABASE_URL', SUPABASE_URL], ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
                        ['FB_PAGE_ID', FB_PAGE_ID], ['FB_PAGE_TOKEN', FB_PAGE_TOKEN]]) {
  if (!v) { console.error(`thiếu ${ten}`); process.exit(1); }
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const fb = async (duong, init) => {
  const noi = duong.includes('?') ? '&' : '?';
  const r = await fetch(`https://graph.facebook.com/v19.0/${duong}${noi}access_token=${FB_PAGE_TOKEN}`, init);
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
  return body;
};

/** Bỏ dấu, bỏ ký tự lạ — để so tiêu đề bài với nội dung bài đã đăng. */
function chuanHoa(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Nội dung các bài trang đã đăng gần đây — trả cả link lẫn chữ đã chuẩn hoá.
 *
 *  ⚠️ KHÔNG dò bằng mỗi link được: bài Sávio đăng 25/8 để link Ở BÌNH LUẬN
 *  ("Chi tiết đầy đủ ở bình luận"), trong nội dung bài KHÔNG có /news/<slug>.
 *  Chỉ dò link thì tưởng chưa đăng và ĐĂNG TRÙNG lên trang thật. Nên phải dò
 *  thêm bằng tiêu đề (Gwen bắt được lúc chạy thử 25/8, trước khi đăng thật). */
async function daLenFacebook() {
  const co = new Set();
  const chu = [];
  // ĐỪNG thêm ?fields=message — v19 trả lỗi #100 "nonexisting field (message)".
  // Gọi trơn thì message có sẵn trong kết quả (Gwen thử thật 25/8).
  let duong = `${FB_PAGE_ID}/feed?limit=100`;
  for (let trang = 0; trang < 3 && duong; trang++) {
    const res = await fb(duong);
    for (const p of res.data ?? []) {
      const msg = String(p.message ?? '');
      for (const m of msg.matchAll(/\/news\/([a-z0-9-]+)/g)) co.add(m[1]);
      if (msg) chu.push(chuanHoa(msg));
    }
    const ke = res.paging?.next;
    duong = ke ? ke.replace(/^https:\/\/graph\.facebook\.com\/v19\.0\//, '').replace(/[?&]access_token=[^&]*/, '') : null;
  }
  return { slug: co, chu };
}

/** Bài này đã lên trang chưa: khớp link, hoặc khớp 40 ký tự đầu của tiêu đề. */
function daDang(bai, dd) {
  if (dd.slug.has(bai.slug)) return true;
  const td = chuanHoa(bai.headline_vi || bai.headline_en || '');
  if (td.length < 20) return false;
  const dau = td.slice(0, 40);
  return dd.chu.some((m) => m.includes(dau));
}

async function dangMotBai(bai) {
  const anh = bai.hero_card_url || `${site}/api/og/news/${bai.slug}?locale=vi`;
  const link = `${site}/news/${bai.slug}`;
  const tieuDe = (bai.headline_vi || bai.headline_en || '').trim();
  const caption = `${tieuDe}\n\n${link}`;
  if (!LIVE) { console.log(`   [thử] sẽ đăng: ${tieuDe.slice(0, 60)}…`); return; }

  const bv = await fb(`${FB_PAGE_ID}/photos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: anh, caption }),
  });
  console.log(`   ✓ bài trên bảng tin: ${bv.id}`);
  // Story đăng SAU: bài hỏng thì đừng đăng Story trỏ tới bài chưa có.
  try {
    const up = await fb(`${FB_PAGE_ID}/photos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: anh, published: false }),
    });
    const st = await fb(`${FB_PAGE_ID}/photo_stories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_id: up.id }),
    });
    console.log(`   ✓ Story: ${st.post_id ?? '(không trả id)'}`);
  } catch (e) {
    console.warn(`   ⚠ Story hỏng (bài trên bảng tin VẪN SỐNG): ${e.message}`);
  }
}

const tu = new Date(Date.now() - GIO * 3600_000).toISOString();
let q = sb.from('news_items')
  .select('slug, headline_vi, headline_en, hero_card_url, published_at')
  .eq('status', 'published').order('published_at', { ascending: true });
q = SLUG ? q.eq('slug', SLUG) : q.gte('published_at', tu);
const { data, error } = await q;
if (error) { console.error('đọc Supabase hỏng:', error.message); process.exit(1); }

const daCo = await daLenFacebook();
const daBo = (data ?? []).filter((b) => daDang(b, daCo));
const canDang = (data ?? []).filter((b) => !daDang(b, daCo));
console.log(`${LIVE ? 'ĐĂNG THẬT' : 'CHẠY THỬ'} · ${data?.length ?? 0} bài trong ${GIO}h · ${daBo.length} bài ĐÃ có trên FB · ${canDang.length} bài cần đăng\n`);
for (const b of daBo) console.log(`   (bỏ qua, đã đăng) ${b.slug}`);
for (const bai of canDang) {
  console.log(`→ ${bai.slug}`);
  try { await dangMotBai(bai); }
  catch (e) { console.error(`   ✗ hỏng: ${e.message}`); }
}
if (canDang.length === 0) console.log('Không có bài nào cần đăng.');
