import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { KhoiXien } from "@/components/xien-hom-nay";
import { OG_VERSION } from "@/lib/brand";
import { ngayVN } from "@/lib/du-doan-hang";
import { duongDanNgay, lechNgay } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayTabDuDoan, ngayThang, thuVN } from "@/lib/du-doan-tran";
import { keoPhuTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { cacXienNgay } from "@/lib/xien";

/**
 * Trang kèo xiên /du-doan/xien (Peter gật 12/11, học trang "Accumulator Tips" của PredictZ):
 * mỗi ngày có trận một nhóm xiên gom sẵn từ bảng dự đoán — xiên 3, xiên 5 đội thắng, xiên tài xỉu,
 * xiên riêng giải lớn. Cả mấy ngày nằm chung một trang (nút ngày là link neo) để một URL gom hết
 * lượt tìm "kèo xiên bóng đá hôm nay". Không nút đặt cược, không tên nhà cái.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

const TIEU_DE = "Kèo xiên bóng đá hôm nay: dự đoán xiên 3, xiên 5";
const MO_TA = "Kèo xiên bóng đá hôm nay và các ngày tới theo giờ Việt Nam: xiên 3, xiên 5 đội thắng, xiên tài xỉu, kèm tỷ lệ từng trận và tỷ lệ gộp.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: TIEU_DE,
    description: MO_TA,
    alternates: buildAlternates("/du-doan/xien", lang),
    openGraph: {
      locale: "vi_VN",
      title: `${TIEU_DE} | banhbong.net`,
      description: MO_TA,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent("Kèo xiên bóng đá hôm nay")}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const NUT = "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-line px-3.5 text-sm text-muted hover:text-ink";
const MANH = "inline-flex min-h-11 items-center hover:text-ink";
const H2 = "border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]";

export default async function TrangXien({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  const tenNgay = (n: string) => (n === homNay ? "hôm nay" : n === lechNgay(homNay, 1) ? "ngày mai" : thuVN(n));
  const ngays = ngayTabDuDoan(homNay, new Set(hang.map((h) => h.ngay))).ngays.map((n) => ({
    n,
    ds: cacXienNgay(hang.filter((h) => h.ngay === n), (slug) => keoPhuTuan(slug)?.pOu),
  }));
  // Hôm nay luôn có mục (dù rỗng) vì trang mang chữ "hôm nay"; ngày sau không có xiên thì bỏ.
  const hien = ngays.filter((x) => x.n === homNay || x.ds.length > 0);
  const tong = hien.reduce((t, x) => t + x.ds.length, 0);
  const vd = hien.flatMap((x) => x.ds)[0]?.xien;

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: "Kèo xiên", url: "/du-doan/xien" }]} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">Kèo xiên</span>
      </nav>
      <h1 className="font-display text-[22px] font-bold leading-tight sm:text-[30px]">Kèo xiên bóng đá hôm nay, {thuVN(homNay)} {ngayThang(homNay)}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {tong > 0
          ? `${tong} kèo xiên bóng đá cho ${hien.filter((x) => x.ds.length > 0).length} ngày có trận, gom từ bảng dự đoán của banhbong.net: xiên 3 và xiên 5 đội thắng, xiên tài xỉu 2.5 bàn, xiên riêng từng giải lớn. `
          : "Mấy ngày tới chưa đủ trận để gom kèo xiên bóng đá. "}
        Giờ đá là giờ Việt Nam; bấm vào trận để xem dự đoán tỷ số và phong độ hai đội.
      </p>

      {hien.length > 1 && (
        <nav aria-label="Kèo xiên theo ngày" className="mt-2.5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {hien.map(({ n }) => (
            <a key={n} href={`#ngay-${n}`} className={NUT}>
              <span className="first-letter:uppercase">{tenNgay(n)}</span>&nbsp;{ngayThang(n)}
            </a>
          ))}
        </nav>
      )}

      {hien.map(({ n, ds }) => (
        <section key={n} id={`ngay-${n}`} className="mt-6 scroll-mt-20">
          <h2 className={H2}>Kèo xiên {tenNgay(n)} {ngayThang(n)}</h2>
          {ds.length === 0 ? (
            <p className="mt-3 text-[15px] text-muted">
              Hôm nay chưa gom được xiên: cần ít nhất 3 trận chưa đá mà cửa dự đoán có tỷ lệ từ 1.20 đến 2.20.
            </p>
          ) : (
            ds.map((x) => <KhoiXien key={x.khoa} xien={x.xien} tieuDe={x.ten} id={`${n}-${x.khoa}`} lang={lang} />)
          )}
          <Link href={withLang(duongDanNgay(n, homNay), lang)} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
            Dự đoán từng trận {tenNgay(n)} {ngayThang(n)} →
          </Link>
        </section>
      ))}

      <section className="mt-8">
        <h2 className={H2}>Kèo xiên là gì?</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
          <p>
            Kèo xiên bóng đá là cách gộp nhiều lựa chọn ở nhiều trận vào một lần chọn. Xiên 3 gồm 3 trận, xiên 5 gồm 5 trận.
            Tỷ lệ gộp bằng tích tỷ lệ từng trận, và xiên chỉ đúng khi mọi lựa chọn trong đó cùng đúng: sai một trận là hỏng cả xiên.
          </p>
          <p>
            {vd
              ? `Ví dụ xiên đầu tiên trên trang: ${vd.chan.map((c) => c.gia.toFixed(2)).join(" × ")} = ${vd.tong.toFixed(2)}.`
              : "Ví dụ ba trận có tỷ lệ 1.30, 1.50 và 1.60 thì tỷ lệ gộp là 1.30 × 1.50 × 1.60 = 3.12."}{" "}
            Thêm trận thì tỷ lệ gộp tăng, nhưng khả năng đúng hết giảm theo. Vì vậy xiên 5 luôn khó trúng hơn xiên 3.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className={H2}>Trang này gom xiên thế nào?</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
          <li>Chỉ lấy trận chưa đá đã có tỷ số dự đoán trên <Link href={withLang("/du-doan", lang)} className="text-brand hover:underline">bảng dự đoán bóng đá hôm nay</Link>.</li>
          <li>Xiên đội thắng lấy đúng cửa khớp tỷ số dự đoán; xiên tài xỉu lấy mốc 2.5 bàn.</li>
          <li>Chỉ nhận cửa có tỷ lệ từ 1.20 đến 2.20, xếp tỷ lệ thấp trước. Ngày nào không đủ 3 trận thì không có xiên.</li>
          <li>Trận đá xong được chấm đúng sai công khai ở <Link href={withLang("/du-doan/thanh-tich", lang)} className="text-brand hover:underline">bảng thành tích dự đoán</Link>.</li>
        </ul>
        <p className="mt-4 text-xs text-muted">Tỷ lệ chỉ để tham khảo và có thể đổi trước giờ bóng lăn. Nội dung mang tính giải trí.</p>
      </section>
    </div>
  );
}
