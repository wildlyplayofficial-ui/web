/**
 * Thu thập kèo Bet365 cho các trận sắp đá → bảng odds_snapshots.
 * Chạy 3 tiếng/lần (Nick chốt 23/8). Kèo quá khứ không mua lại được nên job này
 * chỉ có giá trị khi chạy đều từ sớm.
 *
 * Lấy 4 loại kèo dùng cho trang: ML (1x2), Spread (handicap châu Á),
 * Totals (tài xỉu), European Handicap. Các kèo phụ (góc, thẻ, cầu thủ) bỏ qua —
 * 119 loại/trận là quá thừa cho trang hiển thị, chỉ tổ phình bảng.
 *
 * Chạy: node collect-odds.mjs         (thử, không ghi)
 *       node collect-odds.mjs --live  (ghi thật)
 */
import { createClient } from '@supabase/supabase-js';

const KEY = process.env.ODDS_API_KEY;
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const live = process.argv.includes('--live');

const LEAGUES = [
  ['england-premier-league', 'epl-2026'],
  ['spain-laliga', 'laliga-2026'],
  ['italy-serie-a', 'seriea-2026'],
  ['germany-bundesliga', 'bundesliga-2026'],
  ['france-ligue-1', 'ligue1-2026'],
  // Cúp C1 mùa này chưa mở kèo trong nguồn (vòng bảng chưa tới) — thêm lại khi có.
  ['international-clubs-uefa-champions-league-playoff-round', 'ucl-2026'],
];
const MARKETS = new Set(['ML', 'Spread', 'Totals', 'European Handicap']);
const HORIZON_H = 96; // chỉ lấy trận đá trong 4 ngày tới — kèo xa còn loãng, tốn lượt gọi

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

async function api(path) {
  const res = await fetch(`https://api.odds-api.io/v3/${path}${path.includes('?') ? '&' : '?'}apiKey=${KEY}`);
  if (!res.ok) throw new Error(`odds-api ${res.status} ${path.split('?')[0]}`);
  return res.json();
}

const now = Date.now();
const rows = [];
let matches = 0;

for (const [slug, compId] of LEAGUES) {
  let events;
  try {
    events = await api(`events?sport=football&league=${slug}`);
  } catch (err) {
    console.warn(`bỏ ${slug}: ${err.message}`);
    continue;
  }
  const upcoming = events.filter((e) => {
    const t = new Date(e.date).getTime();
    return t > now && t < now + HORIZON_H * 3600_000;
  });
  for (const ev of upcoming) {
    let data;
    try {
      data = await api(`odds?eventId=${ev.id}&bookmakers=Bet365`);
    } catch (err) {
      console.warn(`  bỏ trận ${ev.home} vs ${ev.away}: ${err.message}`);
      continue;
    }
    const markets = data?.bookmakers?.Bet365 ?? [];
    if (!markets.length) continue;
    matches++;
    const base = {
      event_id: ev.id, competition_id: compId,
      home_team: ev.home, away_team: ev.away, kickoff_utc: ev.date,
      bookmaker: 'Bet365',
    };
    for (const m of markets) {
      if (!MARKETS.has(m.name)) continue;
      for (const o of m.odds ?? []) {
        rows.push({
          ...base, market: m.name, hdp: num(o.hdp),
          home_odds: num(o.home), draw_odds: num(o.draw), away_odds: num(o.away),
          over_odds: num(o.over), under_odds: num(o.under),
          source_updated_at: m.updatedAt ?? null,
        });
      }
    }
  }
}

console.log(`${matches} trận có kèo → ${rows.length} dòng`);
if (!live) {
  console.log(JSON.stringify(rows.slice(0, 3), null, 1));
  process.exit(0);
}

// ghi theo lô để không vượt giới hạn payload
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await sb.from('odds_snapshots').insert(rows.slice(i, i + 500));
  if (error) throw new Error(`insert: ${error.message}`);
}
console.log(`ĐÃ GHI ${rows.length} dòng lúc ${new Date().toISOString()}`);
