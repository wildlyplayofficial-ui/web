"use client";

import { useEffect } from "react";

/**
 * Logo đội dựng ở server (<img data-logo>) không có onError riêng cho từng ảnh (đỡ ~400 component hydrate).
 * Một bộ nghe duy nhất cho cả trang: ảnh tải lỗi thì đổi src sang vòng tròn chữ cái đầu, không bao giờ để ảnh vỡ.
 */
const chuDau = (ten: string) =>
  ten.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

function thayBangChu(i: HTMLImageElement) {
  if (i.dataset.loi) return;
  i.dataset.loi = "1";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="#f3f4f6" stroke="#d1d5db"/><text x="12" y="16" font-size="10" font-weight="700" font-family="sans-serif" text-anchor="middle" fill="#6b7280">${chuDau(i.alt).replace(/[<>&"]/g, "")}</text></svg>`;
  i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function LogoLoi() {
  useEffect(() => {
    const khiLoi = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLImageElement && t.hasAttribute("data-logo")) thayBangChu(t);
    };
    document.addEventListener("error", khiLoi, true);
    // Ảnh lỗi trước khi bộ nghe gắn (HTML tải xong sớm): soát một lượt.
    document.querySelectorAll<HTMLImageElement>("img[data-logo]").forEach((i) => {
      if (i.complete && i.naturalWidth === 0 && i.currentSrc) thayBangChu(i);
    });
    return () => document.removeEventListener("error", khiLoi, true);
  }, []);
  return null;
}
