"use client";

import { useState } from "react";
import type { CauThuTop, HubGiaiData } from "@/lib/giai-hub";
import { LogoDoi } from "./khoi";

type Khoa = keyof HubGiaiData["top"];
const NHAN: [Khoa, string, string][] = [
  ["ban", "Vua phá lưới", "bàn"],
  ["kienTao", "Kiến tạo", "kiến tạo"],
  ["xg", "xG", "xG"],
  ["xa", "xA", "xA"],
  ["cuuThua", "Thủ môn cứu thua", "pha cứu thua"],
];
const SO_DONG = 5;

/**
 * Top cầu thủ. Cả 5 danh sách đều nằm sẵn trong HTML (Google đọc được không cần JS);
 * nút chỉ đổi danh sách nào đang hiện. "Xem top 10" mở hết 10 dòng tại chỗ.
 */
export function ThongKeCauThu({ top, logo }: { top: HubGiaiData["top"]; logo?: Record<string, string> }) {
  const [chon, setChon] = useState<Khoa>("ban");
  const [het, setHet] = useState(false);
  const co = NHAN.filter(([k]) => top[k].length > 0);
  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Chọn bảng thống kê">
        {co.map(([k, nhan]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={chon === k}
            onClick={() => setChon(k)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${chon === k ? "border-brand bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
          >
            {nhan}
          </button>
        ))}
      </div>
      {co.map(([k, nhan, donVi]) => (
        <div key={k} role="tabpanel" hidden={chon !== k} aria-label={nhan}>
          <h3 className="sr-only">{nhan}</h3>
          <Bang ds={top[k]} donVi={donVi} het={het} logo={logo} />
        </div>
      ))}
      {co.some(([k]) => top[k].length > SO_DONG) && (
        <button
          type="button"
          onClick={() => setHet((v) => !v)}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-card text-sm font-semibold text-ink hover:bg-card-hover"
        >
          {het ? "Thu gọn" : "Xem top 10"}
        </button>
      )}
    </div>
  );
}

function Bang({ ds, donVi, het, logo }: { ds: CauThuTop[]; donVi: string; het: boolean; logo?: Record<string, string> }) {
  return (
    <ol className="mt-2 divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
      {ds.map((c, i) => (
        <li
          key={`${c.ten}-${c.doi}`}
          className={`${!het && i >= SO_DONG ? "hidden" : "grid"} min-h-14 grid-cols-[24px_22px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2`}
        >
          <span className="text-center font-display text-sm font-bold text-muted tabular-nums">{i + 1}</span>
          <LogoDoi ten={c.doi} du={logo} />
          <span className="min-w-0">
            <span className="block break-words text-[15px] font-semibold leading-snug">{c.ten}</span>
            <span className="block text-[13px] text-muted">{`${c.doi} · ${c.phu}`}</span>
          </span>
          <span className="text-right font-display text-xl font-bold text-brand tabular-nums" aria-label={`${c.gt} ${donVi}`}>
            {Number.isInteger(c.gt) ? c.gt : c.gt.toFixed(2)}
          </span>
        </li>
      ))}
    </ol>
  );
}
