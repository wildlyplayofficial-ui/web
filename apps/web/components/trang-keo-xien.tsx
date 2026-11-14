import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { NutChuDe } from "@/components/trang-xien-chu-de";
import { KhoiXien } from "@/components/xien-hom-nay";
import { OG_VERSION } from "@/lib/brand";
import { duongDanNgay, lechNgay } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayTabDuDoan, ngayThang, thuVN } from "@/lib/du-doan-tran";
import { keoPhuTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { cacXienNgay, tenLoaiXien, type XienNgay } from "@/lib/xien";
import { ChuTy } from "@/components/ty-le";
import { T } from "@/lib/ty-le";

/**
 * Trang kèo xiên /keo-xien (Peter 12/11: tách khỏi dự đoán, "làm theo PredictZ" — trang
 * Accumulator Tips): mỗi ngày một link riêng (/keo-xien, /keo-xien/ngay-mai, /keo-xien/thu-bay),
 * xiên gom theo giải × loại, cuối trang 4 mục giải thích. Không nút đặt cược, không tên nhà cái.
 */

/** Link kèo xiên của một ngày: cùng bộ slug ngày với /du-doan. */
export const duongDanXien = (ngay: string, homNay: string) => duongDanNgay(ngay, homNay).replace("/du-doan", "/keo-xien");

const tenNgay = (n: string, homNay: string) => (n === homNay ? "hôm nay" : n === lechNgay(homNay, 1) ? "ngày mai" : thuVN(n));

export async function xienCuaNgay(ngay: string): Promise<{ ds: XienNgay[]; coNgay: string[] }> {
  const { hang } = await taiDuDoan();
  const gomNgay = (n: string) => cacXienNgay(hang.filter((h) => h.ngay === n), keoPhuTuan);
  return { ds: gomNgay(ngay), coNgay: [...new Set(hang.map((h) => h.ngay))].filter((n) => gomNgay(n).length > 0) };
}

export function metaKeoXien(ngay: string, homNay: string, lang: Lang): Metadata {
  const ten = `${tenNgay(ngay, homNay)} ${ngayThang(ngay)}`;
  const title = ngay === homNay ? "Kèo xiên bóng đá hôm nay: xiên đội thắng, tài xỉu" : `Kèo xiên bóng đá ${ten}`;
  const description = `Kèo xiên bóng đá ${ten} theo giờ Việt Nam, gom theo từng giải: xiên đội thắng, xiên tài xỉu 2.5 bàn, xiên hai đội ghi bàn, kèm tỷ lệ từng trận và tỷ lệ gộp.`;
  return {
    title,
    description,
    alternates: buildAlternates(duongDanXien(ngay, homNay), lang),
    openGraph: {
      locale: "vi_VN",
      title: `${title} | banhbong.net`,
      description,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(`Kèo xiên bóng đá ${tenNgay(ngay, homNay)}`)}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";
const H2 = "border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]";
const DOAN = "mt-3 space-y-3 text-[15px] leading-relaxed";

export function TrangKeoXien({ ngay, homNay, ds, coNgay, lang }: { ngay: string; homNay: string; ds: XienNgay[]; coNgay: string[]; lang: Lang }) {
  const ten = tenNgay(ngay, homNay);
  const duong = duongDanXien(ngay, homNay);
  // Nút ngày: hôm nay luôn có (trang gốc), ngày sau chỉ hiện khi gom được xiên.
  const nutNgay = ngayTabDuDoan(homNay, new Set([homNay, ...coNgay])).ngays;
  const vd = ds[0]?.xien;
  const soGiai = new Set(ds.map((x) => x.giai)).size;

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd
        items={[{ name: "Trang chủ", url: "/" }, { name: "Kèo xiên", url: "/keo-xien" }, ...(ngay === homNay ? [] : [{ name: `Kèo xiên ${ten}`, url: duong }])]}
      />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        {ngay === homNay ? (
          <span className="text-ink">Kèo xiên</span>
        ) : (
          <>
            <Link href={withLang("/keo-xien", lang)} className={MANH}>Kèo xiên</Link>
            <span aria-hidden>›</span>
            <span className="text-ink first-letter:uppercase">{ten}</span>
          </>
        )}
      </nav>

      <nav aria-label="Kèo xiên theo ngày" className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {nutNgay.map((n) => (
          <Link
            key={n}
            href={withLang(duongDanXien(n, homNay), lang)}
            aria-current={n === ngay ? "page" : undefined}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-3.5 text-sm font-semibold ${n === ngay ? "border-brand bg-brand/10 text-ink" : "border-line text-muted hover:text-ink"}`}
          >
            <span className="first-letter:uppercase">{tenNgay(n, homNay)}</span>&nbsp;({ngayThang(n)})
          </Link>
        ))}
      </nav>

      <h1 className="mt-4 font-display text-[22px] font-bold leading-tight sm:text-[30px]">
        Kèo xiên bóng đá {ten}, {ngay === homNay || ngay === lechNgay(homNay, 1) ? `${thuVN(ngay)} ` : ""}{ngayThang(ngay)}
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {ds.length > 0
          ? `${ds.length} kèo xiên bóng đá ${ten} cho ${soGiai} giải: xiên đội thắng, tài xỉu 2.5 bàn, hai đội ghi bàn. Giờ Việt Nam, phong độ 5 trận gần nhất (mới nhất bên phải).`
          : `Chưa có kèo xiên bóng đá ${ten}: cần một giải có từ 2 trận chưa đá.`}
      </p>

      <h2 className="mt-4 font-display text-[17px] font-bold">Xiên theo chủ đề</h2>
      <NutChuDe hien={null} lang={lang} />

      <div className="mt-3 lg:columns-2 lg:gap-x-4">
        {ds.map((x) => (
          <KhoiXien
            key={x.khoa}
            id={x.khoa}
            xien={x.xien}
            giai={x.giai}
            loai={tenLoaiXien(x.loai, x.xien.chan)}
            moDau={`Trận đầu đá lúc ${x.xien.chan[0].h.gio} ${ten}`}
            lang={lang}
          />
        ))}
      </div>
      <Link href={withLang(duongDanNgay(ngay, homNay), lang)} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        Dự đoán tỷ số từng trận {ten} {ngayThang(ngay)} →
      </Link>

      <section className="mt-8">
        <h2 className={H2}>Kèo xiên là gì?</h2>
        <div className={DOAN}>
          <p>
            Kèo xiên bóng đá là gộp lựa chọn của nhiều trận vào một lần chọn: xiên 3 gồm 3 trận. Sai một trận là hỏng cả xiên.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className={H2}>Xiên đội thắng, xiên tài xỉu khác nhau thế nào?</h2>
        <div className={DOAN}>
          <p>
            Xiên đội thắng gộp các đội được dự đoán thắng, xiên tài xỉu gộp cửa trên hoặc dưới 2.5 bàn, xiên hai đội ghi bàn gộp cửa có hoặc không. Các cửa lấy từ{" "}
            <Link href={withLang("/du-doan", lang)} className="text-brand hover:underline">bảng dự đoán bóng đá hôm nay</Link>.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className={H2}>Nên chọn xiên mấy trận?</h2>
        <div className={DOAN}>
          <p>
            Càng nhiều trận, tỷ lệ gộp càng cao nhưng càng khó đúng hết: mỗi trận 70% khả năng đúng thì xiên 3 còn khoảng 34%, xiên 5 còn khoảng 17%.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className={H2}>Cách tính tỷ lệ kèo xiên</h2>
        <div className={DOAN}>
          <p>
            Tỷ lệ gộp bằng tích tỷ lệ từng trận.{" "}
            <ChuTy text={vd ? `Ví dụ xiên đầu tiên trên trang: ${vd.chan.map((c) => T(c.gia)).join(" × ")} = ${T(vd.tong)}.` : `Ví dụ ba trận có tỷ lệ ${T(1.3)}, ${T(1.5)} và ${T(1.6)} thì tỷ lệ gộp là ${T(1.3)} × ${T(1.5)} × ${T(1.6)} = ${T(3.12)}.`} />
          </p>
        </div>
        <p className="mt-4 text-xs text-muted">Tỷ lệ chỉ để tham khảo và có thể đổi trước giờ bóng lăn. Nội dung mang tính giải trí.</p>
      </section>
    </div>
  );
}
