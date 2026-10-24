/**
 * Chép tỷ số ngược từ bảng trực tiếp (match_live_state, trận đã kết thúc) về bảng
 * lịch (fixtures) — vì fixtures KHÔNG bao giờ có tỷ số (Jane bắt 16/8), khiến máy tin
 * đọc phong độ/BXH/kết quả toàn rỗng rồi nhịn vĩnh viễn.
 *
 * Ghép 2 lớp (thiết kế Jane):
 *  1. Theo MÃ: fixtures.livescore_match_id == match_live_state.id — chính xác tuyệt đối.
 *  2. Không có mã → theo TÊN chuẩn hoá + NGÀY lệch ≤1 — và GHI LOG trận nào ghép kiểu này.
 *     Không khớp thì BỎ (để trống hơn gán nhầm).
 * Chỉ điền vào fixtures đang TRỐNG tỷ số, không đè.
 *
 * Chạy:  node backfill-fixture-scores.mjs         (dry-run, chỉ đếm)
 *        node backfill-fixture-scores.mjs --live   (ghi thật)
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const dryRun = !process.argv.includes('--live');

const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const dayDiff = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

/** Supabase cắt 1000 dòng/request. fixtures TRỐNG tỷ số đã 1860 dòng (đo 9/9/2026),
 *  nên select không phân trang chỉ thấy 1000 — 860 trận VĨNH VIỄN không được điền,
 *  mà lại im lặng, không báo lỗi. order('id') để thứ tự trang ổn định giữa các lần gọi. */
async function layHet(bang, cot, dungLoc) {
  const buoc = 1000;
  const ra = [];
  for (let i = 0; ; i += buoc) {
    const { data, error } = await dungLoc(sb.from(bang).select(cot).order('id')).range(i, i + buoc - 1);
    if (error) throw new Error(`đọc ${bang}: ${error.message}`);
    ra.push(...(data ?? []));
    if (!data || data.length < buoc) return ra;
  }
}

const live = await layHet(
  'match_live_state',
  'id, home_team, away_team, home_score, away_score, kickoff_utc, status',
  (q) => q.eq('status', 'finished').not('home_score', 'is', null),
);

// Chỉ lấy fixtures đang TRỐNG tỷ số (không đè cái đã có).
const fix = await layHet(
  'fixtures',
  'id, home_team_name, away_team_name, kickoff_utc, livescore_match_id',
  (q) => q.is('home_score', null),
);

// MỘT mã livescore có thể ứng với NHIỀU dòng fixtures — kho đang có 318 dòng nhân
// bản (đo 9/9/2026: "Liverpool" và "Liverpool FC" thành 2 trận, cùng mã 1877265).
// Map<mã, MỘT dòng> thì chỉ dòng cuối thắng, dòng kia mãi mãi trống. Phải giữ MẢNG,
// và điền cho TẤT CẢ dòng cùng mã. Trước khi vá: chạy lần 1 điền 194, chạy lần 2 vẫn
// còn 114 trận nữa — đúng số dòng bị Map nuốt.
const byId = new Map();
for (const f of fix) {
  if (!f.livescore_match_id) continue;
  const k = String(f.livescore_match_id);
  if (!byId.has(k)) byId.set(k, []);
  byId.get(k).push(f);
}
const byNames = new Map();
for (const f of fix) {
  const k = `${norm(f.home_team_name)}|${norm(f.away_team_name)}`;
  if (!byNames.has(k)) byNames.set(k, []);
  byNames.get(k).push(f);
}

let l1 = 0, l2 = 0, unm = 0;
const updates = [];
const nameLog = [];
for (const m of live) {
  let targets = byId.get(String(m.id));
  let via = 'id';
  if (!targets || !targets.length) {
    const cands = byNames.get(`${norm(m.home_team)}|${norm(m.away_team)}`) || [];
    // Ghép theo tên thì mơ hồ hơn — chỉ nhận khi có ĐÚNG MỘT ứng viên trong ±1 ngày,
    // nhiều ứng viên là không biết trận nào, thà để trống.
    const gan = cands.filter((f) => dayDiff(f.kickoff_utc, m.kickoff_utc) <= 1);
    targets = gan.length === 1 ? gan : [];
    via = 'name+date';
  }
  if (!targets.length) { unm++; continue; }
  if (via === 'id') l1 += targets.length;
  else { l2 += targets.length; nameLog.push(`${m.home_team} vs ${m.away_team} @${String(m.kickoff_utc).slice(0, 10)}`); }
  for (const t of targets) updates.push({ fixId: t.id, hs: m.home_score, as: m.away_score });
}

console.log(`finished(live)=${live.length}  fixtures-trống=${fix.length}`);
if (live.length % 1000 === 0 || fix.length % 1000 === 0) {
  console.log('  ⚠️ số dòng chia hết 1000 — soi lại xem phân trang có chạy đủ không.');
}
console.log(`GHÉP: mã=${l1}  tên+ngày=${l2}  không khớp=${unm}  → sẽ điền ${updates.length} trận`);
if (nameLog.length) console.log('  [ghép bằng tên, cần soi]:\n   ' + nameLog.slice(0, 40).join('\n   '));

if (dryRun) {
  console.log('DRY-RUN — không ghi gì.');
} else {
  let ok = 0;
  for (const u of updates) {
    const { error } = await sb.from('fixtures')
      .update({ home_score: u.hs, away_score: u.as }).eq('id', u.fixId);
    if (error) console.log(`  lỗi ghi ${u.fixId}: ${error.message}`); else ok++;
  }
  console.log(`ĐÃ GHI ${ok}/${updates.length} trận.`);
}
