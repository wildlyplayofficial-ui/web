import Link from "next/link";
import { DoiLogo } from "@/components/doi-logo";
import { DongTran } from "@/components/dong-tran";
import { GIAI_INDEX_TRAN } from "@/lib/chi-muc";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { ngayVN } from "@/lib/du-doan-hang";
import { hubGiai, linkHighlight, type SoTran, type TranLuuTru } from "@/lib/du-doan-luu-tru";
import { thuVN } from "@/lib/du-doan-tran";
import { logoTheoGiai } from "@/lib/du-doan-tuan";
import { withLang, type Lang } from "@/lib/i18n";
import { tenDoiViet, tenGiaiViet } from "@/lib/ten-viet";

/**
 * Trang KẾT QUẢ một trận đã đá (Peter 15/11/2026): tỷ số · số liệu trận · highlight · link giải +
 * trận kế. Không hiện dự đoán trước trận, không nhãn đúng/sai.
 */

const DONG_SO: ReadonlyArray<[keyof SoTran, string, string]> = [
  ["pos", "Kiểm soát bóng", "%"],
  ["xg", "Bàn thắng kỳ vọng (xG)", ""],
  ["sh", "Số cú sút", ""],
  ["st", "Sút trúng đích", ""],
  ["bc", "Cơ hội lớn", ""],
  ["co", "Phạt góc", ""],
  ["yc", "Thẻ vàng", ""],
];

export const tenKetQua = (t: TranLuuTru) => ({ nha: tenDoiViet(t.nha), khach: tenDoiViet(t.khach), giai: tenGiaiViet(t.giai) });

/** Trận sắp đá cùng giải (tối đa 5); giải nghỉ thì lấy trận sắp đá của các giải được index. */
export function tranKe(hang: readonly HangDuDoan[], giai: string): HangDuDoan[] {
  const sap = hang.filter((x) => x.sapDa).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  const cung = sap.filter((x) => x.giai === giai);
  return (cung.length > 0 ? cung : sap.filter((x) => GIAI_INDEX_TRAN.test(x.giai))).slice(0, 5);
}

function Doi({ ten, logo }: { ten: string; logo: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <DoiLogo src={logo} ten={ten} size={48} />
      <span className="max-w-full truncate font-display text-[15px] font-bold sm:text-lg">{ten}</span>
    </div>
  );
}

export function TranKetQua({ t, hang, lang }: { t: TranLuuTru; hang: readonly HangDuDoan[]; lang: Lang }) {
  const ten = tenKetQua(t);
  const ngay = t.gioUtc ? ngayVN(t.gioUtc) : t.ngay;
  const [y, m, d] = ngay.split("-").map(Number);
  const hl = linkHighlight(t.hl);
  const hub = hubGiai(t.giai);
  const ke = tranKe(hang, ten.giai);
  const so = DONG_SO.filter(([k]) => t.so?.[k]);
  return (
    <>
      <section className="mt-4 rounded-card border border-line bg-card px-3 py-5 text-center lg:px-8 lg:py-7">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Kết quả · {ten.giai}</p>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:gap-6">
          <Doi ten={ten.nha} logo={logoTheoGiai(t.nha, t.giai)} />
          <span className="rounded-xl border-[3px] border-ink px-3.5 py-1 font-display text-[40px] font-bold leading-tight tabular-nums lg:px-7 lg:text-[56px]">
            {t.kq[0]}-{t.kq[1]}
          </span>
          <Doi ten={ten.khach} logo={logoTheoGiai(t.khach, t.giai)} />
        </div>
        <p className="mt-3 text-sm text-muted">Hết giờ · {thuVN(ngay)} {d}/{m}/{y}</p>
        {hl && (
          <a
            href={hl.url}
            target="_blank"
            rel="noopener nofollow"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-semibold text-white hover:opacity-90"
          >
            ▶ Xem highlight
          </a>
        )}
        {hl && <p className="mt-1.5 text-xs text-muted">Video chính thức trên YouTube · kênh {hl.nguon}</p>}
      </section>

      {so.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-line pb-2 font-display text-[19px] font-bold sm:text-[22px]">Số liệu trận đấu</h2>
          <table className="mt-2 w-full text-[15px] tabular-nums">
            <thead className="sr-only">
              <tr><th>{ten.nha}</th><th>Chỉ số</th><th>{ten.khach}</th></tr>
            </thead>
            <tbody>
              {so.map(([k, nhan, don]) => {
                const v = t.so?.[k] ?? [0, 0];
                return (
                  <tr key={k} className="border-b border-line/60">
                    <td className="py-2 text-left font-semibold">{v[0]}{don}</td>
                    <td className="py-2 text-center text-muted">{nhan}</td>
                    <td className="py-2 text-right font-semibold">{v[1]}{don}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1.5 text-xs text-muted">Nguồn số liệu: FotMob.</p>
        </section>
      )}

      {hub && (
        <Link href={withLang(`/competitions/${hub}`, lang)} className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand hover:underline">
          Bảng xếp hạng, lịch thi đấu {ten.giai} →
        </Link>
      )}

      {ke.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-line pb-2 font-display text-[19px] font-bold sm:text-[22px]">Trận kế tiếp</h2>
          <ul>
            {ke.map((x) => (
              <li key={x.slug}>
                <DongTran h={x} lang={lang} hienGiai />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
