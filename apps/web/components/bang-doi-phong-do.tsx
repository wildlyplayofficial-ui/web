"use client";

import Link from "next/link";
import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";
import type { DongPhongDo } from "@/lib/doi-phong-do";
import { withLang, type Lang } from "@/lib/i18n";
import { mauKQ } from "@/lib/phong-do";

/** Bảng xếp hạng đội theo phong độ chung; lọc theo giải bằng ô chọn (mọi dòng vẫn có trong HTML gốc). */

const TEN_KQ = { T: "thắng", H: "hòa", B: "thua" } as const;
const ngayNgan = (ymd: string) => ymd.split("-").reverse().slice(0, 2).join("/");

export function BangDoiPhongDo({ ds, lang }: { ds: DongPhongDo[]; lang: Lang }) {
  const giai = [...new Set(ds.map((d) => d.giai))].sort((a, b) => a.localeCompare(b));
  const [chon, setChon] = useState("");
  const hien = chon ? ds.filter((d) => d.giai === chon) : ds;
  return (
    <>
      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        Giải đấu
        <select value={chon} onChange={(e) => setChon(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-2.5 text-sm text-ink sm:max-w-xs">
          <option value="">Tất cả giải ({ds.length} đội)</option>
          {giai.map((g) => <option key={g} value={g}>{g} ({ds.filter((d) => d.giai === g).length})</option>)}
        </select>
      </label>
      <ol className="mt-3 border-t border-line">
        {hien.map((d, i) => (
          <li key={d.doi} data-giai={d.giai} className="border-b border-line/60">
            <Link href={withLang(`/du-doan/${d.tran.slug}`, lang)} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-2.5 px-0.5 py-2.5 transition-colors hover:bg-card-hover sm:px-1.5">
              <span className="text-center font-display text-sm font-bold tabular-nums text-muted">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <DoiLogo src={d.logo} ten={d.doi} lop="h-7 w-7" />
                  <span className="truncate text-[15px] font-semibold">{d.doi}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{d.giai}</p>
                <p className="mt-1 truncate text-xs text-muted">
                  Trận kế: gặp <b className="text-ink">{d.tran.doiThu}</b> · {ngayNgan(d.tran.ngay)} {d.tran.gio}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="inline-block min-w-[56px] rounded-md border-2 border-brand px-2 py-px text-center font-display text-base font-bold tabular-nums text-brand" aria-label={`Phong độ chung ${d.diem} trên 10`}>
                  {d.diem}/10
                </span>
                <span className="flex gap-1" role="img" aria-label={`5 trận gần nhất, cũ nhất trước: ${d.kq.map((k) => TEN_KQ[k]).join(", ")}`}>
                  {d.kq.map((k, j) => (
                    <span key={j} aria-hidden className={`inline-flex h-5 w-5 items-center justify-center rounded border font-display text-[11px] font-bold leading-none ${mauKQ(k)}`}>{k}</span>
                  ))}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
