import { DoiLogo } from "@/components/doi-logo";
import { mauKQ } from "@/lib/phong-do";
import { tenDoiViet } from "@/lib/ten-viet";
import {
  chuoiHienTai, giuSach, kqCuaDoi, moiTruoc, ngayNgan, thanhTich,
  type DongBangXep, type SoLieuTran, type TranGanDay,
} from "@/lib/tran-so-lieu";

/**
 * Số liệu thêm trên trang trận: lịch sử đối đầu, rồi MỖI ĐỘI MỘT THẺ (Peter duyệt mẫu 11/11,
 * bố cục theo đội như PredictZ): thành tích sân sẽ đá · hạng · đáng chú ý · các trận gần nhất.
 * Máy tính 2 cột (nhà trái, khách phải), điện thoại xếp chồng. Thiếu trường nào thì phần đó không vẽ.
 */

const O = "rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";
const TY_SO = "shrink-0 font-display font-bold tabular-nums";
const OSO = "min-w-0 rounded-lg border border-line px-1.5 py-2 text-center";

/** Ô số kiểu ô tỷ lệ 1·X·2: nhãn nhỏ trên, số to dưới. */
function OSo({ nhan, so, mau = "" }: { nhan: string; so: string | number; mau?: string }) {
  return (
    <p className={OSO}>
      <span className="block text-xs leading-tight text-muted">{nhan}</span>
      <b className={`font-display text-xl tabular-nums ${mau}`}>{so}</b>
    </p>
  );
}

const COT: [string, keyof DongBangXep | "btbb"][] = [["Hạng", "hang"], ["Trận", "tran"], ["T", "t"], ["H", "h"], ["B", "b"], ["BT-BB", "btbb"], ["Điểm", "diem"]];

function DongHang({ d }: { d: DongBangXep }) {
  return (
    <table className="mt-1.5 w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-muted">
          {COT.map(([ten]) => <th key={ten} scope="col" className="px-1 py-1 text-center font-medium">{ten}</th>)}
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-line">
          {COT.map(([ten, k]) => (
            <td key={ten} className={`px-1 py-2 text-center ${k === "hang" || k === "diem" ? "font-display font-bold" : ""} ${k === "diem" ? "text-brand" : ""}`}>
              {k === "btbb" ? `${d.bt}-${d.bb}` : d[k]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function TheDoi({ id, doi, logo, ds, bx, san }: {
  id: string; doi: string; logo: string | null; ds: readonly TranGanDay[]; bx?: DongBangXep; san: "nha" | "khach";
}) {
  const tran = moiTruoc(ds).flatMap((t) => {
    const kq = kqCuaDoi(t, doi);
    return kq ? [{ t, kq }] : [];
  });
  if (tran.length === 0 && !bx) return null;
  const ten = tenDoiViet(doi);
  const s = thanhTich(ds, doi, san);
  const tc = thanhTich(ds, doi);
  const ch = chuoiHienTai(ds, doi);
  const tb = (x: number) => (x / tc.tran).toFixed(1);
  return (
    <section id={id} className={`${O} scroll-mt-20`}>
      <h2 className="flex items-center gap-2.5 font-display text-lg font-bold leading-tight">
        <DoiLogo src={logo} ten={ten} lop="h-8 w-8" />
        <span className="min-w-0 break-words">{ten}</span>
      </h2>

      {s.tran > 0 && (
        <>
          <h3 className={`${NHAN} mt-4`}>{san === "nha" ? "Sân nhà" : "Sân khách"} · {s.tran} trận</h3>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <OSo nhan="Thắng" so={s.t} mau="text-brand" />
            <OSo nhan="Hòa" so={s.h} />
            <OSo nhan="Thua" so={s.b} mau="text-loss" />
          </div>
        </>
      )}

      {bx && (
        <>
          <h3 className={`${NHAN} mt-4`}>Bảng xếp hạng</h3>
          <DongHang d={bx} />
        </>
      )}

      {tc.tran > 0 && ch && (
        <>
          <h3 className={`${NHAN} mt-4`}>Đáng chú ý</h3>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <OSo nhan={ch.loai === "chuaThua" ? "Trận liền chưa thua" : "Trận liền chưa thắng"} so={ch.so} mau={ch.loai === "chuaThua" ? "text-brand" : "text-loss"} />
            <OSo nhan="Ghi mỗi trận" so={tb(tc.ghi)} />
            <OSo nhan="Thủng lưới mỗi trận" so={tb(tc.thung)} />
            <OSo nhan="Giữ sạch lưới" so={`${giuSach(ds, doi)}/${tc.tran}`} />
          </div>
        </>
      )}

      {tran.length > 0 && (
        <>
          <h3 className={`${NHAN} mt-4`}>{tran.length} trận gần nhất</h3>
          <ul className="mt-1">
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
          <p className="border-t border-line pt-2 text-xs text-muted">Số trên thẻ tính trong {tran.length} trận này · T thắng · H hòa · B thua.</p>
        </>
      )}
    </section>
  );
}

export function TranSoLieu({ so, logo }: {
  so: SoLieuTran & { nha: string; khach: string };
  /** Logo [đội nhà, đội khách] lấy từ ô lớn đầu trang. */
  logo: [string | null, string | null];
}) {
  const h2h = so.h2h ?? [];
  const gn = so.gn ?? [];
  const gk = so.gk ?? [];
  const coThe = gn.length > 0 || gk.length > 0 || so.bxn || so.bxk;
  return (
    <>
      {h2h.length > 0 && (
        <section className={`${O} mt-3`}>
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
      {coThe && (
        <>
          <nav aria-label="Số liệu từng đội" className="mt-4 flex flex-wrap gap-2 lg:hidden">
            {[["#doi-nha", so.nha], ["#doi-khach", so.khach]].map(([href, ten]) => (
              <a key={href} href={href} className="inline-flex min-h-9 items-center rounded-full border border-line px-3.5 text-[13px] hover:border-brand hover:text-brand">
                {tenDoiViet(ten)}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
            <TheDoi id="doi-nha" doi={so.nha} logo={logo[0]} ds={gn} bx={so.bxn} san="nha" />
            <TheDoi id="doi-khach" doi={so.khach} logo={logo[1]} ds={gk} bx={so.bxk} san="khach" />
          </div>
        </>
      )}
    </>
  );
}
