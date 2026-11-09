/**
 * Khớp bài `analysis_articles` với giải trong `competitions`.
 *
 * `analysis_articles.league` là chữ tự do do người viết đặt ("Premier League")
 * nên không khớp cứng với competitions.name ("English Premier League"). So
 * theo dạng đã chuẩn hoá, một chiều nào chứa chiều kia cũng tính là khớp —
 * "laliga" vs "ligamx" không dính nhau nên không sợ lẫn giải.
 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function cungGiai(league: string | null | undefined, compName: string): boolean {
  const a = norm(league ?? "");
  const c = norm(compName);
  return a.length > 0 && c.length > 0 && (c.includes(a) || a.includes(c));
}
