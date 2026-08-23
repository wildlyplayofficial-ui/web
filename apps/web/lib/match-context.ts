import { getSupabase } from "./supabase";

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

export interface MatchContext {
  fixtureId: string;
  competitionId: string;
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

/** Bảng xếp hạng tính từ các trận ĐÃ có tỷ số của giải đó. Pure. */
export function buildStandings(rows: FixtureRow[]): StandingRow[] {
  const table = new Map<string, Omit<StandingRow, "position">>();
  const seed = (team: string) => {
    if (!table.has(team)) {
      table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, goalDiff: 0, points: 0 });
    }
    return table.get(team)!;
  };
  // Đội chưa đá trận nào vẫn phải có mặt trên bảng (P=0) — bỏ đi là bảng thiếu đội.
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
    .filter((r) => (r.home_team_name === team || r.away_team_name === team)
      && r.home_score !== null && r.away_score !== null)
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc));
  if (played.length === 0) return null;
  const form: TeamForm = {
    played: played.length, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, recent: [],
  };
  for (const r of played) {
    const isHome = r.home_team_name === team;
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
  if (!supabase) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  // Slug mất dấu và mất ký tự đặc biệt nên không so tên trực tiếp được — lấy
  // theo NGÀY rồi khớp tên đã chuẩn hoá. Một ngày tối đa vài chục trận, rẻ.
  const { data: dayRows, error } = await supabase
    .from("fixtures")
    .select("id, competition_id, home_team_name, away_team_name, kickoff_utc, venue, home_score, away_score")
    .gte("kickoff_utc", dayStart)
    .lte("kickoff_utc", dayEnd);
  if (error || !dayRows) return null;

  const fixture = (dayRows as FixtureRow[]).find(
    (r) => norm(r.home_team_name) === norm(home) && norm(r.away_team_name) === norm(away),
  );
  if (!fixture) return null;

  // Toàn bộ trận cùng giải để tính bảng xếp hạng + phong độ.
  const { data: compRows } = await supabase
    .from("fixtures")
    .select("id, competition_id, home_team_name, away_team_name, kickoff_utc, venue, home_score, away_score")
    .eq("competition_id", fixture.competition_id);
  const all = (compRows ?? []) as FixtureRow[];

  const standings = buildStandings(all);
  const homeStanding = standings.find((s) => s.team === fixture.home_team_name) ?? null;
  const awayStanding = standings.find((s) => s.team === fixture.away_team_name) ?? null;

  // Đối đầu: mọi lần hai đội gặp nhau đã có tỷ số, gần nhất trước.
  const h2h: HeadToHead[] = all
    .filter((r) => r.id !== fixture.id && r.home_score !== null && r.away_score !== null
      && ((r.home_team_name === fixture.home_team_name && r.away_team_name === fixture.away_team_name)
        || (r.home_team_name === fixture.away_team_name && r.away_team_name === fixture.home_team_name)))
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc))
    .slice(0, 5)
    .map((r) => ({
      date: r.kickoff_utc.slice(0, 10), homeTeam: r.home_team_name, awayTeam: r.away_team_name,
      homeScore: r.home_score as number, awayScore: r.away_score as number,
    }));

  // Kèo 1x2 mới nhất — chỉ hiện số liệu thị trường, không nêu tên nhà cái,
  // không link, không mời chào (ranh giới đã chốt sau khi tra chính sách 23/8).
  let odds: MatchOdds | null = null;
  const { data: oddsRows } = await supabase
    .from("odds_snapshots")
    .select("home_odds, draw_odds, away_odds, captured_at")
    .eq("market", "ML")
    .ilike("home_team", `%${fixture.home_team_name.split(" ")[0]}%`)
    .gte("kickoff_utc", dayStart)
    .lte("kickoff_utc", dayEnd)
    .order("captured_at", { ascending: false })
    .limit(1);
  const o = oddsRows?.[0] as { home_odds: number; draw_odds: number; away_odds: number; captured_at: string } | undefined;
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
    kickoffUtc: fixture.kickoff_utc,
    venue: fixture.venue,
    homeScore: fixture.home_score,
    awayScore: fixture.away_score,
    homeForm: buildForm(all, fixture.home_team_name),
    awayForm: buildForm(all, fixture.away_team_name),
    homeStanding,
    awayStanding,
    standingsSize: standings.length,
    h2h,
    odds,
  };
}
