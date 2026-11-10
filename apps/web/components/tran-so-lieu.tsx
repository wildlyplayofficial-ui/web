import { mauKQ } from "@/lib/phong-do";
import { tenDoiViet } from "@/lib/ten-viet";
import {
  cauBanThang, cauSan, kqCuaDoi, moiTruoc, ngayNgan, thanhTich,
  type DongBangXep, type SoLieuTran, type TranGanDay,
} from "@/lib/tran-so-lieu";

/**
 * Ba khối số liệu thêm trên trang trận: lịch sử đối đầu · vị trí bảng xếp hạng · các trận gần nhất.
 * Tệp tuần không ghi trường nào thì khối đó KHÔNG vẽ (không ô rỗng).
 */

const O = "mt-3 rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";
const TY_SO = "shrink-0 font-display font-bold tabular-nums";

/** Tiêu đề cột bảng xếp hạng: [điện thoại, màn rộng]. */
const COT: [string, string][] = [["Tr", "Trận"], ["T", "Thắng"], ["H", "Hòa"], ["B", "Thua"], ["BT-BB", "Bàn thắng-thua"], ["Đ", "Điểm"]];

function BangXep({ dong }: { dong: [string, DongBangXep][] }) {
  return (
    <section className={O}>
      <h2 className={NHAN}>Vị trí trên bảng xếp hạng</h2>
      <table className="mt-2 w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">Hạng</th>
            <th scope="col" className="py-1.5 text-left font-medium">Đội</th>
            {COT.map(([ngan, dai]) => (
              <th key={ngan} scope="col" className="px-1 py-1.5 text-center font-medium">
                <span className="sm:hidden">{ngan}</span>
                <span className="hidden sm:inline">{dai}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dong.map(([ten, d]) => (
            <tr key={ten} className="border-t border-line">
              <td className="py-2 pr-2 font-display font-bold">{d.hang}</td>
              <th scope="row" className="py-2 text-left text-[15px] font-semibold">{tenDoiViet(ten)}</th>
              {[d.tran, d.t, d.h, d.b, `${d.bt}-${d.bb}`].map((x, i) => (
                <td key={i} className="px-1 py-2 text-center">{x}</td>
              ))}
              <td className="px-1 py-2 text-center font-display font-bold text-brand">{d.diem}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted sm:hidden">Tr trận · T thắng · H hòa · B thua · BT-BB bàn thắng-bàn thua · Đ điểm.</p>
    </section>
  );
}

/** Các trận gần nhất của một đội (mới nhất ở trên) + thành tích sân sẽ đá trận này + bàn thắng mỗi trận. */
function TranCuaDoi({ doi, ds, san }: { doi: string; ds: readonly TranGanDay[]; san: "nha" | "khach" }) {
  const tran = moiTruoc(ds).flatMap((t) => {
    const kq = kqCuaDoi(t, doi);
    return kq ? [{ t, kq }] : [];
  });
  if (tran.length === 0) return null;
  const cau = [cauSan(thanhTich(ds, doi, san), san), cauBanThang(thanhTich(ds, doi))].filter((c): c is string => c !== null);
  return (
    <div className="min-w-0">
      <h3 className="text-[15px] font-semibold">{tenDoiViet(doi)}</h3>
      <ul className="mt-1.5">
        {tran.map(({ t, kq }) => (
          <li key={`${t.ngay}-${t.nha}-${t.khach}`} className="flex items-center gap-2.5 border-t border-line py-2 text-sm">
            <span className="w-10 shrink-0 text-xs tabular-nums text-muted">{ngayNgan(t.ngay)}</span>
            <span className="min-w-0 flex-1">
              {tenDoiViet(t.nha)} <b className={TY_SO}>{t.tsn}-{t.tsk}</b> {tenDoiViet(t.khach)}
            </span>
            <span aria-label={kq === "T" ? "thắng" : kq === "H" ? "hòa" : "thua"} className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border font-display text-xs font-bold leading-none ${mauKQ(kq)}`}>
              {kq}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line pt-2 text-[13px] leading-relaxed text-muted">
        Tính trên {tran.length} trận này.{cau.map((c) => ` ${c}.`).join("")}
      </p>
    </div>
  );
}

export function TranSoLieu({ so }: { so: SoLieuTran & { nha: string; khach: string } }) {
  const h2h = so.h2h ?? [];
  const bang: [string, DongBangXep][] = [...(so.bxn ? [[so.nha, so.bxn] as [string, DongBangXep]] : []), ...(so.bxk ? [[so.khach, so.bxk] as [string, DongBangXep]] : [])];
  const gn = so.gn ?? [];
  const gk = so.gk ?? [];
  const soTran = gn.length === gk.length || gk.length === 0 ? gn.length : gn.length === 0 ? gk.length : 0;
  return (
    <>
      {h2h.length > 0 && (
        <section className={O}>
          <h2 className={NHAN}>Lịch sử đối đầu</h2>
          <ul className="mt-1">
            {h2h.map((t) => (
              <li key={`${t.mua}-${t.nha}`} className="flex items-center gap-3 border-b border-line py-2 text-sm last:border-b-0 last:pb-0">
                <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">Mùa {t.mua}</span>
                <span className="min-w-0 flex-1">
                  {tenDoiViet(t.nha)} <b className={TY_SO}>{t.tsn}-{t.tsk}</b> {tenDoiViet(t.khach)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {bang.length > 0 && <BangXep dong={bang} />}
      {gn.length + gk.length > 0 && (
        <section className={O}>
          <h2 className={NHAN}>{soTran > 0 ? `${soTran} trận gần nhất` : "Các trận gần nhất"}</h2>
          <div className="mt-2.5 grid gap-x-8 gap-y-5 lg:grid-cols-2">
            <TranCuaDoi doi={so.nha} ds={gn} san="nha" />
            <TranCuaDoi doi={so.khach} ds={gk} san="khach" />
          </div>
        </section>
      )}
    </>
  );
}
