"use client";

import Link from "next/link";
import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";
import type { TranKetQua } from "@/lib/ket-qua";

function Chip({ chon, onClick, children }: { chon: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chon}
      className={`shrink-0 rounded-full border px-3 py-1.5 font-display text-xs font-semibold transition-colors ${
        chon ? "border-brand bg-brand text-bg" : "border-line bg-card text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Dong({ t }: { t: TranKetQua }) {
  const [a, b] = t.kq;
  const doi: [string, string | null, number, boolean][] = [
    [t.nha, t.logoNha, a, a > b],
    [t.khach, t.logoKhach, b, b > a],
  ];
  return (
    <li>
      <Link href={`/du-doan/${t.slug}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-card-hover">
        <span className="w-11 shrink-0 text-center text-[13px] tabular-nums text-muted">
          {/* Tệp không có giờ đá thì chỉ ghi KT, khỏi hiện "--:--". */}
          {t.gio !== "--:--" && t.gio}
          <span className="block text-[11px]">KT</span>
        </span>
        <span className="min-w-0 flex-1 space-y-1.5">
          {doi.map(([ten, logo, , thang]) => (
            <span key={ten} className="flex items-center gap-2">
              <DoiLogo src={logo} ten={ten} size={22} />
              <span className={`truncate text-sm ${thang ? "font-semibold text-ink" : "text-muted"}`}>{ten}</span>
            </span>
          ))}
        </span>
        <span className="flex shrink-0 flex-col gap-1.5">
          {doi.map(([ten, , so, thang]) => (
            <span
              key={ten}
              className={`block h-[22px] w-[30px] rounded-md text-center font-display text-sm font-bold leading-[22px] tabular-nums ${
                thang ? "bg-brand text-white" : "bg-card-hover text-muted"
              }`}
            >
              {so}
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}

/** Chip lọc giải + danh sách kết quả gom theo giải. */
export function KetQuaLoc({ nhom }: { nhom: [string, TranKetQua[]][] }) {
  const [giai, setGiai] = useState<string | null>(null);
  const tong = nhom.reduce((n, [, ds]) => n + ds.length, 0);
  const hien = giai ? nhom.filter(([g]) => g === giai) : nhom;
  return (
    <div>
      {nhom.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip chon={giai === null} onClick={() => setGiai(null)}>
            Tất cả <span className="opacity-70">{tong}</span>
          </Chip>
          {nhom.map(([g, ds]) => (
            <Chip key={g} chon={g === giai} onClick={() => setGiai(g)}>
              {g} <span className="opacity-70">{ds.length}</span>
            </Chip>
          ))}
        </div>
      )}
      {hien.map(([g, ds]) => (
        <section key={g} className="mt-3 overflow-hidden rounded-card border border-line bg-card">
          <h2 className="flex items-baseline justify-between gap-2 border-b border-line bg-card-hover px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-muted">
            <span className="truncate">{g}</span>
            <span className="shrink-0 font-normal normal-case">{ds.length} trận</span>
          </h2>
          <ul className="divide-y divide-line">
            {ds.map((t) => (
              <Dong key={t.slug} t={t} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
