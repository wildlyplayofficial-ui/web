import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import { BANG_XEP, topBang, xepForm, type DongForm, type GiaiXg } from "@/lib/xg-doi";
import { Badge, ODoi } from "./khung";

/** Bảng /form: bảng xếp kiểu PredictZ (top N) và bảng phong độ từng giải. */

const TEN_KQ = { T: "thắng", H: "hòa", B: "thua" } as const;
const nhanKQ = (tien: string, kq: DongForm["kq"]) => `${tien}, cũ nhất trước: ${kq.map((k) => TEN_KQ[k]).join(", ") || "chưa có"}`;

/** Lưới bảng xếp: 1 cột điện thoại, 2 cột màn rộng. `nhieuGiai` thì hiện tên giải dưới tên đội. */
export function LuoiBangXep({ ds, n, nhieuGiai }: { ds: readonly DongForm[]; n: number; nhieuGiai: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {BANG_XEP.map((b) => {
        const top = topBang(b, ds, n);
        if (top.length === 0) return null;
        return (
          <section key={b.id} id={b.id} aria-labelledby={`${b.id}-h`} className="scroll-mt-28 rounded-card border border-line bg-card">
            <div className="border-b border-line px-3 py-2.5">
              <h3 id={`${b.id}-h`} className="font-display text-base font-bold">{b.tieuDe}</h3>
              <p className="text-xs text-muted">{b.moTa}</p>
            </div>
            <ol>
              {top.map((d, i) => (
                <li key={d.doi.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-line/60 px-3 py-2 last:border-0">
                  <span className="text-center font-display text-sm font-bold tabular-nums text-muted">{i + 1}</span>
                  <ODoi d={d.doi} phu={nhieuGiai ? d.giai.ten : undefined} />
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-display text-sm font-bold tabular-nums text-brand">{b.gt(d)}</span>
                    <Badge kq={b.kq(d)} nhan={nhanKQ(b.tieuDe, b.kq(d))} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

const TH = "px-1.5 py-2 font-semibold sm:px-2";
const AN = "hidden lg:table-cell";

/** Bảng phong độ 1 giải. Điện thoại: Đội · 5 trận · Điểm; màn rộng thêm bàn ghi/thua, sân nhà, sân khách. */
export function BangFormGiai({ g, ds, lang, link = false }: { g: GiaiXg; ds: readonly DongForm[]; lang: Lang; link?: boolean }) {
  const xep = xepForm(ds);
  return (
    <section id={`bang-${g.slug}`} aria-labelledby={`bang-${g.slug}-h`} className="scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id={`bang-${g.slug}-h`} className="font-display text-xl font-bold">Phong độ {g.ten}</h2>
        {link && (
          <Link href={withLang(`/form/${g.slug}`, lang)} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
            Xem riêng {g.ten} ›
          </Link>
        )}
      </div>
      <div className="mt-2 rounded-card border border-line bg-card">
        <table className="w-full table-fixed border-collapse text-[13px] sm:text-sm">
          <caption className="sr-only">Phong độ 5 trận giải gần nhất của từng đội {g.ten}</caption>
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="w-7 px-1 py-2 text-center font-semibold">#</th>
              <th scope="col" className="px-1.5 py-2 text-left font-semibold">Đội</th>
              <th scope="col" className={`${TH} w-[118px] text-center`}>5 trận</th>
              <th scope="col" className={`${TH} w-12 text-right`}>Điểm</th>
              <th scope="col" className={`${TH} ${AN} w-20 text-right`}>Ghi-thua</th>
              <th scope="col" className={`${TH} ${AN} w-[132px] text-center`}>Sân nhà</th>
              <th scope="col" className={`${TH} ${AN} w-[132px] text-center`}>Sân khách</th>
            </tr>
          </thead>
          <tbody>
            {xep.map((d, i) => (
              <tr key={d.doi.id} className="border-b border-line/60 last:border-0">
                <td className="px-1 py-2 text-center font-display font-bold tabular-nums text-muted">{i + 1}</td>
                <td className="px-1.5 py-2">
                  <ODoi d={d.doi} phu={<><span className="lg:hidden">Ghi {d.ghi} · thua {d.thua} · </span>Hạng {d.doi.hang ?? "–"}</>} />
                </td>
                <td className="px-1 py-2">
                  <div className="flex justify-center"><Badge kq={d.kq} nhan={nhanKQ("5 trận gần nhất", d.kq)} /></div>
                </td>
                <td className="px-1.5 py-2 text-right font-display font-bold tabular-nums sm:px-2">{d.diem}</td>
                <td className={`px-2 py-2 text-right tabular-nums ${AN}`}>{d.ghi}-{d.thua}</td>
                <td className={`px-2 py-2 ${AN}`}>
                  <div className="flex justify-center"><Badge kq={d.kqNha} nhan={nhanKQ("5 trận sân nhà", d.kqNha)} /></div>
                </td>
                <td className={`px-2 py-2 ${AN}`}>
                  <div className="flex justify-center"><Badge kq={d.kqKhach} nhan={nhanKQ("5 trận sân khách", d.kqKhach)} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
