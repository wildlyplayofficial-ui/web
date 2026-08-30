"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Hàng cuộn ngang có nút mũi tên ‹ › — ẩn thanh cuộn xong thì chuột thường
 * KHÔNG còn cách nào kéo (Peter 9/8: "kéo k đc"). Mũi tên chỉ hiện trên
 * desktop khi nội dung thật sự tràn; mobile vuốt tay như cũ.
 */
export function ScrollRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // Mở ra là nhảy thẳng tới thẻ có data-neo. Băng tỷ số xếp trận ĐÃ ĐÁ trước rồi
  // mới tới trận sắp đá, nên nếu để nguyên thì thứ đập vào mắt đầu tiên là mấy
  // trận đã xong — Nick 29/8: "ở đầu băng này lúc nào cũng là trận chưa hoặc đang
  // đá". Trận đã đá vẫn còn, chỉ nằm bên trái, kéo ngược lại là thấy.
  // Không có data-neo thì không làm gì — mấy hàng cuộn khác giữ nguyên như cũ.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const neo = el.querySelector<HTMLElement>("[data-neo]");
    if (!neo) return;
    // Đo bằng getBoundingClientRect chứ KHÔNG dùng offsetLeft: offsetLeft tính từ
    // ông tổ có position, không phải từ khung cuộn, nên trượt mất hai thẻ (đo 29/8).
    // Đặt thẳng, KHÔNG cuộn mượt: cuộn mượt lúc trang vừa hiện trông như giật.
    const dat = () => {
      el.scrollLeft += neo.getBoundingClientRect().left - el.getBoundingClientRect().left;
    };
    dat();
    // Chạy lại sau một khung hình: huy hiệu đội tải xong có thể đẩy lại bố cục.
    const id = requestAnimationFrame(dat);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const truot = (huong: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: huong * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => truot(-1)}
          className="absolute left-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/90 text-ink shadow-card backdrop-blur transition-colors hover:border-brand/50 hover:text-brand sm:flex"
        >
          ‹
        </button>
      )}
      <div ref={ref} className={`overflow-x-auto ${className}`} style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => truot(1)}
          className="absolute right-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/90 text-ink shadow-card backdrop-blur transition-colors hover:border-brand/50 hover:text-brand sm:flex"
        >
          ›
        </button>
      )}
    </div>
  );
}
