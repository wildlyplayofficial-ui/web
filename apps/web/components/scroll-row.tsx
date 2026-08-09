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
