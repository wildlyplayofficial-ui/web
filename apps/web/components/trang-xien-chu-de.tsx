import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { KhoiXien } from "@/components/xien-hom-nay";
import { OG_VERSION } from "@/lib/brand";
import { lechNgay, tenNgay } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { keoPhuTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { CHU_DE, tenXienChuDe, xienChuDeTheoNgay, type MoTaChuDe, type XienChuDeNgay } from "@/lib/xien-chu-de";
import { ChuTy } from "@/components/ty-le";
import { T } from "@/lib/ty-le";
import { NOINDEX_FOLLOW } from "@/lib/chi-muc";

/**
 * Kèo xiên theo chủ đề /keo-xien/{xien-over-2-5 | xien-under-2-5 | xien-hai-doi-ghi-ban | xien-doi-nha-thang |
 * xien-cua-tren-an-toan} (Peter duyệt 14/11). Mỗi ngày trong 7 ngày tới một xiên, gom từ mọi giải.
 * Không nút đặt cược, không tên nhà cái.
 */

export const duongDanChuDe = (c: MoTaChuDe) => `/keo-xien/${c.slug}`;

export async function xienChuDeTuan(c: MoTaChuDe, homNay: string): Promise<XienChuDeNgay[]> {
  const { hang } = await taiDuDoan();
  const ngays = Array.from({ length: 7 }, (_, i) => lechNgay(homNay, i));
  return xienChuDeTheoNgay(c.khoa, hang, ngays, keoPhuTuan);
}

export function metaChuDe(c: MoTaChuDe, lang: Lang): Metadata {
  const title = `${c.tuKhoa[0].toUpperCase()}${c.tuKhoa.slice(1)} hôm nay và cả tuần`;
  const description = `${c.tuKhoa[0].toUpperCase()}${c.tuKhoa.slice(1)} trong 7 ngày tới theo giờ Việt Nam: mỗi ngày một xiên gom từ mọi giải, kèm logo hai đội, tỷ lệ từng trận và tỷ lệ gộp.`;
  return {
    title,
    description,
    alternates: buildAlternates(duongDanChuDe(c), lang),
    // 14/11 gọn sitemap (Peter chốt): trang khuôn, thôi mời Google — noindex,follow, rút khỏi sitemap.
    robots: NOINDEX_FOLLOW,
    openGraph: {
      locale: "vi_VN",
      title: `${title} | banhbong.net`,
      description,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(c.tuKhoa[0].toUpperCase() + c.tuKhoa.slice(1))}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";
const H2 = "border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]";

/** Hàng nút chuyển chủ đề, dùng chung với trang /keo-xien. `hien` = slug đang xem (null = trang tổng). */
export function NutChuDe({ hien, lang }: { hien: string | null; lang: Lang }) {
  return (
    <nav aria-label="Kèo xiên theo chủ đề" className="mt-3 flex flex-wrap gap-2">
      {CHU_DE.map((c) => (
        <Link
          key={c.slug}
          href={withLang(duongDanChuDe(c), lang)}
          aria-current={c.slug === hien ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-lg border px-3.5 text-sm font-semibold ${c.slug === hien ? "border-brand bg-brand/10 text-ink" : "border-line text-muted hover:text-ink"}`}
        >
          {c.nut}
        </Link>
      ))}
    </nav>
  );
}

export function TrangXienChuDe({ c, homNay, ds, lang }: { c: MoTaChuDe; homNay: string; ds: XienChuDeNgay[]; lang: Lang }) {
  const hoa = c.tuKhoa[0].toUpperCase() + c.tuKhoa.slice(1);
  const vd = ds[0]?.xien;
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Kèo xiên", url: "/keo-xien" }, { name: hoa, url: duongDanChuDe(c) }]} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/keo-xien", lang)} className={MANH}>Kèo xiên</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">{c.nut}</span>
      </nav>

      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight sm:text-[30px]">{hoa} hôm nay và cả tuần</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {ds.length > 0
          ? `${ds.length} ${c.tuKhoa} trong 7 ngày tới, mỗi ngày một xiên gom từ mọi giải. Giờ Việt Nam, phong độ 5 trận gần nhất (mới nhất bên phải).`
          : `Chưa có ${c.tuKhoa} nào: cần ít nhất 2 trận chưa đá cùng ngày đủ điều kiện của chủ đề này.`}
      </p>
      <NutChuDe hien={c.slug} lang={lang} />

      <div className="mt-3 lg:columns-2 lg:gap-x-4">
        {ds.map(({ ngay, xien }) => (
          <KhoiXien
            key={ngay}
            id={`${c.khoa}-${ngay}`}
            xien={xien}
            giai={`Mọi giải · ${tenNgay(ngay, homNay)}`}
            loai={tenXienChuDe(c.khoa, xien.chan.length)}
            moDau={`Trận đầu đá lúc ${xien.chan[0].h.gio}`}
            lang={lang}
          />
        ))}
      </div>
      <Link href={withLang("/keo-xien", lang)} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        Kèo xiên theo giải, hôm nay →
      </Link>

      <section className="mt-8">
        <h2 className={H2}>Chọn chân xiên thế nào?</h2>
        <p className="mt-3 text-[15px] leading-relaxed">
          {c.cachChon} Các cửa lấy từ{" "}
          <Link href={withLang("/du-doan", lang)} className="text-brand hover:underline">bảng dự đoán bóng đá hôm nay</Link>
          , không thêm dự đoán nào khác.
        </p>
      </section>

      <section className="mt-8">
        <h2 className={H2}>Cách tính tỷ lệ</h2>
        <p className="mt-3 text-[15px] leading-relaxed">
          Tỷ lệ gộp bằng tích tỷ lệ từng trận.{" "}
          {<ChuTy text={vd ? `Ví dụ xiên đầu tiên trên trang: ${vd.chan.map((c) => T(c.gia)).join(" × ")} = ${T(vd.tong)}.` : `Ví dụ ba trận có tỷ lệ ${T(1.3)}, ${T(1.5)} và ${T(1.6)} thì tỷ lệ gộp là ${T(1.3)} × ${T(1.5)} × ${T(1.6)} = ${T(3.12)}.`} />}{" "}
          Sai một trận là hỏng cả xiên, nên xiên càng nhiều chân càng khó đúng hết.
        </p>
        <p className="mt-4 text-xs text-muted">Tỷ lệ chỉ để tham khảo và có thể đổi trước giờ bóng lăn. Nội dung mang tính giải trí.</p>
      </section>
    </div>
  );
}
