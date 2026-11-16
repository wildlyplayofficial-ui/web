"use client";

import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";

/** Các bảng xếp phụ của /form gom vào 1 hàng chip: bấm chip đổi bảng tại chỗ (thay vì xếp chồng 7 bảng). */

type KQ = "T" | "H" | "B";

export interface DongXep {
  id: string;
  ten: string;
  logo: string | null;
  phu?: string;
  gt: string;
  kq: KQ[];
}

export interface BangXepGon {
  id: string;
  tieuDe: string;
  moTa: string;
  dong: DongXep[];
}

const NEN: Record<KQ, string> = { T: "bg-[#047857] text-white", H: "bg-amber-500 text-black", B: "bg-[#c62828] text-white" };

export function BangXepChip({ bang }: { bang: readonly BangXepGon[] }) {
  const [id, setId] = useState(bang[0]?.id);
  const b = bang.find((x) => x.id === id) ?? bang[0];
  if (!b) return null;
  return (
    <div>
      <div role="tablist" aria-label="Chọn bảng xếp" className="flex flex-wrap gap-2">
        {bang.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === b.id}
            onClick={() => setId(x.id)}
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${x.id === b.id ? "border-brand bg-brand-dim text-brand" : "border-line text-muted"}`}
          >
            {x.tieuDe}
          </button>
        ))}
      </div>
      <section aria-label={b.tieuDe} className="mt-3 rounded-card border border-line bg-card">
        <p className="border-b border-line px-3.5 py-2 text-xs text-muted">{b.moTa}</p>
        <ol>
          {b.dong.map((d, i) => (
            <li key={d.id} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2.5 border-t border-line/60 px-3.5 py-2 first:border-0">
              <span className="text-center text-xs font-semibold tabular-nums text-muted">{i + 1}</span>
              <div className="flex min-w-0 items-center gap-2">
                <DoiLogo src={d.logo} ten={d.ten} size={22} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{d.ten}</p>
                  {d.phu && <p className="truncate text-xs text-muted">{d.phu}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-display text-sm font-bold tabular-nums text-brand">{d.gt}</span>
                <span className="flex gap-[2px]">
                  {d.kq.map((k, j) => <span key={j} className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] text-[10px] font-bold ${NEN[k]}`}>{k}</span>)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
