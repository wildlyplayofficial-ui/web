import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import { xepTheoChenh, type GiaiXg } from "@/lib/xg-doi";
import { ODoi } from "./khung";

/**
 * Bảng xG một giải (/thong-so): xếp theo chênh xG mỗi trận. Điện thoại 390px chỉ giữ Đội · xG · xGA · Chênh
 * (cột khác ẩn, không cuộn ngang); số bàn so với xG hiện ở dòng phụ dưới tên đội.
 */

const so = (x: number) => x.toFixed(2);
const dau = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(x).toFixed(2)}`;
const mauLech = (x: number) => (x > 0.005 ? "text-emerald-500" : x < -0.005 ? "text-pink-500" : "text-muted");
const TH = "px-1.5 py-2 text-right font-semibold sm:px-2";
const TD = "px-1.5 py-2 text-right tabular-nums sm:px-2";
const AN = "hidden md:table-cell";

export function BangXg({ g, lang, tieuDe = true, link = false }: { g: GiaiXg; lang: Lang; tieuDe?: boolean; link?: boolean }) {
  const ds = xepTheoChenh(g.doi);
  return (
    <section id={g.slug} aria-labelledby={`${g.slug}-h`} className="scroll-mt-28">
      {tieuDe && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id={`${g.slug}-h`} className="font-display text-xl font-bold">xG {g.ten}</h2>
          {link && (
            <Link href={withLang(`/thong-so/${g.slug}`, lang)} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
              Xem riêng {g.ten} ›
            </Link>
          )}
        </div>
      )}
      <div className="mt-2 rounded-card border border-line bg-card">
        <table className="w-full table-fixed border-collapse text-[13px] sm:text-sm">
          <caption className="sr-only">Thông số xG từng đội {g.ten}, xếp theo chênh lệch xG mỗi trận</caption>
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="w-7 px-1 py-2 text-center font-semibold">#</th>
              <th scope="col" className="px-1.5 py-2 text-left font-semibold">Đội</th>
              <th scope="col" className={`${TH} ${AN} w-14`}>Trận</th>
              <th scope="col" className={`${TH} w-12 sm:w-16`} title="Bàn thắng kỳ vọng mỗi trận">xG</th>
              <th scope="col" className={`${TH} w-12 sm:w-16`} title="Bàn thua kỳ vọng mỗi trận">xGA</th>
              <th scope="col" className={`${TH} w-14 sm:w-16`}>Chênh</th>
              <th scope="col" className={`${TH} ${AN} w-32`}>Bàn/trận (so xG)</th>
              <th scope="col" className={`${TH} ${AN} w-20`}>Sút trúng</th>
              <th scope="col" className={`${TH} ${AN} w-24`}>Kiểm soát</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((d, i) => {
              const lech = d.bt - d.xg;
              return (
                <tr key={d.id} className="border-b border-line/60 last:border-0">
                  <td className="px-1 py-2 text-center font-display font-bold tabular-nums text-muted">{i + 1}</td>
                  <td className="px-1.5 py-2">
                    <ODoi
                      d={d}
                      phu={
                        <>
                          <span className="md:hidden">
                            {d.tran} trận · {so(d.bt)} bàn/trận <span className={mauLech(lech)}>({dau(lech)} so xG)</span>
                          </span>
                          <span className="hidden md:inline">{d.hang ? `Hạng ${d.hang} · ${d.diem} điểm` : `${d.tran} trận`}</span>
                        </>
                      }
                    />
                  </td>
                  <td className={`${TD} ${AN}`}>{d.tran}</td>
                  <td className={TD}>{so(d.xg)}</td>
                  <td className={TD}>{so(d.xga)}</td>
                  <td className={`${TD} font-semibold ${mauLech(d.chenh)}`}>{dau(d.chenh)}</td>
                  <td className={`${TD} ${AN}`}>
                    {so(d.bt)} <span className={`text-xs ${mauLech(lech)}`}>({dau(lech)})</span>
                  </td>
                  <td className={`${TD} ${AN}`}>{d.sut == null ? "–" : d.sut.toFixed(1)}</td>
                  <td className={`${TD} ${AN}`}>{d.ks == null ? "–" : `${d.ks.toFixed(1)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
