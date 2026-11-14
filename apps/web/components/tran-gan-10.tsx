import type { GanNhat } from "@/lib/du-doan-tuan";
import { mauKQ } from "@/lib/phong-do";
import { tenDoiViet } from "@/lib/ten-viet";
import { tenSo } from "@/lib/du-doan-cham";
import { kqCuaDoi, moiTruoc, type TranGanDay } from "@/lib/tran-so-lieu";

/**
 * Khối "10 trận gần nhất" của từng đội (kiểu "Recent results" của PredictZ): ngày dd/mm/yyyy, hai đội,
 * tỷ số, ô T/H/B nhìn từ đội đang xét (tên đội đó in đậm). Xếp mới nhất trước; danh sách rỗng thì không vẽ.
 */

const O = "mt-3 rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";
const TEN_KQ = { T: "thắng", H: "hòa", B: "thua" } as const;

const ngayDayDu = (ymd: string) => ymd.split("-").reverse().join("/");

function Doi({ doi, ds }: { doi: string; ds: readonly TranGanDay[] }) {
  const tran = moiTruoc(ds).flatMap((t) => {
    const kq = kqCuaDoi(t, doi);
    return kq ? [{ t, kq }] : [];
  }).slice(0, 10);
  if (tran.length === 0) return null;
  const ten = tenSo(doi);
  const dam = (x: string) => (tenSo(x) === ten ? "font-bold text-ink" : "");
  return (
    <div>
      <h3 className="text-sm font-semibold">{tenDoiViet(doi)}</h3>
      <ul className="mt-1">
        {tran.map(({ t, kq }) => (
          <li key={`${t.ngay}-${t.nha}-${t.khach}`} className="flex items-center gap-2.5 border-t border-line py-2 text-sm">
            <span className="w-[76px] shrink-0 text-xs tabular-nums text-muted">{ngayDayDu(t.ngay)}</span>
            <span className="min-w-0 flex-1 leading-snug">
              <span className={dam(t.nha)}>{tenDoiViet(t.nha)}</span>{" "}
              <b className="shrink-0 font-display font-bold tabular-nums">{t.tsn}-{t.tsk}</b>{" "}
              <span className={dam(t.khach)}>{tenDoiViet(t.khach)}</span>
            </span>
            <span aria-label={TEN_KQ[kq]} className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border font-display text-xs font-bold leading-none ${mauKQ(kq)}`}>
              {kq}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TranGan10({ g }: { g: GanNhat }) {
  const coNha = (g.gn?.length ?? 0) > 0;
  const coKhach = (g.gk?.length ?? 0) > 0;
  if (!coNha && !coKhach) return null;
  return (
    <section className={O}>
      <h2 className={NHAN}>10 trận gần nhất</h2>
      <div className="mt-2.5 grid gap-5 md:grid-cols-2 md:gap-6">
        {coNha && <Doi doi={g.nha} ds={g.gn ?? []} />}
        {coKhach && <Doi doi={g.khach} ds={g.gk ?? []} />}
      </div>
      <p className="mt-3 text-xs text-muted">T thắng · H hòa · B thua, tính theo đội đang xét. Trận mới nhất ở trên cùng.</p>
    </section>
  );
}
