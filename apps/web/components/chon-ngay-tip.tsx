import Link from "next/link";
import { duongTip, nhanKy, type KyNgay } from "@/components/trang-tip-ngay";
import { ngayVN } from "@/lib/du-doan-hang";
import { duongDanNgay, lechNgay } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang } from "@/lib/du-doan-tran";
import { keoPhuTuan } from "@/lib/du-doan-tuan";
import { withLang, type Lang } from "@/lib/i18n";
import { dongTipNgay, type LoaiTip } from "@/lib/tip-ngay";
import { cacXienNgay } from "@/lib/xien";

/** Số ngày chọn được: hôm nay + 4 ngày tới (như PredictZ). Ngày không có trận thì hiện mờ, không thành link (trang rỗng là noindex). */
export const SO_NGAY_TIP = 5;

/** Kỳ của ngày thứ `i` kể từ hôm nay: 0 → hom-nay, 1 → ngay-mai, còn lại YYYY-MM-DD. */
export const kyThu = (homNay: string, i: number): KyNgay => (i === 0 ? "hom-nay" : i === 1 ? "ngay-mai" : (lechNgay(homNay, i) as KyNgay));

const CHIP = "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold";

export async function ChonNgayTip({ loai, ky, lang }: { loai: LoaiTip; ky: KyNgay; lang: Lang }) {
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  const ngay = Array.from({ length: SO_NGAY_TIP }, (_, i) => {
    const k = kyThu(homNay, i);
    const n = lechNgay(homNay, i);
    return { k, n, so: dongTipNgay(hang, n, loai, keoPhuTuan).length };
  });
  const hien = ngay.find((x) => x.k === ky);
  const xien = hien && (hien.k === "hom-nay" || cacXienNgay(hang.filter((h) => h.ngay === hien.n), keoPhuTuan).length > 0)
    ? duongDanNgay(hien.n, homNay).replace("/du-doan", "/keo-xien")
    : null;
  return (
    <>
      <nav aria-label="Chọn ngày" className="mt-3 flex flex-wrap gap-2">
        {ngay.map(({ k, n, so }) => {
          const nhan = k === "hom-nay" ? "Hôm nay" : k === "ngay-mai" ? "Ngày mai" : `${nhanKy(k)} ${ngayThang(n)}`;
          if (k === ky) return <span key={k} aria-current="page" className={`${CHIP} border-brand text-brand`}>{nhan}</span>;
          if (so === 0) return <span key={k} className={`${CHIP} border-line/60 text-muted/60`} title="Chưa có trận">{nhan}</span>;
          return <Link key={k} href={withLang(duongTip(loai, k), lang)} className={`${CHIP} border-line text-muted hover:text-ink`}>{nhan}</Link>;
        })}
      </nav>
      {xien && (
        <p className="mt-2">
          <Link href={withLang(xien, lang)} className={`${CHIP} border-line text-muted hover:text-ink`}>Kèo xiên {nhanKy(ky)}</Link>
        </p>
      )}
    </>
  );
}
