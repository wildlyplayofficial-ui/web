import { ngayVN, type HangDuDoan } from "./du-doan-hang";

/**
 * Mốc cập nhật của hub /du-doan, dùng chung cho dòng "Cập nhật", dateModified và lastmod sitemap.
 * Danh sách trận của hub đổi khi sang ngày mới (giờ VN) → mốc là 00:00 giờ VN của hôm nay, KHÔNG
 * phải lúc dựng trang (lúc dựng đổi mỗi lần ISR dù nội dung y nguyên = khai ngày sửa giả).
 * Không còn trận nào từ hôm nay trở đi thì null — không khai ngày.
 */
export function capNhatDuDoan(hang: readonly HangDuDoan[], now: number): number | null {
  const homNay = ngayVN(now);
  return hang.some((h) => h.ngay >= homNay) ? Date.parse(`${homNay}T00:00:00+07:00`) : null;
}

/** "17/11/2026" theo giờ Việt Nam. */
export function chuCapNhat(ts: number): string {
  const [y, m, d] = ngayVN(ts).split("-");
  return `${d}/${m}/${y}`;
}
