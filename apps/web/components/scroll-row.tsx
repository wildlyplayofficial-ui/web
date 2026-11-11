"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Hàng cuộn ngang có nút mũi tên ‹ › — ẩn thanh cuộn xong thì chuột thường
 * KHÔNG còn cách nào kéo (Peter 9/8: "kéo k đc"). Mũi tên chỉ hiện trên
 * desktop khi nội dung thật sự tràn; mobile vuốt tay như cũ.
 */
/** Tốc độ tự chạy, px mỗi giây. */
const TOC_DO = 28;

/** Mép mờ dần hai bên khi còn nội dung bị che — thay cho nút tròn đè lên thẻ. */
const MEP = "linear-gradient(to right, transparent, #000 40px, #000 calc(100% - 40px), transparent)";

export function ScrollRow({
  children,
  className = "",
  tuChay = false,
}: {
  children: ReactNode;
  className?: string;
  /** Tự cuộn ngang chậm; nút ‹ › chỉ hiện khi rê chuột vào băng. */
  tuChay?: boolean;
}) {
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

  // Tự chạy ngang (Peter 11/11: "scroll ngang cho đẹp, kiểu tự động"). Chạy chậm,
  // rê chuột / chạm / focus vào thì dừng; tới cuối nghỉ một nhịp rồi lướt về đầu.
  // Người bật "giảm chuyển động" thì đứng yên. Chỉ bật khi truyền tuChay.
  const dung = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !tuChay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let vi = el.scrollLeft;
    let truoc = 0;
    let nghiDen = 0;
    let id = 0;
    const buoc = (t: number) => {
      const dt = truoc ? Math.min(t - truoc, 64) : 0;
      truoc = t;
      const het = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      if (dung.current || t < nghiDen) {
        vi = el.scrollLeft;
      } else if (het) {
        nghiDen = t + 1500;
        el.scrollTo({ left: 0, behavior: "smooth" });
        vi = 0;
      } else {
        // Cộng dồn số lẻ rồi mới gán — gán thẳng 0,5px trình duyệt làm tròn về 0, băng đứng im.
        vi += (TOC_DO * dt) / 1000;
        el.scrollLeft = vi;
      }
      id = requestAnimationFrame(buoc);
    };
    // Chờ chút cho neo đặt xong và người đọc kịp thấy thẻ đầu.
    const hen = setTimeout(() => (id = requestAnimationFrame(buoc)), 1200);
    return () => {
      clearTimeout(hen);
      cancelAnimationFrame(id);
    };
  }, [tuChay]);
  const dungChay = tuChay
    ? {
        onMouseEnter: () => (dung.current = true),
        onMouseLeave: () => (dung.current = false),
        onFocusCapture: () => (dung.current = true),
        onBlurCapture: () => (dung.current = false),
        onTouchStart: () => (dung.current = true),
        onTouchEnd: () => setTimeout(() => (dung.current = false), 2500),
      }
    : {};

  const truot = (huong: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: huong * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Băng tự chạy: nút ẩn, rê chuột vào mới hiện (và băng dừng lại) — khỏi đè lên thẻ.
  const nut = `absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/90 text-ink shadow-card backdrop-blur transition hover:border-brand/50 hover:text-brand sm:flex${
    tuChay ? " opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : ""
  }`;
  const mask = tuChay ? { maskImage: MEP, WebkitMaskImage: MEP } : {};

  return (
    <div className="group relative" {...dungChay}>
      {canLeft && (
        <button type="button" aria-label="Scroll left" onClick={() => truot(-1)} className={`${nut} left-1`}>
          ‹
        </button>
      )}
      <div ref={ref} className={`overflow-x-auto ${className}`} style={{ scrollbarWidth: "none", ...mask }}>
        {children}
      </div>
      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => truot(1)}
          className={`${nut} right-1`}
        >
          ›
        </button>
      )}
    </div>
  );
}
