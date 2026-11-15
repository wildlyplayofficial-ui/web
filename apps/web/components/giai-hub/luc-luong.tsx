import type { DoiVang, HubGiaiData, LoaiVang } from "@/lib/giai-hub";
import { LogoDoi } from "./khoi";

const THE: Record<LoaiVang, [string, string]> = {
  i: ["Chấn thương", "bg-loss-dim text-ink ring-1 ring-inset ring-loss/60"],
  s: ["Treo giò", "bg-loss-dim text-ink ring-1 ring-inset ring-loss/60"],
  d: ["Bỏ ngỏ", "bg-warning-dim text-warning"],
};
const SO_DOI_DAU = 6;

function Doi({ d, mo, logo }: { d: DoiVang; mo: boolean; logo?: Record<string, string> }) {
  return (
    <details open={mo} className="group rounded-card border border-line bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <LogoDoi ten={d.doi} du={logo} />
        <h3 className="min-w-0 flex-1 break-words text-[15px] font-semibold">{d.doi}</h3>
        <span className="rounded-full bg-loss-dim px-2.5 py-0.5 text-[13px] font-bold text-ink ring-1 ring-inset ring-loss/60">{`${d.ds.length} vắng`}</span>
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {d.ds.map((c) => (
          <li key={c.ten} className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2">
            <span className="text-[15px] font-semibold">{c.ten}</span>
            <span className={`rounded px-1.5 py-0.5 text-[12px] font-bold ${THE[c.loai][1]}`}>{THE[c.loai][0]}</span>
            <span className="basis-full text-[13px] text-muted">{c.ghiChu}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Danh sách gọn: mỗi dòng một cầu thủ/đội (sắp treo giò, đá phạt đền — chỉ Ngoại hạng Anh). */
function DanhSachGon({ tieuDe, ds, logo }: { tieuDe: string; ds: { doi: string; ten: string; ghiChu?: string }[]; logo?: Record<string, string> }) {
  return (
    <div className="mt-5">
      <h3 className="font-display text-base font-bold">{tieuDe}</h3>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
        {ds.map((x) => (
          <li key={`${x.doi}-${x.ten}`} className="grid min-h-12 grid-cols-[22px_minmax(0,1fr)] items-center gap-2.5 px-3 py-2">
            <LogoDoi ten={x.doi} du={logo} />
            <span className="min-w-0 text-[14px] leading-snug">
              <b className="font-semibold">{x.ten}</b>
              <span className="text-muted">{` · ${x.doi}`}</span>
              {x.ghiChu && <span className="block text-[13px] text-muted">{x.ghiChu}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LucLuong({ data }: { data: HubGiaiData }) {
  const dau = data.vang.slice(0, SO_DOI_DAU);
  const con = data.vang.slice(SO_DOI_DAU);
  return (
    <div>
      <div className="space-y-2">
        {dau.map((d, i) => (
          <Doi key={d.doi} d={d} mo={i === 0} logo={data.logo} />
        ))}
      </div>
      {con.length > 0 && (
        <details className="group/het mt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-lg border border-line bg-card text-sm font-semibold hover:bg-card-hover [&::-webkit-details-marker]:hidden">
            {`Xem cả ${data.vang.length} đội`}
          </summary>
          <div className="mt-2 space-y-2">
            {con.map((d) => (
              <Doi key={d.doi} d={d} mo={false} logo={data.logo} />
            ))}
          </div>
        </details>
      )}
      {data.sapTreo && data.sapTreo.length > 0 && (
        <DanhSachGon tieuDe="Sắp bị treo giò" ds={data.sapTreo} logo={data.logo} />
      )}
      {data.phatDen && data.phatDen.length > 0 && (
        <DanhSachGon tieuDe="Người đá phạt đền số 1" ds={data.phatDen} logo={data.logo} />
      )}
    </div>
  );
}
