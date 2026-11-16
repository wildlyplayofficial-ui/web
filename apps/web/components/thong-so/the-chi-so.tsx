import { xepChiSo, type ChiSo } from "@/lib/chi-so-doi";
import type { DoiXg } from "@/lib/xg-doi";
import { ODoi } from "./khung";

/**
 * Thẻ 1 chỉ số kiểu FotMob: 3 đội dẫn đầu, số đội 1 tô nổi; phần còn lại gập trong "Xem đủ N đội"
 * (vẫn nằm trong HTML, không tách trang mỏng).
 */

function Dong({ i, d, chu, phu }: { i: number; d: DoiXg; chu: string; phu: string }) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-2.5 border-t border-line/60 px-3.5 py-2 first:border-0">
      <span className="text-center text-xs font-semibold tabular-nums text-muted">{i + 1}</span>
      <ODoi d={d} phu={phu} />
      <span className={`font-display text-sm font-bold tabular-nums ${i === 0 ? "rounded-full bg-brand px-2.5 py-0.5 text-bg" : ""}`}>{chu}</span>
    </li>
  );
}

export function TheChiSo({ c, ds }: { c: ChiSo; ds: readonly DoiXg[] }) {
  const xep = xepChiSo(c, ds);
  if (xep.length === 0) return null;
  const top = xep.slice(0, 3);
  const con = xep.slice(3);
  return (
    <section id={c.id} aria-labelledby={`${c.id}-h`} className="scroll-mt-28 overflow-hidden rounded-card border border-line bg-card">
      <div className="px-3.5 pb-1 pt-3">
        <h3 id={`${c.id}-h`} className="text-[15px] font-bold">{c.ten}</h3>
        <p className="text-xs text-muted">{c.moTa}</p>
      </div>
      <ol>{top.map((x, i) => <Dong key={x.doi.id} i={i} d={x.doi} chu={x.chu} phu={x.phu} />)}</ol>
      {con.length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1 text-sm font-semibold text-brand active:bg-card-hover [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Xem đủ {xep.length} đội</span>
            <span className="hidden group-open:inline">Thu gọn</span>
            <span aria-hidden className="transition-transform duration-200 group-open:rotate-180">▾</span>
          </summary>
          <ol className="border-t border-line/60">{con.map((x, i) => <Dong key={x.doi.id} i={i + 3} d={x.doi} chu={x.chu} phu={x.phu} />)}</ol>
        </details>
      )}
    </section>
  );
}
