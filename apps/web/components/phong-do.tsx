import { chieuDuDoan, mauChieu, mauKQ, type KQ, type TranDoiDau } from "@/lib/phong-do";

/** 5 ô vuông T/H/B viền màu (kiểu PredictZ). Không có dữ liệu thì không vẽ gì. */
export function OPhongDo({ kq, nhan, to = false }: { kq: KQ[] | null; nhan: string; to?: boolean }) {
  if (!kq) return null;
  const co = to ? "h-5 w-5 text-[10px]" : "h-4 w-4 text-[9px]";
  return (
    <span className="flex gap-0.5" aria-label={`${nhan}: ${kq.join(" ")}`} title={nhan}>
      {kq.map((k, i) => (
        <span key={i} className={`inline-flex ${co} items-center justify-center rounded-[3px] border font-display font-bold leading-none ${mauKQ(k)}`}>
          {k}
        </span>
      ))}
    </span>
  );
}

/** Ô tỷ số dự đoán tô màu theo chiều: nhà thắng xanh · hoà vàng · khách thắng hồng. */
export function OTySoDuDoan({
  du,
  chu,
  className = "",
}: {
  du: readonly [number, number] | null;
  chu: { home: string; draw: string; away: string };
  className?: string;
}) {
  if (!du) return <span className={`rounded-md border border-line px-2 py-1 text-center text-muted ${className}`}>–</span>;
  const c = chieuDuDoan(du);
  const nhan = c === "nha" ? chu.home : c === "hoa" ? chu.draw : chu.away;
  return (
    <span className={`rounded-md border-2 bg-card px-2 py-1 text-center font-display font-bold tabular-nums ${mauChieu(c)} ${className}`}>
      {nhan} {du[0]}-{du[1]}
    </span>
  );
}

/** Ô tỷ số THẬT cạnh ô dự đoán (kiểu ô RESULT của PredictZ): viền xanh khi đúng
 *  kết quả, đỏ khi sai. */
export function OKetQua({
  that,
  dung,
  nhan,
  className = "",
}: {
  that: readonly [number, number];
  dung: boolean | null;
  nhan: string;
  className?: string;
}) {
  const mau = dung === null ? "border-line text-ink" : dung ? "border-brand text-brand" : "border-loss text-loss";
  return (
    <span className={`rounded-md border-2 bg-card px-2 py-1 text-center font-display font-bold tabular-nums ${mau} ${className}`}>
      {nhan} {that[0]}-{that[1]}
    </span>
  );
}

/** Đối đầu gần nhất: mỗi lần gặp một ô tỷ số, màu theo kết quả của đội nhà trận sắp tới. */
export function ODoiDau({ ds, nha, khach, nhan }: { ds: TranDoiDau[] | null; nha: string; khach: string; nhan: string }) {
  if (!ds) return null;
  return (
    <div className="mt-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{nhan}</p>
      <ul className="mt-1 flex flex-wrap justify-center gap-1">
        {ds.map((d) => (
          <li
            key={`${d.ngay}${d.cungChieu}`}
            title={`${d.cungChieu ? nha : khach} ${d.ts[0]}-${d.ts[1]} ${d.cungChieu ? khach : nha} · ${d.ngay.split("-").reverse().join("/")}`}
            className={`rounded-[3px] border px-1.5 py-0.5 font-display text-[11px] font-bold tabular-nums leading-none ${mauKQ(d.kq)}`}
          >
            {d.cungChieu ? `${d.ts[0]}-${d.ts[1]}` : `${d.ts[1]}-${d.ts[0]}`}
            <span className="ml-1 font-normal text-muted">’{d.ngay.slice(2, 4)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
