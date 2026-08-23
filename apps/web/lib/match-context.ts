import { getSupabase } from "./supabase";
import { buildMatchSlug } from "./data";
import eplSeason from "./data/epl-2026-27-season.json";
import laligaSeason from "./data/laliga-2026-27-season.json";
import serieaSeason from "./data/seriea-2026-27-season.json";
import bundesligaSeason from "./data/bundesliga-2026-27-season.json";
import ligue1Season from "./data/ligue1-2026-27-season.json";

/**
 * Dữ liệu THẬT cho trang trận, lấy từ bảng fixtures + odds_snapshots.
 *
 * Vì sao có file này: trang /match/<slug> chỉ dựng được khi có nội dung biên tập
 * (kèo, bài viết). Trận chưa có gì thì rơi vào nhánh "chưa có nội dung" — đúng
 * 96 chữ, không có cả SportsEvent (đo 23/8, 350 trang như vậy đang để index).
 * Mà Google phạt tay site có "nội dung mỏng ít giá trị thêm" (Search Console
 * Training #13), và trận SẮP ĐÁ mới là trận người ta tìm nhiều nhất.
 *
 * Nguyên tắc: mọi con số ở đây tính bằng code từ dữ liệu thật — không cho AI
 * sinh văn, không viết tay. Thiếu dữ liệu thì bỏ khối đó, không bịa.
 */

export interface TeamForm {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Kết quả 5 trận gần nhất, mới nhất trước: 'T' | 'H' | 'B' */
  recent: ("T" | "H" | "B")[];
}

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  points: number;
  position: number;
}

export interface HeadToHead {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export interface MatchOdds {
  home: number | null;
  draw: number | null;
  away: number | null;
  /** Xác suất thực sau khi bóc phần nhà cái giữ lại */
  prob: { home: number; draw: number; away: number; margin: number } | null;
  capturedAt: string;
}

export interface RoundMatch {
  slug: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
}

export interface MatchContext {
  fixtureId: string;
  competitionId: string;
  /** Vòng đấu theo lịch mùa, null nếu trận không nằm trong 5 giải có lịch tĩnh */
  round: string | null;
  /** Các trận còn lại cùng vòng — dữ liệu thật, đồng thời là đường dẫn nội bộ */
  sameRound: RoundMatch[];
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeForm: TeamForm | null;
  awayForm: TeamForm | null;
  homeStanding: StandingRow | null;
  awayStanding: StandingRow | null;
  standingsSize: number;
  h2h: HeadToHead[];
  odds: MatchOdds | null;
}

interface FixtureRow {
  id: string;
  /** Có mã Livescore = giờ đã đồng bộ từ nguồn thật, không phải giờ tạm */
  livescore_match_id?: string | null;
  competition_id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_utc: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
}

/** Xác suất thực từ kèo 1x2: bóc phần nhà cái giữ lại rồi chuẩn hoá về 100%.
 *  Pure — cùng công thức với worker (`odds-collect.ts`), giữ hai bên khớp nhau. */
export function trueProbabilities(
  home: number | null, draw: number | null, away: number | null,
): { home: number; draw: number; away: number; margin: number } | null {
  if (!home || !draw || !away || home <= 1 || draw <= 1 || away <= 1) return null;
  const raw = [1 / home, 1 / draw, 1 / away];
  const total = raw[0] + raw[1] + raw[2];
  if (total <= 0) return null;
  return { home: raw[0] / total, draw: raw[1] / total, away: raw[2] / total, margin: total - 1 };
}

/** Tên đội rút về dạng so sánh được: bỏ dấu câu và bỏ hậu tố kiểu "FC", "AFC"
 *  — slug ngoài đời có cả `liverpool-fc` lẫn `liverpool` cho cùng một đội. */
const CLUB_SUFFIXES = new Set(["fc", "afc", "cf", "sc", "ac", "club"]);
export function norm(name: string): string {
  return name.toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w && !CLUB_SUFFIXES.has(w))
    .join("");
}

interface SeasonFixture {
  round: string;
  date: string;
  time: string;
  homeName: string;
  awayName: string;
  /** true = giờ mới là tạm tính, chưa được giải công bố */
  provisional?: boolean;
}

/** Lịch cả mùa 5 giải, ĐÚNG nguồn mà sơ đồ web dùng để sinh slug (`lib/data.ts`).
 *
 *  Bảng `fixtures` trong CSDL thiếu nặng — La Liga 26/380, Serie A 15, Bundesliga
 *  7, Ligue 1 16 — và giờ đá lệch một hai ngày so với lịch tĩnh. Hệ quả đo 23/8:
 *  184/350 trang trận trong sơ đồ tra không ra trận nào. Đọc chung một nguồn với
 *  sơ đồ thì slug luôn khớp. */
const SEASONS: Array<[SeasonFixture[], string]> = [
  [eplSeason, "epl-2026"],
  [laligaSeason, "laliga-2026"],
  [serieaSeason, "seriea-2026"],
  [bundesligaSeason, "bundesliga-2026"],
  [ligue1Season, "ligue1-2026"],
];

const seasonKickoff = (f: SeasonFixture) => `${f.date}T${f.time}:00Z`;

/** Tìm trận trong lịch mùa: khớp tên đã chuẩn hoá, ngày lệch tối đa 2 hôm. */
export function findInSeason(home: string, away: string, date: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  for (const [season, competitionId] of SEASONS) {
    const hit = season
      .filter((f) => norm(f.homeName) === norm(home) && norm(f.awayName) === norm(away)
        && Math.abs(Date.parse(`${f.date}T00:00:00Z`) - target) <= 2 * 86_400_000)
      .sort((a, b) => Math.abs(Date.parse(`${a.date}T00:00:00Z`) - target)
        - Math.abs(Date.parse(`${b.date}T00:00:00Z`) - target))[0];
    if (hit) return { hit, competitionId, season };
  }
  return null;
}

/** Bảng xếp hạng tính từ các trận ĐÃ có tỷ số của giải đó. Pure.
 *
 *  `allTeams` là danh sách đội đầy đủ của giải (lấy từ lịch mùa). Không truyền
 *  thì mẫu số sai: CSDL Bundesliga mới có 7 trận, chỉ lộ mặt 14 đội, nên trang
 *  hiện "hạng 3/14" trong khi giải có 18 đội (đo 23/8). */
export function buildStandings(rows: FixtureRow[], allTeams: string[] = []): StandingRow[] {
  const table = new Map<string, Omit<StandingRow, "position">>();
  const seed = (team: string) => {
    const key = norm(team);
    if (!table.has(key)) {
      table.set(key, { team, played: 0, won: 0, drawn: 0, lost: 0, goalDiff: 0, points: 0 });
    }
    return table.get(key)!;
  };
  // Đội chưa đá trận nào vẫn phải có mặt trên bảng (P=0) — bỏ đi là bảng thiếu đội.
  for (const t of allTeams) seed(t);
  for (const r of rows) { seed(r.home_team_name); seed(r.away_team_name); }
  for (const r of rows) {
    if (r.home_score === null || r.away_score === null) continue;
    const h = seed(r.home_team_name); const a = seed(r.away_team_name);
    h.played++; a.played++;
    h.goalDiff += r.home_score - r.away_score;
    a.goalDiff += r.away_score - r.home_score;
    if (r.home_score > r.away_score) { h.won++; h.points += 3; a.lost++; }
    else if (r.home_score < r.away_score) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  return [...table.values()]
    .sort((x, y) => y.points - x.points || y.goalDiff - x.goalDiff || x.team.localeCompare(y.team))
    .map((r, i) => ({ ...r, position: i + 1 }));
}

/** Phong độ một đội từ các trận đã đá, mới nhất trước. Pure. */
export function buildForm(rows: FixtureRow[], team: string, limit = 5): TeamForm | null {
  const played = rows
    .filter((r) => (norm(r.home_team_name) === norm(team) || norm(r.away_team_name) === norm(team))
      && r.home_score !== null && r.away_score !== null)
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc));
  if (played.length === 0) return null;
  const form: TeamForm = {
    played: played.length, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, recent: [],
  };
  for (const r of played) {
    const isHome = norm(r.home_team_name) === norm(team);
    const gf = (isHome ? r.home_score : r.away_score) as number;
    const ga = (isHome ? r.away_score : r.home_score) as number;
    form.goalsFor += gf; form.goalsAgainst += ga;
    const res = gf > ga ? "T" : gf < ga ? "B" : "H";
    if (res === "T") form.won++; else if (res === "B") form.lost++; else form.drawn++;
    if (form.recent.length < limit) form.recent.push(res);
  }
  return form;
}

/** Gom toàn bộ dữ liệu thật cho một trận. Trả null khi không tìm thấy trong lịch. */
export async function getMatchContext(
  home: string, away: string, date: string,
): Promise<MatchContext | null> {
  const supabase = getSupabase();
  const shiftDay = (days: number) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString();
  const dayStart = `${date}T00:00:00Z`;

  // Slug mất dấu và mất ký tự đặc biệt nên không so tên trực tiếp được — lấy
  // theo NGÀY rồi khớp tên đã chuẩn hoá.
  //
  // Cửa sổ ±2 ngày, không phải đúng một ngày: slug sinh từ giờ trong `watching`
  // / `picks`, còn `fixtures` nhiều trận vẫn để giờ tạm 14:00 UTC, nên hai bên
  // lệch nhau một hai ngày. Đo 23/8: khoá cứng một ngày làm 49 trang mất sạch
  // dữ liệu (Man Utd–Ipswich slug 30/8 mà lịch ghi 29/8).
  //
  // CSDL hỏng hay thiếu khoá thì bỏ qua, KHÔNG thoát: lịch mùa nằm ngay trong
  // mã nguồn nên trang vẫn có giờ đá và các trận cùng vòng.
  const dayRes = supabase
    ? await supabase
        .from("fixtures")
        .select("id, competition_id, home_team_name, away_team_name, kickoff_utc, venue, home_score, away_score, livescore_match_id")
        .gte("kickoff_utc", shiftDay(-2))
        .lte("kickoff_utc", shiftDay(3))
    : null;
  const dayRows: FixtureRow[] = (dayRes?.error ? [] : dayRes?.data ?? []) as FixtureRow[];

  const target = Date.parse(dayStart);
  const dbFixture = dayRows
    .filter((r) => norm(r.home_team_name) === norm(home) && norm(r.away_team_name) === norm(away))
    .sort((a, b) =>
      Math.abs(Date.parse(a.kickoff_utc) - target) - Math.abs(Date.parse(b.kickoff_utc) - target))[0];

  // Lịch mùa bù cho những giải CSDL còn thiếu; CSDL vẫn được ưu tiên vì nó có
  // tỷ số và giờ đã chốt.
  const inSeason = findInSeason(home, away, date);
  const fixture: FixtureRow | undefined = dbFixture ?? (inSeason ? {
    id: "",
    competition_id: inSeason.competitionId,
    home_team_name: inSeason.hit.homeName,
    away_team_name: inSeason.hit.awayName,
    kickoff_utc: seasonKickoff(inSeason.hit),
    venue: null,
    home_score: null,
    away_score: null,
  } : undefined);
  if (!fixture) return null;

  // GIỜ ĐÁ lấy của nguồn chắc hơn, không mặc định theo CSDL. Bảng `fixtures` có
  // 350/380 trận EPL còn để giờ tạm 14:00 UTC, trong khi lịch mùa đã ghi giờ
  // công bố (Man Utd–Ipswich: CSDL 29/8 14:00, lịch 30/8 15:30 và không phải
  // giờ tạm). Đã đối chiếu 15 trận có mã Livescore: giờ lịch mùa khớp tuyệt đối,
  // nên coi lịch mùa là UTC và tin nó khi CSDL chưa đồng bộ.
  const kickoffUtc = dbFixture?.livescore_match_id
    ? dbFixture.kickoff_utc
    : inSeason && inSeason.hit.provisional === false
      ? seasonKickoff(inSeason.hit)
      : fixture.kickoff_utc;

  // Toàn bộ trận cùng giải để tính bảng xếp hạng + phong độ.
  const compRes = supabase
    ? await supabase
        .from("fixtures")
        .select("id, competition_id, home_team_name, away_team_name, kickoff_utc, venue, home_score, away_score, livescore_match_id")
        .eq("competition_id", fixture.competition_id)
    : null;
  const all = (compRes?.data ?? []) as FixtureRow[];

  // So bằng tên đã chuẩn hoá: lịch tĩnh ghi "Atletico Madrid", CSDL có thể ghi
  // "Atlético Madrid" — so thẳng chuỗi là mất hàng.
  const seasonTeams = inSeason
    ? [...new Set(inSeason.season.flatMap((f) => [f.homeName, f.awayName]))]
    : [];
  // Chưa đội nào đá thì KHÔNG có bảng xếp hạng: mọi đội 0 điểm, thứ tự chỉ là
  // xếp theo tên, hiện lên thành "hạng 18/20" là bịa thứ hạng.
  const standings = all.some((r) => r.home_score !== null && r.away_score !== null)
    ? buildStandings(all, seasonTeams)
    : [];
  const homeStanding = standings.find((s) => norm(s.team) === norm(fixture.home_team_name)) ?? null;
  const awayStanding = standings.find((s) => norm(s.team) === norm(fixture.away_team_name)) ?? null;

  const sameRound: RoundMatch[] = inSeason
    ? inSeason.season
        .filter((f) => f.round === inSeason.hit.round && f !== inSeason.hit)
        .sort((a, b) => seasonKickoff(a).localeCompare(seasonKickoff(b)))
        .map((f) => ({
          slug: buildMatchSlug(f.homeName, f.awayName, seasonKickoff(f)),
          homeTeam: f.homeName,
          awayTeam: f.awayName,
          kickoffUtc: seasonKickoff(f),
        }))
    : [];

  // Đối đầu: mọi lần hai đội gặp nhau đã có tỷ số, gần nhất trước.
  const h2h: HeadToHead[] = all
    .filter((r) => r.id !== fixture.id && r.home_score !== null && r.away_score !== null
      && ((norm(r.home_team_name) === norm(fixture.home_team_name) && norm(r.away_team_name) === norm(fixture.away_team_name))
        || (norm(r.home_team_name) === norm(fixture.away_team_name) && norm(r.away_team_name) === norm(fixture.home_team_name))))
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc))
    .slice(0, 5)
    .map((r) => ({
      date: r.kickoff_utc.slice(0, 10), homeTeam: r.home_team_name, awayTeam: r.away_team_name,
      homeScore: r.home_score as number, awayScore: r.away_score as number,
    }));

  // Kèo 1x2 mới nhất — chỉ hiện số liệu thị trường, không nêu tên nhà cái,
  // không link, không mời chào (ranh giới đã chốt sau khi tra chính sách 23/8).
  let odds: MatchOdds | null = null;
  const oddsRes = supabase
    ? await supabase
        .from("odds_snapshots")
        .select("home_odds, draw_odds, away_odds, captured_at")
        .eq("market", "ML")
        .ilike("home_team", `%${fixture.home_team_name.split(" ")[0]}%`)
        .gte("kickoff_utc", shiftDay(-2))
        .lte("kickoff_utc", shiftDay(3))
        .order("captured_at", { ascending: false })
        .limit(1)
    : null;
  const o = oddsRes?.data?.[0] as { home_odds: number; draw_odds: number; away_odds: number; captured_at: string } | undefined;
  if (o) {
    odds = {
      home: o.home_odds, draw: o.draw_odds, away: o.away_odds,
      prob: trueProbabilities(o.home_odds, o.draw_odds, o.away_odds),
      capturedAt: o.captured_at,
    };
  }

  return {
    fixtureId: fixture.id,
    competitionId: fixture.competition_id,
    homeTeam: fixture.home_team_name,
    awayTeam: fixture.away_team_name,
    kickoffUtc,
    venue: fixture.venue,
    homeScore: fixture.home_score,
    awayScore: fixture.away_score,
    homeForm: buildForm(all, fixture.home_team_name),
    awayForm: buildForm(all, fixture.away_team_name),
    homeStanding,
    awayStanding,
    standingsSize: standings.length,
    round: inSeason?.hit.round ?? null,
    sameRound,
    h2h,
    odds,
  };
}
