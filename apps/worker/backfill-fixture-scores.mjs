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

const { data: live, error: le } = await sb
  .from('match_live_state')
  .select('id, home_team, away_team, home_score, away_score, kickoff_utc, status')
  .eq('status', 'finished')
  .not('home_score', 'is', null);
if (le) throw new Error(`đọc match_live_state: ${le.message}`);

// Chỉ lấy fixtures đang TRỐNG tỷ số (không đè cái đã có).
const { data: fix, error: fe } = await sb
  .from('fixtures')
  .select('id, home_team_name, away_team_name, kickoff_utc, livescore_match_id')
  .is('home_score', null);
if (fe) throw new Error(`đọc fixtures: ${fe.message}`);

const byId = new Map(fix.filter((f) => f.livescore_match_id).map((f) => [String(f.livescore_match_id), f]));
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
  let target = byId.get(String(m.id));
  let via = 'id';
  if (!target) {
    const cands = byNames.get(`${norm(m.home_team)}|${norm(m.away_team)}`) || [];
    target = cands.find((f) => dayDiff(f.kickoff_utc, m.kickoff_utc) <= 1);
    via = 'name+date';
  }
  if (!target) { unm++; continue; }
  if (via === 'id') l1++;
  else { l2++; nameLog.push(`${m.home_team} vs ${m.away_team} @${String(m.kickoff_utc).slice(0, 10)}`); }
  updates.push({ fixId: target.id, hs: m.home_score, as: m.away_score });
}

console.log(`finished(live)=${live.length}  fixtures-trống=${fix.length}`);
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
