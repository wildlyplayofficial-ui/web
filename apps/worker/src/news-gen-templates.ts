/**
 * P1 news pipeline: deterministic 4-lang templates (spec D1=A — 0 LLM, 0 hallucination).
 * Numbers/names interpolate into fixed strings; no speculation possible by construction.
 * Dates are UTC yyyy-mm-dd only — local kickoff times are rendered client-side (spec guard 7).
 * Form letters W/D/L are standard football notation, kept identical across languages.
 */

export type NewsLang = 'en' | 'vi' | 'th' | 'es';
export const NEWS_LANGS: NewsLang[] = ['en', 'vi', 'th', 'es'];

export interface Rendered { headline: string; body: string }

// Jane review 13/7: human-readable dates, static per-lang mapping (still 0 LLM).
// EN "17 Jul 2026"; VI/TH/ES "17/07/2026". Slugs keep raw ISO — display only.
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateUtc(lang: NewsLang, dateUtc: string): string {
  const [y, m, d] = dateUtc.split('-');
  if (lang === 'en') return `${Number(d)} ${EN_MONTHS[Number(m) - 1]} ${y}`;
  return `${d}/${m}/${y}`;
}

export interface PreviewData {
  home: string; away: string; competition: string;
  /** kickoff date, UTC yyyy-mm-dd */
  dateUtc: string;
  /** "W-D-L-W-W" (most recent first) or null → form line omitted (Jane #1 form-degrade) */
  formHome: string | null;
  formAway: string | null;
  /** absolute or site-relative pick URL, null → no betting mention at all */
  pickUrl: string | null;
}

export interface ResultData {
  home: string; away: string; homeScore: number; awayScore: number;
  competition: string; dateUtc: string;
  pickUrl: string | null;
}

export interface StandingsRowData { rank: number; name: string; played: number; points: number }

export interface StandingsData {
  competition: string; dateUtc: string; rows: StandingsRowData[];
}

// ── Preview ──────────────────────────────────────────────────────────────────

const PREVIEW = {
  en: {
    headline: (d: PreviewData) => `Preview: ${d.home} vs ${d.away} — ${d.competition}`,
    intro: (d: PreviewData) => `${d.home} face ${d.away} in the ${d.competition} on ${d.dateUtc} (UTC).`,
    form: (team: string, form: string) => `Recent form — ${team}: ${form}.`,
    pick: (url: string) => `The Curator has published a pick for this match: ${url}`,
    outro: 'Follow live scores and updates on WildlyPlay.',
  },
  vi: {
    headline: (d: PreviewData) => `Trước trận: ${d.home} vs ${d.away} — ${d.competition}`,
    intro: (d: PreviewData) => `${d.home} gặp ${d.away} tại ${d.competition} vào ngày ${d.dateUtc} (UTC).`,
    form: (team: string, form: string) => `Phong độ gần đây — ${team}: ${form}.`,
    pick: (url: string) => `The Curator đã đăng kèo cho trận này: ${url}`,
    outro: 'Theo dõi tỷ số trực tiếp và cập nhật trên WildlyPlay.',
  },
  th: {
    headline: (d: PreviewData) => `พรีวิว: ${d.home} พบ ${d.away} — ${d.competition}`,
    intro: (d: PreviewData) => `${d.home} พบกับ ${d.away} ในศึก ${d.competition} วันที่ ${d.dateUtc} (UTC)`,
    form: (team: string, form: string) => `ฟอร์มล่าสุด — ${team}: ${form}`,
    pick: (url: string) => `The Curator ได้เผยแพร่ทีเด็ดสำหรับแมตช์นี้: ${url}`,
    outro: 'ติดตามผลบอลสดและอัปเดตได้ที่ WildlyPlay',
  },
  es: {
    headline: (d: PreviewData) => `Previa: ${d.home} vs ${d.away} — ${d.competition}`,
    intro: (d: PreviewData) => `${d.home} se enfrenta a ${d.away} en ${d.competition} el ${d.dateUtc} (UTC).`,
    form: (team: string, form: string) => `Forma reciente — ${team}: ${form}.`,
    pick: (url: string) => `The Curator ha publicado un pick para este partido: ${url}`,
    outro: 'Sigue los resultados en directo y las novedades en WildlyPlay.',
  },
} as const;

export function renderPreview(lang: NewsLang, data: PreviewData): Rendered {
  const t = PREVIEW[lang];
  const d = { ...data, dateUtc: formatDateUtc(lang, data.dateUtc) };
  const lines = [t.intro(d)];
  if (d.formHome) lines.push(t.form(d.home, d.formHome));
  if (d.formAway) lines.push(t.form(d.away, d.formAway));
  if (d.pickUrl) lines.push(t.pick(d.pickUrl));
  lines.push(t.outro);
  return { headline: t.headline(d), body: lines.join('\n\n') };
}

// ── Result ───────────────────────────────────────────────────────────────────

const RESULT = {
  en: {
    headline: (d: ResultData) => `Result: ${d.home} ${d.homeScore}-${d.awayScore} ${d.away}`,
    intro: (d: ResultData) => `${d.home} ${d.homeScore}-${d.awayScore} ${d.away} — full-time in the ${d.competition}, ${d.dateUtc} (UTC).`,
    win: (winner: string) => `${winner} took the win.`,
    draw: 'The match ended in a draw.',
    pick: (url: string) => `The Curator published a pick for this match: ${url}`,
  },
  vi: {
    headline: (d: ResultData) => `Kết quả: ${d.home} ${d.homeScore}-${d.awayScore} ${d.away}`,
    intro: (d: ResultData) => `${d.home} ${d.homeScore}-${d.awayScore} ${d.away} — trận đấu tại ${d.competition} ngày ${d.dateUtc} (UTC) đã kết thúc.`,
    win: (winner: string) => `${winner} giành chiến thắng.`,
    draw: 'Trận đấu kết thúc với tỷ số hòa.',
    pick: (url: string) => `The Curator đã đăng kèo cho trận này: ${url}`,
  },
  th: {
    headline: (d: ResultData) => `ผลบอล: ${d.home} ${d.homeScore}-${d.awayScore} ${d.away}`,
    intro: (d: ResultData) => `${d.home} ${d.homeScore}-${d.awayScore} ${d.away} — จบเกมในศึก ${d.competition} วันที่ ${d.dateUtc} (UTC)`,
    win: (winner: string) => `${winner} คว้าชัยชนะ`,
    draw: 'เกมจบลงด้วยผลเสมอ',
    pick: (url: string) => `The Curator ได้เผยแพร่ทีเด็ดสำหรับแมตช์นี้: ${url}`,
  },
  es: {
    headline: (d: ResultData) => `Resultado: ${d.home} ${d.homeScore}-${d.awayScore} ${d.away}`,
    intro: (d: ResultData) => `${d.home} ${d.homeScore}-${d.awayScore} ${d.away} — final del partido de ${d.competition}, ${d.dateUtc} (UTC).`,
    win: (winner: string) => `${winner} se llevó la victoria.`,
    draw: 'El partido terminó en empate.',
    pick: (url: string) => `The Curator ha publicado un pick para este partido: ${url}`,
  },
} as const;

export function renderResult(lang: NewsLang, data: ResultData): Rendered {
  const t = RESULT[lang];
  const d = { ...data, dateUtc: formatDateUtc(lang, data.dateUtc) };
  const lines = [t.intro(d)];
  if (d.homeScore === d.awayScore) lines.push(t.draw);
  else lines.push(t.win(d.homeScore > d.awayScore ? d.home : d.away));
  if (d.pickUrl) lines.push(t.pick(d.pickUrl));
  return { headline: t.headline(d), body: lines.join('\n\n') };
}

// ── Standings ────────────────────────────────────────────────────────────────

const STANDINGS = {
  en: {
    headline: (d: StandingsData) => `${d.competition} standings update — ${d.dateUtc}`,
    intro: (d: StandingsData) => `Top of the ${d.competition} table as of ${d.dateUtc} (UTC):`,
    row: (r: StandingsRowData) => `${r.rank}. ${r.name} — ${r.points} pts (${r.played} played)`,
    outro: 'Full table on WildlyPlay.',
  },
  vi: {
    headline: (d: StandingsData) => `Cập nhật bảng xếp hạng ${d.competition} — ${d.dateUtc}`,
    intro: (d: StandingsData) => `Nhóm dẫn đầu bảng xếp hạng ${d.competition} tính đến ngày ${d.dateUtc} (UTC):`,
    row: (r: StandingsRowData) => `${r.rank}. ${r.name} — ${r.points} điểm (${r.played} trận)`,
    outro: 'Xem bảng xếp hạng đầy đủ trên WildlyPlay.',
  },
  th: {
    headline: (d: StandingsData) => `อัปเดตตารางคะแนน ${d.competition} — ${d.dateUtc}`,
    intro: (d: StandingsData) => `อันดับต้นตารางคะแนน ${d.competition} ณ วันที่ ${d.dateUtc} (UTC):`,
    row: (r: StandingsRowData) => `${r.rank}. ${r.name} — ${r.points} คะแนน (${r.played} นัด)`,
    outro: 'ดูตารางคะแนนเต็มได้ที่ WildlyPlay',
  },
  es: {
    headline: (d: StandingsData) => `Actualización de la clasificación de ${d.competition} — ${d.dateUtc}`,
    intro: (d: StandingsData) => `La parte alta de la clasificación de ${d.competition} a fecha ${d.dateUtc} (UTC):`,
    row: (r: StandingsRowData) => `${r.rank}. ${r.name} — ${r.points} pts (${r.played} PJ)`,
    outro: 'Consulta la tabla completa en WildlyPlay.',
  },
} as const;

export function renderStandings(lang: NewsLang, data: StandingsData): Rendered {
  const t = STANDINGS[lang];
  const d = { ...data, dateUtc: formatDateUtc(lang, data.dateUtc) };
  const body = [t.intro(d), d.rows.map((r) => t.row(r)).join('\n'), t.outro].join('\n\n');
  return { headline: t.headline(d), body };
}
