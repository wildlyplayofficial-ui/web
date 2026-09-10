import Link from "next/link";
import type { BaiQuaHan } from "@/lib/bai-qua-han";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * Khối "trận này đã kết thúc" đặt NGAY ĐẦU bài trước trận đã quá hạn.
 *
 * Đặt trên tiêu đề chứ không phải cuối bài: người đọc vào từ Google thấy tiêu
 * đề hỏi "mấy giờ đá?" rồi mới đọc tiếp — biết trận đã xong ở dòng đầu thì họ
 * bấm sang bài kết quả ngay, không phải cuộn hết bài mới biết mình đọc nhầm.
 */
export function KhoiDaKetThuc({ tin, lang }: { tin: BaiQuaHan; lang: Lang }) {
  return (
    <div className="mt-6 rounded-card border border-line bg-brand-dim/30 px-4 py-3 text-sm">
      <strong className="font-display text-ink">Trận này đã kết thúc.</strong>{" "}
      {tin.den ? (
        <>
          <span className="text-muted">Xem </span>
          <Link href={withLang(tin.den, lang)} className="font-semibold text-brand underline underline-offset-2">
            {tin.ten ?? "bài kết quả"}
          </Link>
          <span className="text-muted"> để biết tỉ số và diễn biến.</span>
        </>
      ) : (
        <span className="text-muted">
          Bài dưới đây viết trước trận, giữ nguyên để lưu hồ sơ.
        </span>
      )}
    </div>
  );
}
