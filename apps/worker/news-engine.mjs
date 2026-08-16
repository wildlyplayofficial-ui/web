/**
 * Phần ruột máy tin WildlyPlay — sinh bài preview / kết quả từ DB thật.
 *
 * Thiết kế theo docs/SPEC-wp-auto-news-2026-08-16.md:
 *  - CHỈ dùng dữ liệu có trong bảng `fixtures`. Không gọi LLM, không lấy tin ngoài
 *    → không có chỗ để bịa số, và không tốn tiền mỗi lần chạy.
 *  - CHỈ sinh 3 loại: xem trước trận, kết quả trận, bảng xếp hạng. KHÔNG tin chuyển nhượng.
 *  - Lọc giải theo tầng: T3 (vòng sơ loại, giải ít người đọc) bị chặn cứng.
 *  - Ảnh bìa lấy từ bộ 20 ảnh CLB đã dựng sẵn trên storage → worker không cần vẽ ảnh lúc chạy.
 *
 * Cách Gwen ráp vào worker (theo nếp src/buzz.ts, src/digest.ts):
 *   import { runNewsTick } from './news-engine.mjs';
 *   // 05:00 giờ VN = 22:00 UTC hôm trước; 17:00 giờ VN = 10:00 UTC
 *   runNewsTick({ mode: 'morning', dryRun: false });
 */

import { createClient } from '@supabase/supabase-js';

const SITE = process.env.SITE_URL || 'https://www.wildlyplay.com';
const STORAGE = 'https://rtsyrktpodspdobelyqs.supabase.co/storage/v1/object/public/player-photos';

/** Giải được phép tự đăng (tầng 1). Tầng 3 không nằm ở đây nên không bao giờ lọt. */
const TIER1 = new Set([
  'epl-2026', 'laliga-2026', 'seriea-2026', 'bundesliga-2026', 'ligue1-2026',
  'ucl-2026', 'wc-afc-qual-2026',
]);

/** UCL chỉ nhận từ vòng bảng trở đi — vòng sơ loại là nguồn rác đã biết. */
const UCL_LEAGUE_PHASE_FROM = '2026-09-01';

const LEAGUE_LABEL = {
  'epl-2026': 'Premier League',
  'laliga-2026': 'La Liga',
  'seriea-2026': 'Serie A',
  'bundesliga-2026': 'Bundesliga',
  'ligue1-2026': 'Ligue 1',
  'ucl-2026': 'Champions League',
  'wc-afc-qual-2026': 'World Cup AFC Qualifiers',
};

/** Bài nhận định mùa giải đã có — bài tự động link về đây để cụm dính chùm. */
const CLUB_ARTICLE = {
  'manchester-united': 'nhan-dinh-man-utd-2026-27-carrick',
  arsenal: 'nhan-dinh-arsenal-2026-27-bao-ve-ngoi-vuong',
  liverpool: 'nhan-dinh-liverpool-2026-27-hau-salah',
  chelsea: 'nhan-dinh-chelsea-2026-27-xabi-alonso',
  'manchester-city': 'nhan-dinh-man-city-2026-27-maresca',
  'tottenham-hotspur': 'nhan-dinh-tottenham-2026-27-de-zerbi',
};

const VN_TZ = 'Asia/Ho_Chi_Minh';
const DAYS = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Giờ Việt Nam dạng "20h00 thứ Bảy 22/8/2026". */
function vnTime(iso) {
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: VN_TZ, weekday: 'short', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  const dow = DAYS[new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay()];
  return { text: `${p.hour}h${p.minute} ${dow} ${+p.day}/${+p.month}/${p.year}`, date: `${p.year}-${p.month}-${p.day}` };
}

function allowed(f) {
  if (!TIER1.has(f.competition_id)) return false;
  if (f.competition_id === 'ucl-2026' && f.kickoff_utc < UCL_LEAGUE_PHASE_FROM) return false;
  return true;
}

/** Phong độ 5 trận gần nhất, tính từ chính bảng fixtures (không có bảng standings). */
async function form(sb, teamName, beforeIso, competitionId) {
  const { data } = await sb.from('fixtures')
    .select('home_team_name, away_team_name, home_score, away_score, kickoff_utc')
    .eq('competition_id', competitionId)
    .lt('kickoff_utc', beforeIso)
    .not('home_score', 'is', null)
    .or(`home_team_name.eq.${teamName},away_team_name.eq.${teamName}`)
    .order('kickoff_utc', { ascending: false })
    .limit(5);
  if (!data?.length) return null;
  const out = data.map((m) => {
    const home = m.home_team_name === teamName;
    const gf = home ? m.home_score : m.away_score;
    const ga = home ? m.away_score : m.home_score;
    return { r: gf > ga ? 'T' : gf < ga ? 'B' : 'H', opp: home ? m.away_team_name : m.home_team_name, gf, ga, home };
  });
  return {
    streak: out.map((o) => o.r).join(' '),
    won: out.filter((o) => o.r === 'T').length,
    lost: out.filter((o) => o.r === 'B').length,
    drew: out.filter((o) => o.r === 'H').length,
    last: out[0],
  };
}

/** Bảng xếp hạng tự tính từ các trận đã đá. */
async function table(sb, competitionId) {
  const { data } = await sb.from('fixtures')
    .select('home_team_name, away_team_name, home_score, away_score')
    .eq('competition_id', competitionId)
    .not('home_score', 'is', null);
  const t = new Map();
  const row = (n) => t.get(n) || t.set(n, { name: n, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }).get(n);
  for (const m of data || []) {
    const h = row(m.home_team_name); const a = row(m.away_team_name);
    h.p++; a.p++; h.gf += m.home_score; h.ga += m.away_score; a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.w++; h.pts += 3; a.l++; }
    else if (m.home_score < m.away_score) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...t.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}

const rank = (tbl, name) => {
  const i = tbl.findIndex((r) => r.name === name);
  return i < 0 ? null : { pos: i + 1, ...tbl[i] };
};

const formLine = (name, f) =>
  f ? `${name} 5 trận gần nhất thắng ${f.won}, hoà ${f.drew}, thua ${f.lost} (${f.streak}).`
    : `${name} chưa có đủ trận trong mùa để tính phong độ.`;

const rankLine = (name, r) =>
  r ? `${name} đang đứng thứ ${r.pos} với ${r.pts} điểm sau ${r.p} trận.` : null;

function clubLinks(homeSlug, awaySlug) {
  const out = [];
  for (const s of [homeSlug, awaySlug]) {
    if (CLUB_ARTICLE[s]) out.push(`[nhận định mùa giải](/vi/analysis/${CLUB_ARTICLE[s]})`);
  }
  return out;
}

/** ---- Khuôn bài xem trước ---- */
function buildPreview(f, ctx) {
  const t = vnTime(f.kickoff_utc);
  const league = LEAGUE_LABEL[f.competition_id];
  const title = `${f.home_team_name} vs ${f.away_team_name}: xem trước, ${t.text.split(' ')[0]} giờ VN`;
  const lines = [
    `${f.home_team_name} tiếp ${f.away_team_name} lúc ${t.text} giờ Việt Nam, thuộc ${league} mùa 2026/27${f.venue ? `, trên sân ${f.venue}` : ''}.`,
    '',
    `## Hai đội đang chơi thế nào`,
    '',
    formLine(f.home_team_name, ctx.homeForm),
    '',
    formLine(f.away_team_name, ctx.awayForm),
    '',
  ];
  const rh = rankLine(f.home_team_name, ctx.homeRank);
  const ra = rankLine(f.away_team_name, ctx.awayRank);
  if (rh || ra) lines.push('## Vị trí trên bảng xếp hạng', '', [rh, ra].filter(Boolean).join(' '), '');
  lines.push(
    '## Xem trận này ở đâu',
    '',
    `Trận đấu diễn ra lúc ${t.text} giờ Việt Nam. Bản quyền ${league === 'Premier League' ? 'Ngoại hạng Anh mùa này do FPT Play nắm giữ, chi tiết gói xem có trong bài [xem Ngoại hạng Anh 2026/27 ở đâu](/vi/analysis/xem-ngoai-hang-anh-2026-27-o-dau-fpt-play-thay-k-plus)' : 'tuỳ từng giải, xem lịch phát sóng của nhà đài trong nước'}.`,
    '',
  );
  const links = clubLinks(ctx.homeSlug, ctx.awaySlug);
  if (links.length) lines.push(`Tìm hiểu sâu hơn về hai đội mùa này: ${links.join(' · ')}.`, '');
  lines.push(`Số liệu trong bài lấy từ dữ liệu trận đấu của WildlyPlay, cập nhật tới thời điểm đăng.`);
  return { title, body: lines.join('\n'), kind: 'preview' };
}

/** ---- Khuôn bài kết quả ---- */
function buildRecap(f, ctx) {
  const t = vnTime(f.kickoff_utc);
  const league = LEAGUE_LABEL[f.competition_id];
  const win = f.home_score > f.away_score ? f.home_team_name
    : f.home_score < f.away_score ? f.away_team_name : null;
  const title = `${f.home_team_name} ${f.home_score}-${f.away_score} ${f.away_team_name}: kết quả ${league}`;
  const lines = [
    `${f.home_team_name} ${f.home_score}-${f.away_score} ${f.away_team_name} là kết quả trận ${league} diễn ra lúc ${t.text} giờ Việt Nam${f.venue ? ` trên sân ${f.venue}` : ''}.`,
    '',
    win ? `${win} giành trọn 3 điểm.` : 'Hai đội chia điểm.',
    '',
    '## Kết quả này nói lên điều gì',
    '',
    formLine(f.home_team_name, ctx.homeForm),
    '',
    formLine(f.away_team_name, ctx.awayForm),
    '',
  ];
  const rh = rankLine(f.home_team_name, ctx.homeRank);
  const ra = rankLine(f.away_team_name, ctx.awayRank);
  if (rh || ra) lines.push('## Bảng xếp hạng sau trận', '', [rh, ra].filter(Boolean).join(' '), '');
  const links = clubLinks(ctx.homeSlug, ctx.awaySlug);
  if (links.length) lines.push(`Tìm hiểu sâu hơn về hai đội mùa này: ${links.join(' · ')}.`, '');
  lines.push('Số liệu trong bài lấy từ dữ liệu trận đấu của WildlyPlay, cập nhật tới thời điểm đăng.');
  return { title, body: lines.join('\n'), kind: 'recap' };
}

async function heroFor(sb, homeName) {
  const { data } = await sb.from('teams').select('slug').eq('canonical_name', homeName).maybeSingle();
  const slug = data?.slug || slugify(homeName);
  const url = `${STORAGE}/club-${slug}.jpg`;
  const head = await fetch(url, { method: 'HEAD' });
  return head.status === 200 ? url : null;
}

async function publish(sb, { slug, title, body, kind, league, heroImage, matchId }) {
  const nowIso = new Date().toISOString();
  const { error } = await sb.from('analysis_articles').upsert({
    slug, kind, tier: 'T1_covered', league, title, body,
    byline: 'WildlyPlay Desk', author_type: 'desk_ai',
    hero_image: heroImage, match_id: matchId ?? null,
    status: 'published', published_at: nowIso,
  }, { onConflict: 'slug' });
  if (error) throw new Error(`upsert ${slug}: ${error.message}`);

  const rev = await fetch(`${SITE}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
    body: JSON.stringify({ tags: ['analysis-articles'] }),
  });
  if (!rev.ok) throw new Error(`revalidate ${slug}: HTTP ${rev.status}`);

  // verify bản live — đọc HTML thô, không tin trình duyệt
  const url = `${SITE}/vi/analysis/${slug}`;
  const page = await fetch(url);
  const html = await page.text();
  if (page.status !== 200) throw new Error(`verify ${slug}: HTTP ${page.status}`);
  if (!html.includes(title)) throw new Error(`verify ${slug}: không thấy tiêu đề trong HTML`);

  await fetch(`${SITE}/api/indexnow`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
    body: JSON.stringify({ urls: [url] }),
  });
  return url;
}

/**
 * Một nhịp chạy.
 * @param {'morning'|'evening'} mode  morning = dọn kết quả đêm qua, evening = xem trước trận tối
 * @param {boolean} dryRun            true = chỉ trả về bài, KHÔNG ghi DB
 * @param {number} limit              trần số bài mỗi nhịp, tránh đăng ồ ạt
 * @param {string} [now]              ISO thời điểm giả lập, chỉ dùng khi chạy thử
 */
export async function runNewsTick({ mode = 'evening', dryRun = true, limit = 3, now: nowIso } = {}) {
  const sb = db();
  const now = nowIso ? new Date(nowIso) : new Date();
  const results = [];

  const from = new Date(now.getTime() - (mode === 'morning' ? 20 : 0) * 3600e3);
  const to = new Date(now.getTime() + (mode === 'morning' ? 0 : 30) * 3600e3);

  let q = sb.from('fixtures')
    .select('id, competition_id, home_team_name, away_team_name, kickoff_utc, home_score, away_score, venue, status')
    .gte('kickoff_utc', from.toISOString())
    .lte('kickoff_utc', to.toISOString())
    .order('kickoff_utc', { ascending: true });
  if (mode === 'morning') q = q.not('home_score', 'is', null);
  const { data: fixtures, error } = await q;
  if (error) throw new Error(`đọc fixtures: ${error.message}`);

  const eligible = (fixtures || []).filter(allowed);
  const skipped = (fixtures || []).length - eligible.length;
  if (skipped) console.log(`news-engine: bỏ qua ${skipped} trận không thuộc tầng 1`);

  for (const f of eligible.slice(0, limit)) {
    const t = vnTime(f.kickoff_utc);
    const homeSlug = slugify(f.home_team_name);
    const awaySlug = slugify(f.away_team_name);
    const slug = mode === 'morning'
      ? `ket-qua-${homeSlug}-vs-${awaySlug}-${t.date}`
      : `xem-truoc-${homeSlug}-vs-${awaySlug}-${t.date}`;

    // Chống trùng 2 lớp:
    //  (1) theo đường dẫn bài — chặn chính máy này chạy lại 2 lần.
    //  (2) theo mã trận — chặn trùng với analysis cron sẵn có trong worker (src/news.ts),
    //      vì cả hai cùng ghi vào bảng analysis_articles. Thiếu lớp này là ra 2 bài cùng 1 trận.
    const { data: bySlug } = await sb.from('analysis_articles').select('slug').eq('slug', slug).maybeSingle();
    if (bySlug) { console.log(`news-engine: đã có bài ${slug}, bỏ qua`); continue; }

    const { data: byMatch } = await sb.from('analysis_articles')
      .select('slug').eq('match_id', f.id).limit(1);
    if (byMatch?.length) {
      console.log(`news-engine: trận ${f.id} đã có bài ${byMatch[0].slug} (máy khác đăng), bỏ qua`);
      continue;
    }

    const tbl = await table(sb, f.competition_id);
    const ctx = {
      homeSlug, awaySlug,
      homeForm: await form(sb, f.home_team_name, f.kickoff_utc, f.competition_id),
      awayForm: await form(sb, f.away_team_name, f.kickoff_utc, f.competition_id),
      homeRank: rank(tbl, f.home_team_name),
      awayRank: rank(tbl, f.away_team_name),
    };

    // CHỐT CHỐNG BÀI MỎNG: xem trước mà cả hai đội đều chưa có phong độ lẫn vị trí trên bảng
    // (điển hình là vòng 1) thì bài chỉ còn mỗi dòng giờ đá — đúng loại bài Google không index.
    // Trường hợp đó để người viết tay, máy không đăng.
    const noData = !ctx.homeForm && !ctx.awayForm && !ctx.homeRank && !ctx.awayRank;
    if (mode === 'evening' && noData) {
      console.log(`news-engine: ${slug} chưa có phong độ/BXH (vòng đầu mùa) → để viết tay, không đăng`);
      continue;
    }

    const built = mode === 'morning' ? buildRecap(f, ctx) : buildPreview(f, ctx);
    const heroImage = await heroFor(sb, f.home_team_name);
    if (!heroImage) { console.log(`news-engine: chưa có ảnh bìa cho ${f.home_team_name}, bỏ qua ${slug}`); continue; }

    if (dryRun) { results.push({ slug, ...built, heroImage, dryRun: true }); continue; }
    const url = await publish(sb, {
      slug, ...built, league: LEAGUE_LABEL[f.competition_id], heroImage, matchId: f.id,
    });
    results.push({ slug, title: built.title, url });
  }

  console.log(`news-engine[${mode}${dryRun ? ' · chạy thử' : ''}]: ${results.length} bài`);
  return results;
}

// chạy tay: node news-engine.mjs morning|evening [--live] [--now=2026-08-21T14:00:00Z]
if (process.argv[1]?.endsWith('news-engine.mjs')) {
  const mode = process.argv[2] === 'morning' ? 'morning' : 'evening';
  const dryRun = !process.argv.includes('--live');
  const now = process.argv.find((a) => a.startsWith('--now='))?.slice(6);
  runNewsTick({ mode, dryRun, now }).then((r) => {
    for (const a of r) {
      console.log('\n=== ' + a.slug + ' ===');
      console.log(a.title);
      if (a.body) console.log('\n' + a.body);
      if (a.url) console.log(a.url);
    }
  }).catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
}
