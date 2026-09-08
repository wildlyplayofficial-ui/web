// Địa chỉ chuẩn của trang pick, tách riêng khỏi `data.ts` để KHỐI CHẠY Ở TRÌNH DUYỆT
// dùng được. `data.ts` kéo theo `next/cache` và Supabase nên không import vào
// component "use client" được, mà `archive-row.tsx` lại cần dựng đúng địa chỉ này.
//
// Vì sao phải dùng đúng dạng slug ở MỌI link nội bộ: sitemap liệt kê
// /play/<slug>, còn trang chủ + bảng ngày + hàng lưu trữ trước đây trỏ
// /play/<uuid>. Hai dạng khác nhau nên 24 địa chỉ dạng slug không có đường vào
// nào — Google chỉ tới được qua chuyển hướng (đo GSC 8/9: cả 24 trang /play kẹt
// "Discovered – currently not indexed", 0 link nội bộ trỏ thẳng).
import type { Pick } from "./types";

export function slugifyPlay(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Địa chỉ SEO của một pick: home-vs-away-selection-date (Nick 17/6).
 *  Có đuôi ngày để hai đội gặp lại ở vòng khác không đụng địa chỉ nhau. */
export function buildPlaySlug(pick: Pick): string {
  const date = pick.kickoff_utc.slice(0, 10);
  const homeSl = slugifyPlay(pick.home_team);
  const awaySl = slugifyPlay(pick.away_team);
  let selSl = slugifyPlay(pick.selection);
  // Tránh lặp tên đội trong địa chỉ ("bosnia-vs-X-bosnia" → "bosnia-vs-X-home")
  if (selSl === homeSl) selSl = "home";
  else if (selSl === awaySl) selSl = "away";
  return `${homeSl}-vs-${awaySl}-${selSl}-${date}`;
}
