import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await sb.from('fixtures')
  .select('id, home_team_name, away_team_name, kickoff_utc, status, home_score')
  .eq('competition_id', 'epl-2026')
  .order('kickoff_utc', { ascending: true });
if (error) { console.error(error.message); process.exit(1); }

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${msg}`); if (!ok) fail++; };

check(data.length === 380, `tổng số trận = ${data.length} (cần 380)`);

const teams = new Set();
data.forEach(f => { teams.add(f.home_team_name); teams.add(f.away_team_name); });
check(teams.size === 20, `số đội = ${teams.size} (cần 20)`);

// mỗi đội đúng 38 trận, 19 sân nhà 19 sân khách
const per = {};
for (const f of data) {
  per[f.home_team_name] ??= { h: 0, a: 0 }; per[f.away_team_name] ??= { h: 0, a: 0 };
  per[f.home_team_name].h++; per[f.away_team_name].a++;
}
const bad = Object.entries(per).filter(([, v]) => v.h !== 19 || v.a !== 19);
check(bad.length === 0, `mọi đội đá 19 nhà + 19 khách${bad.length ? ` — lệch: ${bad.map(([k, v]) => `${k}(${v.h}/${v.a})`).join(', ')}` : ''}`);

// không cặp nào lặp (mỗi cặp home-away chỉ 1 lần)
const pairs = new Map();
for (const f of data) {
  const k = `${f.home_team_name} vs ${f.away_team_name}`;
  pairs.set(k, (pairs.get(k) || 0) + 1);
}
const dups = [...pairs].filter(([, n]) => n > 1);
check(dups.length === 0, `không có cặp trùng${dups.length ? ` — trùng: ${dups.slice(0, 5).map(([k, n]) => `${k} x${n}`).join('; ')}` : ''}`);

// tự đá chính mình
check(!data.some(f => f.home_team_name === f.away_team_name), 'không có trận đội gặp chính nó');

// ngày hợp lệ, nằm trong mùa
const outside = data.filter(f => f.kickoff_utc < '2026-08-01' || f.kickoff_utc > '2027-06-30');
check(outside.length === 0, `mọi trận nằm trong mùa 2026/27${outside.length ? ` — lệch ${outside.length}` : ''}`);

// đối chiếu tay với lịch chính thức Premier League
const SPOT = [
  ['Arsenal', 'Coventry City', '2026-08-21T19:00'],
  ['Hull City', 'Manchester United', '2026-08-22T11:30'],
];
for (const [h, a, expect] of SPOT) {
  const f = data.find(x => x.home_team_name.includes(h.split(' ')[0]) && x.away_team_name.includes(a.split(' ')[0]));
  check(!!f && f.kickoff_utc.startsWith(expect), `${h} vs ${a} → ${f ? f.kickoff_utc : 'KHÔNG THẤY'} (cần ${expect}Z)`);
}

console.log('\n--- 5 trận sớm nhất ---');
for (const f of data.slice(0, 5)) {
  const vn = new Date(f.kickoff_utc).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`${f.kickoff_utc} (VN ${vn}) ${f.home_team_name} vs ${f.away_team_name} [${f.status}]`);
}
console.log(`\n${fail === 0 ? 'TẤT CẢ ĐỀU PASS' : `CÓ ${fail} MỤC FAIL`}`);
process.exit(fail === 0 ? 0 : 1);
