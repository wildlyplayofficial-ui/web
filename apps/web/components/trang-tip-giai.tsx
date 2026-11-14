import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DongTipTran } from "@/components/trang-tip-ngay";
import { OG_VERSION } from "@/lib/brand";
import { ngayVN } from "@/lib/du-doan-hang";
import { GIAI_TRANG, giaiTuSlug } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { keoPhuTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { demTran, duongTipGiai, giaiCoTip, SO_NGAY, tipGiai, type NgayTip } from "@/lib/tip-giai";
import type { LoaiTip } from "@/lib/tip-ngay";

/**
 * Ba loại trang tip theo giải: /over-under/{giai}, /ca-2-doi-ghi-ban/{giai}, /ty-so/{giai}.
 * Mỗi trận một dòng (logo hai đội, giờ, tip + tỷ lệ), link sang /du-doan/{slug}. Không đúng/sai, không tên nhà cái.
 * Giải không có trận nào trong 10 ngày: trang vẫn mở nhưng noindex và không vào sitemap.
 */

const CH: Record<LoaiTip, { ten: string; tieuDe: (g: string) => string; mota: (g: string, n: number) => string; moDau: string }> = {
  "tai-xiu": {
    ten: "Over/Under",
    tieuDe: (g) => `Over/Under 2.5 ${g}`,
    mota: (g, n) => `Over/Under 2.5 ${g} 10 ngày tới: ${n} trận có dự đoán Over hoặc Under 2.5, kèm tỷ lệ và số trận Over trong 5 trận gần nhất của từng đội. Giờ Việt Nam.`,
    moDau: "Mốc 2.5 bàn: tổng bàn thắng của cả hai đội từ 3 trở lên là Over, từ 2 trở xuống là Under.",
  },
  "hai-doi-ghi-ban": {
    ten: "Cả 2 đội ghi bàn",
    tieuDe: (g) => `Cả 2 đội ghi bàn ${g}`,
    mota: (g, n) => `Cả 2 đội ghi bàn ${g} 10 ngày tới: ${n} trận có dự đoán Có hoặc Không, kèm tỷ lệ và số trận cả hai đội cùng ghi bàn trong 5 trận gần nhất. Giờ Việt Nam.`,
    moDau: "Mỗi đội ghi ít nhất một bàn trong 90 phút là Có; một đội trắng bàn là Không.",
  },
  "ty-so": {
    ten: "Tỷ số",
    tieuDe: (g) => `Tỷ số dự đoán ${g}`,
    mota: (g, n) => `Tỷ số dự đoán ${g} 10 ngày tới: ${n} trận, mỗi trận một tỷ số chính xác kèm tỷ lệ. Giờ Việt Nam, bấm trận để xem phong độ và số liệu chi tiết.`,
    moDau: "Tỷ số chính xác là cửa khó nhất nên tỷ lệ thường cao; mỗi trận trang chỉ nêu một tỷ số.",
  },
};

export const LOAI_GIAI = Object.keys(CH) as LoaiTip[];

async function nap(loai: LoaiTip, slug: string) {
  const g = giaiTuSlug(slug);
  if (!g) return null;
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  return { g, homNay, ngay: tipGiai(hang, g, loai, homNay, keoPhuTuan, Date.now()) };
}

export async function metaTipGiai(loai: LoaiTip, slug: string, lang: Lang): Promise<Metadata> {
  const r = await nap(loai, slug);
  if (!r) return {};
  const so = demTran(r.ngay);
  const title = `${CH[loai].tieuDe(r.g.ten)}${so > 0 ? `: dự đoán ${so} trận` : ""}`;
  const description = CH[loai].mota(r.g.ten, so);
  return {
    title,
    description,
    alternates: buildAlternates(duongTipGiai(loai, r.g), lang),
    ...(so === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      locale: "vi_VN",
      title: `${title} | banhbong.net`,
      description,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(CH[loai].tieuDe(r.g.ten))}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";
const H2 = "border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]";
const CHIP = "inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink";

function Khoi({ ngay, loai, lang, homNay }: { ngay: NgayTip; loai: LoaiTip; lang: Lang; homNay: string }) {
  const nhan = ngay.ngay === homNay ? "Hôm nay" : thuVN(ngay.ngay);
  return (
    <section className="mt-5">
      <h2 className={`${H2} flex items-baseline gap-2`}>
        {nhan} {ngayThang(ngay.ngay)}
        <span className="text-[13px] font-normal text-muted">{ngay.ds.length} trận</span>
      </h2>
      <ul>
        {ngay.ds.map((d) => (
          <li key={d.h.slug}><DongTipTran d={d} loai={loai} lang={lang} /></li>
        ))}
      </ul>
    </section>
  );
}

export async function TrangTipGiai({ loai, slug, lang }: { loai: LoaiTip; slug: string; lang: Lang }) {
  const r = await nap(loai, slug);
  if (!r) notFound();
  const { g, homNay, ngay } = r;
  const so = demTran(ngay);
  const c = CH[loai];
  const khac = LOAI_GIAI.filter((l) => l !== loai);

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: g.ten, url: `/du-doan/${g.slug}` }, { name: c.tieuDe(g.ten), url: duongTipGiai(loai, g) }]} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <Link href={withLang(`/du-doan/${g.slug}`, lang)} className={MANH}>{g.ten}</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">{c.ten}</span>
      </nav>

      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight sm:text-[30px]">{c.tieuDe(g.ten)}, {SO_NGAY} ngày tới</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {so > 0
          ? `${so} trận ${g.ten} trong ${SO_NGAY} ngày tới, giờ Việt Nam. ${c.moDau}`
          : `${g.ten} chưa có trận nào có tip ${c.ten.toLowerCase()} trong ${SO_NGAY} ngày tới. Bạn có thể xem lịch và dự đoán đầy đủ của giải ở trang giải.`}
      </p>

      <nav aria-label={`Tip khác của ${g.ten}`} className="mt-3 flex flex-wrap gap-2">
        {khac.map((l) => (
          <Link key={l} href={withLang(duongTipGiai(l, g), lang)} className={CHIP}>{CH[l].tieuDe(g.ten)}</Link>
        ))}
        <Link href={withLang(`/du-doan/${g.slug}`, lang)} className={CHIP}>Dự đoán {g.ten}</Link>
        {g.bxh && <Link href={withLang(`/competitions/${g.bxh}`, lang)} className={CHIP}>Bảng xếp hạng {g.ten}</Link>}
      </nav>

      {ngay.map((n) => (
        <Khoi key={n.ngay} ngay={n} loai={loai} lang={lang} homNay={homNay} />
      ))}

      <p className="mt-6 text-xs text-muted">Tỷ lệ chỉ để tham khảo và có thể đổi trước giờ bóng lăn. Nội dung mang tính giải trí.</p>
    </div>
  );
}


/** Khối liên kết ở trang giải /competitions/{slug}: các tip 10 ngày tới của giải đó (chỉ loại có trận; không có gì thì ẩn cả khối). */
export async function KhoiTipGiai({ bxh, lang }: { bxh: string; lang: Lang }) {
  const g = GIAI_TRANG.find((x) => x.bxh === bxh);
  if (!g) return null;
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan().catch(() => ({ hang: [] }));
  const co = giaiCoTip(hang, homNay, keoPhuTuan, undefined, Date.now()).filter((x) => x.giai.slug === g.slug);
  if (co.length === 0) return null;
  return (
    <section className="mt-8" aria-labelledby="tip-giai">
      <h2 id="tip-giai" className="font-display text-lg font-bold">Dự đoán {g.ten} {SO_NGAY} ngày tới</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={withLang(`/du-doan/${g.slug}`, lang)} className={CHIP}>Dự đoán {g.ten} vòng tới</Link>
        {co.map((x) => (
          <Link key={x.loai} href={withLang(duongTipGiai(x.loai, g), lang)} className={CHIP}>
            {CH[x.loai].tieuDe(g.ten)} ({x.soTran} trận)
          </Link>
        ))}
      </div>
    </section>
  );
}
