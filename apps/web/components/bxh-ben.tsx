"use client";

import Link from "next/link";
import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";

export interface DongBxh {
  rank: number;
  ten: string;
  logo: string | null;
  tran: number;
  hs: number;
  diem: number;
}

export interface BangBxh {
  slug: string;
  ten: string;
  dong: DongBxh[];
}

/** Khung bảng xếp hạng bên phải trang /ket-qua: tab 5 giải lớn, top 6 + link bảng đầy đủ. */
export function BxhBen({ bang }: { bang: BangBxh[] }) {
  const [chon, setChon] = useState(bang[0]?.slug);
  const b = bang.find((x) => x.slug === chon) ?? bang[0];
  if (!b) return null;
  return (
    <aside className="rounded-card border border-line bg-card p-3.5 min-[900px]:sticky min-[900px]:top-20">
      <h2 className="font-display text-[17px] font-bold">Bảng xếp hạng</h2>
      {/* flex-wrap: mẫu v2 bị cắt tab "Ligue 1" ở khung 340px. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {bang.map((x) => (
          <button
            key={x.slug}
            type="button"
            onClick={() => setChon(x.slug)}
            aria-pressed={x.slug === b.slug}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
              x.slug === b.slug ? "border-brand bg-brand text-bg" : "border-line text-muted hover:text-ink"
            }`}
          >
            {x.ten}
          </button>
        ))}
      </div>
      {b.dong.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Chưa tải được bảng xếp hạng.</p>
      ) : (
        <table className="mt-3 w-full table-fixed text-[13px]">
          <thead>
            <tr className="text-[11px] text-muted">
              <th className="w-6 py-1 text-center font-medium">#</th>
              <th className="py-1 text-left font-medium">Đội</th>
              <th className="w-8 py-1 text-right font-medium">TR</th>
              <th className="w-9 py-1 text-right font-medium">HS</th>
              <th className="w-8 py-1 text-right font-medium">Đ</th>
            </tr>
          </thead>
          <tbody>
            {b.dong.map((d) => (
              <tr key={d.rank} className="border-t border-line">
                <td className="py-1.5 text-center tabular-nums text-muted">{d.rank}</td>
                <td className="py-1.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <DoiLogo src={d.logo} ten={d.ten} size={18} />
                    <span className="truncate">{d.ten}</span>
                  </span>
                </td>
                <td className="py-1.5 text-right tabular-nums text-muted">{d.tran}</td>
                <td className="py-1.5 text-right tabular-nums text-muted">{d.hs > 0 ? `+${d.hs}` : d.hs}</td>
                <td className="py-1.5 text-right font-bold tabular-nums">{d.diem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Link href={`/competitions/${b.slug}`} className="mt-3 block text-sm font-semibold text-brand hover:underline">
        Xem đầy đủ →
      </Link>
    </aside>
  );
}
