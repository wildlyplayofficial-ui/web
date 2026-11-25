/**
 * Chuyển query-string của vài trang mục lục thành MỘT đoạn đường dẫn nội bộ để trang
 * được ISR (đọc `searchParams` trong page.tsx ép cả route thành động → `revalidate`
 * bị bỏ qua, mỗi lượt xem chạy một function).
 *
 * Luồng: proxy.ts đổi `/matches?page=2&league=X` thành `/vi/matches/loc-q/<base64url>`
 * (URL người dùng và Google thấy KHÔNG đổi), trang `loc-q/[q]` giải mã ra đúng đối
 * tượng `sp` như `searchParams` cũ. Không có query hợp lệ → proxy viết lại về trang gốc.
 *
 * Chỉ giữ các khoá nằm trong danh sách cho phép: utm_*, fbclid, _rsc… bị bỏ nên mọi
 * biến thể tracking cùng rơi vào MỘT bản cache của trang gốc.
 */

export const DOAN_LOC = "loc-q";

/** Đường không tiền tố → các khoá query trang đó thực sự đọc. */
export const KHOA_THEO_TRANG: Record<string, readonly string[]> = {
  "/matches": ["page", "league"],
  "/news": ["page", "league"],
  "/analysis": ["page"],
  "/archive": ["month", "result", "league"],
  "/ket-qua": ["ngay"],
};

const DO_DAI_TOI_DA = 80;

export type Sp = Record<string, string | undefined>;

/** Query → chuỗi chuẩn hoá (khoá sắp xếp, bỏ khoá lạ/rỗng/lặp, `page` ≤ 1 bỏ). "" nếu không còn gì. */
export function chuanHoaQuery(search: URLSearchParams, duongKhongTienTo: string): string {
  const khoa = KHOA_THEO_TRANG[duongKhongTienTo];
  if (!khoa) return "";
  const out = new URLSearchParams();
  for (const k of [...khoa].sort()) {
    const all = search.getAll(k);
    if (all.length !== 1) continue;
    let v = all[0];
    if (!v || v.length > DO_DAI_TOI_DA) continue;
    if (k === "page") {
      const n = parseInt(v, 10);
      if (!(n > 1) || v.length > 4) continue;
      v = String(n);
    }
    out.set(k, v);
  }
  return out.toString();
}

export function maHoaQuery(chuan: string): string {
  return Buffer.from(chuan, "utf8").toString("base64url");
}

/** Giải mã đoạn đường dẫn về `sp`. Rác → `{}` (render như trang gốc). */
export function giaiMaQuery(doan: string): Sp {
  try {
    const qs = Buffer.from(doan, "base64url").toString("utf8");
    const sp: Sp = {};
    new URLSearchParams(qs).forEach((v, k) => {
      sp[k] = v;
    });
    return sp;
  } catch {
    return {};
  }
}
