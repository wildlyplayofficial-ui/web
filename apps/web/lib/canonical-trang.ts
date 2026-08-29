import type { Metadata } from "next";
import { buildAlternates, type Lang } from "@/lib/i18n";

/**
 * Canonical + robots cho các trang mục lục có tham số URL.
 *
 * Hai loại tham số, xử KHÁC NHAU:
 *
 * - `page=N` là ĐƯỜNG ĐI, không phải bản sao. Trang 2 phải tự trỏ canonical về
 *   chính nó. Trước đây mọi `?page=N` đều canonical về trang 1, nên Google coi
 *   trang 2..N là bản sao của trang 1 và không buồn bò qua để tới bài bên trong —
 *   làm hỏng luôn việc thêm số trang ở #194.
 *
 * - `league` / `month` / `result` / `type` là BỘ LỌC. Cùng một kho nội dung xếp
 *   lại, nên là bản sao thật. Đặt noindex nhưng GIỮ follow: không cho lập chỉ mục,
 *   vẫn cho đi tiếp vào các bài bên trong.
 *   Trước đây mấy trang này ghi `index, follow` trong khi canonical trỏ nơi khác —
 *   hai tín hiệu đá nhau. Đo 29/8: riêng /archive sinh 30+ tổ hợp lọc, /matches 18,
 *   /news 9, /analysis 9. Với tên miền 11 ngày tuổi mà hạn mức bò còn ít thì đó là
 *   phí thẳng vào bản sao.
 */
const KHOA_LOC = ["league", "month", "result", "type"] as const;

export function canonicalTrang(
  duongDan: string,
  lang: Lang,
  sp: Record<string, string | string[] | undefined>,
): Pick<Metadata, "alternates" | "robots"> {
  const coLoc = KHOA_LOC.some((k) => typeof sp[k] === "string" && sp[k] !== "");
  const trang = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  if (coLoc) {
    return { alternates: buildAlternates(duongDan, lang), robots: { index: false, follow: true } };
  }
  return { alternates: buildAlternates(trang > 1 ? `${duongDan}?page=${trang}` : duongDan, lang) };
}
