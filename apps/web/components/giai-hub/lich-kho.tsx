import type { LichKho, OLich } from "@/lib/giai-hub";

/** Màu theo độ khó FPL: 1–2 xanh, 3 xám, 4 đỏ, 5 đỏ sẫm. Chữ trắng trên mọi nền (đo tương phản ≥ 4.5). */
const MAU: Record<number, string> = { 1: "#0f7a3d", 2: "#0f7a3d", 3: "#4b5563", 4: "#c0353b", 5: "#7a1420" };
const TEN_KHO: Record<number, string> = { 1: "rất dễ", 2: "dễ", 3: "vừa", 4: "khó", 5: "rất khó" };

function O({ ds }: { ds: OLich[] }) {
  if (ds.length === 0) {
    return <span className="grid h-11 place-items-center rounded-md border border-line text-[11px] text-muted">Nghỉ</span>;
  }
  return (
    <span className="flex h-11 flex-col gap-0.5">
      {ds.map((x) => (
        <span
          key={x.dt + x.san}
          className="flex flex-1 flex-col items-center justify-center rounded-md text-white"
          style={{ background: MAU[x.kho] ?? MAU[3] }}
          title={`${x.dt} (${x.san === "N" ? "sân nhà" : "sân khách"}, ${TEN_KHO[x.kho] ?? ""})`}
        >
          <span className="text-[12px] font-bold leading-none">{x.dt}</span>
          {ds.length === 1 && <span className="mt-0.5 text-[10px] font-semibold leading-none opacity-90">{x.san}</span>}
        </span>
      ))}
    </span>
  );
}

/** Lịch khó/dễ 5 vòng tới (FDR của Fantasy Premier League), dễ nhất trước. Vừa 390px, không cuộn ngang. */
export function LichKhoDe({ lich }: { lich: LichKho }) {
  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-[3px]">
        <caption className="sr-only">Độ khó lịch thi đấu vòng {lich.vong[0]} đến {lich.vong[lich.vong.length - 1]}, xếp từ lịch dễ nhất</caption>
        <thead>
          <tr className="text-[12px] text-muted">
            <th scope="col" className="w-11 text-left font-semibold">Đội</th>
            {lich.vong.map((v) => (
              <th key={v} scope="col" className="text-center font-semibold">{`V${v}`}</th>
            ))}
            <th scope="col" className="w-9 text-center font-semibold">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {lich.hang.map((h) => (
            <tr key={h.ma}>
              <th scope="row" className="text-left text-[13px] font-bold">
                <abbr title={h.doi} className="no-underline">{h.ma}</abbr>
              </th>
              {h.o.map((ds, i) => (
                <td key={i} className="p-0">
                  <O ds={ds} />
                </td>
              ))}
              <td className="text-center font-display text-[14px] font-bold tabular-nums">{h.tong}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
        <span>Dễ</span>
        {[1, 3, 4, 5].map((k) => (
          <span key={k} aria-hidden="true" className="inline-block h-3.5 w-5 rounded" style={{ background: MAU[k] }} />
        ))}
        <span>Khó · N = sân nhà, K = sân khách</span>
      </p>
    </div>
  );
}
