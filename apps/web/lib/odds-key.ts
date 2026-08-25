/**
 * Một hoặc nhiều khoá odds-api.io.
 *
 * Nhà cung cấp chặn 100 lượt/giờ MỖI KHOÁ, và cả trang web lẫn worker đều xài
 * chung khoá — riêng /api/live-clock đã có thể ngốn tới 120 lượt/giờ cho mỗi
 * trận đang đá (trình duyệt hỏi 60 giây/lần, route đệm 30 giây). Nick 25/8:
 * "đụng limit em làm phần routing để dùng nhiều tài khoản được".
 *
 * Đặt ODDS_API_KEYS="key1,key2"; không đặt thì chạy như cũ với ODDS_API_KEY.
 */
const BASE = "https://api.odds-api.io/v3";

export function khoaOdds(): string[] {
  return (process.env.ODDS_API_KEYS ?? process.env.ODDS_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Gọi odds-api. Khoá hết lượt (429) thì đổi sang khoá kế rồi gọi lại.
 * Trả null KHI VÀ CHỈ KHI không có khoá nào — để chỗ gọi trả 503 như trước.
 */
export async function goiOdds(duong: string, init?: RequestInit): Promise<Response | null> {
  const khoa = khoaOdds();
  if (khoa.length === 0) return null;
  let res: Response | undefined;
  for (const k of khoa) {
    res = await fetch(`${BASE}/${duong}${duong.includes("?") ? "&" : "?"}apiKey=${k}`, init);
    if (res.status !== 429) return res;
  }
  return res!; // mọi khoá đều hết lượt — trả nguyên 429 cuối cho chỗ gọi tự xử
}
