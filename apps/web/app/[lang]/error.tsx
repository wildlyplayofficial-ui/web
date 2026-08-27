"use client";

/**
 * LƯỚI AN TOÀN cho mọi trang dưới /[lang].
 *
 * Vì sao có (27/8/2026): app KHÔNG có một error boundary nào. Sót một chỗ hứng
 * lỗi là ra 500 trần — đúng cái xảy ra lúc 13h41 khi layout gọi nhà cung cấp mà
 * chưa có đường lui.
 *
 * Vá từng chỗ gọi là ĐẾM TAY, mà đếm tay thì sót: PR #182 tôi rà 5 chỗ rồi tưởng
 * xong, thực tế còn 12; PR #183 rà 15 chỗ, Jane vẫn tìm ra 2 chỗ nữa. Lưới này
 * không thay việc vá từng chỗ — nó là thứ đỡ khi cả hai cùng sót.
 *
 * Cố ý giữ mộc: không gọi dữ liệu, không phụ thuộc gì. Trang lỗi mà cần dữ liệu
 * để dựng thì nó hỏng đúng lúc cần nhất.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-2xl font-bold">Trang đang trục trặc</p>
      <p className="text-sm text-muted">
        Phần này của trang không tải được. Các mục khác vẫn xem bình thường.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
        >
          Thử lại
        </button>
        <a href="/news" className="text-sm font-semibold text-brand hover:underline">
          Xem tin mới nhất
        </a>
      </div>
    </main>
  );
}
