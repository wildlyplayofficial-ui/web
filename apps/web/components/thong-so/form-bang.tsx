"use client";

import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";

/**
 * Bảng phong độ 1 giải kiểu Flashscore (Peter gật mẫu 16/11/2026): nút Tổng / Sân nhà / Sân khách đổi bảng tại chỗ,
 * mỗi đội 1 dòng gọn (tên · "Bàn 7:1 · hạng 1" · 5 ô · điểm). Bấm 1 ô hiện trận đó ngay dưới dòng.
 * Không import lib/xg-doi (kéo cả tệp JSON vào bundle) — mấy phép tính nhỏ viết lại ở đây.
 */

export interface TranGon {
  ngay: string;
  dt: string;
  san: "N" | "K";
  bt: number;
  bb: number;
}

export interface DoiGon {
  id: string;
  ten: string;
  logo: string | null;
  hang: number | null;
  gan: TranGon[];
}

type CheDo = "tong" | "N" | "K";
type KQ = "T" | "H" | "B";

const CHE_DO: readonly { id: CheDo; ten: string }[] = [
  { id: "tong", ten: "Tổng" },
  { id: "N", ten: "Sân nhà" },
  { id: "K", ten: "Sân khách" },
];
const NEN: Record<KQ, string> = { T: "bg-[#047857] text-white", H: "bg-amber-500 text-black", B: "bg-[#c62828] text-white" };
const TEN_KQ: Record<KQ, string> = { T: "Thắng", H: "Hòa", B: "Thua" };

const kq = (t: TranGon): KQ => (t.bt > t.bb ? "T" : t.bt === t.bb ? "H" : "B");
const diem = (k: KQ) => (k === "T" ? 3 : k === "H" ? 1 : 0);
const ngay = (ymd: string) => ymd.slice(5).split("-").reverse().join("/");

function dong(d: DoiGon, che: CheDo) {
  const tran = (che === "tong" ? d.gan : d.gan.filter((t) => t.san === che)).slice(-5);
  const ghi = tran.reduce((a, t) => a + t.bt, 0);
  const thua = tran.reduce((a, t) => a + t.bb, 0);
  return { d, tran, ghi, thua, diem: tran.reduce((a, t) => a + diem(kq(t)), 0) };
}

export function FormBang({ doi }: { doi: readonly DoiGon[] }) {
  const [che, setChe] = useState<CheDo>("tong");
  const [mo, setMo] = useState<string | null>(null);
  const ds = doi
    .map((d) => dong(d, che))
    .sort((a, b) => b.diem - a.diem || b.ghi - b.thua - (a.ghi - a.thua) || b.ghi - a.ghi || a.d.ten.localeCompare(b.d.ten));
  return (
    <div>
      <div role="tablist" aria-label="Chọn sân" className="flex rounded-[10px] border border-line bg-card p-[3px]">
        {CHE_DO.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={che === c.id}
            onClick={() => { setChe(c.id); setMo(null); }}
            className={`min-h-11 flex-1 rounded-lg text-sm transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${che === c.id ? "bg-line font-semibold text-ink" : "text-muted"}`}
          >
            {c.ten}
          </button>
        ))}
      </div>
      <ol className="mt-2.5 rounded-card border border-line bg-card">
        {ds.map((x, i) => {
          const chon = x.tran.find((t) => `${x.d.id}-${t.ngay}` === mo);
          return (
            <li key={x.d.id} className="border-t border-line/60 px-3 py-2 first:border-0">
              <div className="grid grid-cols-[18px_minmax(0,1fr)_auto_24px] items-center gap-x-2">
                <span className="text-center text-xs font-semibold tabular-nums text-muted">{i + 1}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <DoiLogo src={x.d.logo} ten={x.d.ten} size={22} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{x.d.ten}</p>
                    <p className="truncate text-xs text-muted">Bàn {x.ghi}:{x.thua}{x.d.hang ? ` · hạng ${x.d.hang}` : ""}</p>
                  </div>
                </div>
                <span className="flex gap-[3px]">
                  {x.tran.map((t) => {
                    const k = `${x.d.id}-${t.ngay}`;
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-label={`${ngay(t.ngay)} ${t.san === "N" ? "sân nhà" : "sân khách"} gặp ${t.dt}: ${t.bt}-${t.bb}, ${TEN_KQ[kq(t)].toLowerCase()}`}
                        aria-pressed={mo === k}
                        onClick={() => setMo(mo === k ? null : k)}
                        className={`relative inline-flex h-[22px] w-[22px] items-center justify-center rounded-[4px] font-display text-xs font-bold transition-transform duration-150 after:absolute after:-inset-x-[2px] after:-inset-y-[11px] active:scale-[0.9] ${NEN[kq(t)]} ${mo === k ? "ring-2 ring-ink ring-offset-1 ring-offset-card" : ""}`}
                      >
                        {kq(t)}
                      </button>
                    );
                  })}
                  {x.tran.length === 0 && <span className="text-xs text-muted">–</span>}
                </span>
                <span className="text-right font-display text-sm font-bold tabular-nums">{x.diem}</span>
              </div>
              {chon && (
                <p className="ml-[26px] mt-1.5 rounded-md bg-bg px-2.5 py-1.5 text-[13px]">
                  {ngay(chon.ngay)} · {chon.san === "N" ? "Sân nhà" : "Sân khách"} gặp {chon.dt}:{" "}
                  <b className="tabular-nums">{chon.bt}-{chon.bb}</b> ({TEN_KQ[kq(chon)]})
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted">5 trận giải gần nhất, ô bên phải là trận mới nhất. Bấm vào ô để xem trận.</p>
    </div>
  );
}
