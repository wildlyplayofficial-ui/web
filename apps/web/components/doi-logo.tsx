"use client";

import { useEffect, useRef, useState } from "react";

/** Logo đội; thiếu logo HOẶC ảnh tải lỗi thì vòng tròn chữ cái đầu — không bao giờ để ảnh vỡ. */
export function DoiLogo({ src, ten, size = 28 }: { src: string | null; ten: string; size?: number }) {
  const [loi, setLoi] = useState(false);
  const anh = useRef<HTMLImageElement>(null);
  // Ảnh lỗi TRƯỚC khi React gắn sự kiện (HTML server tải xong sớm) thì onError không
  // chạy — soát lại một lần lúc gắn: tải xong mà rộng 0 là ảnh vỡ.
  useEffect(() => {
    const i = anh.current;
    if (i && i.complete && i.naturalWidth === 0) setLoi(true);
  }, [src]);
  if (src && !loi) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo ngoài (flagcdn/Wikimedia), cùng kiểu trang trận
      <img
        ref={anh}
        src={src}
        alt={ten}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setLoi(true)}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const chu = ten
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      role="img"
      aria-label={ten}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-card-hover font-display text-[10px] font-bold text-muted"
      style={{ width: size, height: size }}
    >
      {chu}
    </span>
  );
}
