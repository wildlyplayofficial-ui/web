"use client";

import { useEffect, useState } from "react";
import { doiTyLe, KHOA_DINH_DANG, laDinhDang, NHAN_DINH_DANG, type DinhDangTyLe } from "@/lib/ty-le";

const SU_KIEN = "bb-ty-le";

function ap(goc: ParentNode, dd: DinhDangTyLe) {
  goc.querySelectorAll<HTMLElement>("[data-ty]").forEach((el) => {
    const nut = el.firstChild;
    const kq = doiTyLe(Number(el.dataset.ty), dd);
    // Sửa tại chỗ nút chữ để React không mất tham chiếu.
    if (nut && nut.nodeType === 3 && nut.nodeValue !== kq) nut.nodeValue = kq;
  });
}

function docLuu(): DinhDangTyLe {
  try {
    const v = localStorage.getItem(KHOA_DINH_DANG);
    return laDinhDang(v) ? v : "D";
  } catch {
    return "D";
  }
}

export function DoiDinhDang() {
  const [dd, setDd] = useState<DinhDangTyLe>("D");

  useEffect(() => {
    const luu = docLuu();
    setDd(luu);
    ap(document, luu);
    const theoDoi = new MutationObserver((ds) => {
      const hien = docLuu();
      if (hien === "D") return;
      for (const d of ds) d.addedNodes.forEach((n) => n instanceof HTMLElement && ap(n, hien));
    });
    theoDoi.observe(document.body, { childList: true, subtree: true });
    const dongBo = () => {
      const m = docLuu();
      setDd(m);
      ap(document, m);
    };
    window.addEventListener(SU_KIEN, dongBo);
    return () => {
      theoDoi.disconnect();
      window.removeEventListener(SU_KIEN, dongBo);
    };
  }, []);

  const chon = (m: DinhDangTyLe) => {
    try {
      localStorage.setItem(KHOA_DINH_DANG, m);
    } catch {}
    window.dispatchEvent(new Event(SU_KIEN));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted" role="group" aria-label="Kiểu hiển thị tỷ lệ">
      <span>Kiểu tỷ lệ:</span>
      {NHAN_DINH_DANG.map((x) => (
        <button
          key={x.ma}
          type="button"
          aria-pressed={dd === x.ma}
          onClick={() => chon(x.ma)}
          className={`rounded border px-2 py-1 ${dd === x.ma ? "border-brand text-brand" : "border-line hover:text-brand"}`}
        >
          {x.nhan}
        </button>
      ))}
    </div>
  );
}
