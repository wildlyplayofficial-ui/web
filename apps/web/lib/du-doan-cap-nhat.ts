import { ngayVN, type HangDuDoan } from "./du-doan-hang";

/**
 * Thời điểm cập nhật của hub /du-doan, dùng chung cho dòng "Cập nhật", dateModified và
 * lastmod sitemap. Hub dựng lại theo ISR từ dữ liệu trận hiện có: còn trận từ hôm nay (giờ VN)
 * trở đi thì mốc là lúc dựng (`now`); không còn trận nào thì null — không khai ngày bịa.
 */
export function capNhatDuDoan(hang: readonly HangDuDoan[], now: number): number | null {
  const homNay = ngayVN(now);
  return hang.some((h) => h.ngay >= homNay) ? now : null;
}

/** "17/11/2026 09:30" theo giờ Việt Nam. */
export function chuCapNhat(ts: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
