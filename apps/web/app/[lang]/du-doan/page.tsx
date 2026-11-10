import type { Metadata } from "next";
import Link from "next/link";
import { OG_VERSION, SITE_URL } from "@/lib/brand";
import { cauHoiDuDoan, faqSchema, jsonLd, metaDuDoan, suKienTran, type CauHoi } from "@/lib/du-doan-schema";
import { getMucDuDoan, type MucDuDoan } from "@/lib/du-doan";
import { buildAlternates, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { BangDungSai } from "@/components/bang-dung-sai";
import { OThanhTichDuDoan } from "@/components/o-thanh-tich-du-doan";
import { thanhTichDuDoan } from "@/lib/du-doan-cham";
import { DuDoanTheoNgay } from "@/components/du-doan-theo-ngay";
import { doiCanPhongDo, dungHang, ngayVN } from "@/lib/du-doan-hang";
import { getTranDaDa } from "@/lib/phong-do-db";
import { getTodaysPicks } from "@/lib/data";
import { getOddsBoard } from "@/lib/odds-data";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  // Ngày theo giờ VN (kiểu PredictZ "Tips Today - {ngày}"); trang revalidate 300s nên qua ngày tự đổi.
  const { tieuDe, moTa } = metaDuDoan(Date.now());
  return {
    title: tieuDe,
    description: moTa,
    alternates: buildAlternates("/du-doan", lang),
    openGraph: {
      locale: "vi_VN",
      title: `${tieuDe} | banhbong.net`,
      description: moTa,
      images: [{ url: `/api/og/editorial?title=D%E1%BB%B1%20%C4%91o%C3%A1n&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

/** Câu hỏi nhanh: hiện ra trang (FAQ schema phải khớp chữ người đọc thấy). */
function HoiNhanh({ ds }: { ds: CauHoi[] }) {
  return (
    <section aria-labelledby="hoi-nhanh" className="mt-12">
      <h2 id="hoi-nhanh" className="font-display text-2xl font-bold">Hỏi nhanh</h2>
      <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-card">
        {ds.map((c) => (
          <div key={c.hoi} className="px-4 py-3">
            <dt className="font-display text-sm font-bold">{c.hoi}</dt>
            <dd className="mt-1 text-sm text-muted">{c.dap}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const gioVN = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Gom theo giải, giữ thứ tự xuất hiện (sắp đá trước, rồi bài mới nhất). */
function theoGiai(muc: MucDuDoan[]): [string, MucDuDoan[]][] {
  const nhom = new Map<string, MucDuDoan[]>();
  for (const m of muc) {
    const giai = m.bai.league || "Giải khác";
    nhom.set(giai, [...(nhom.get(giai) ?? []), m]);
  }
  return [...nhom.entries()];
}

function DongBai({ m, lang }: { m: MucDuDoan; lang: Lang }) {
  return (
    <li>
      <Link
        href={withLang(`/analysis/${m.bai.slug}`, lang)}
        className="block rounded-card border border-line bg-card px-5 py-4 shadow-card transition-colors hover:bg-card-hover"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {m.sapDa && <span className="rounded-full bg-brand-dim px-2 py-0.5 font-semibold text-brand">Sắp đá</span>}
          {m.kickoffUtc && <span>{gioVN(m.kickoffUtc)}</span>}
          <span>{m.bai.byline}</span>
        </div>
        <p className="mt-1 font-display text-lg font-bold">{m.bai.title}</p>
        {m.chot && (
          <p className="mt-1 text-sm">
            Dự đoán: <span className="font-display font-bold">{m.chot.home_goals}-{m.chot.away_goals}</span>
          </p>
        )}
      </Link>
    </li>
  );
}

export default async function DuDoanHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const [muc, picks, odds] = await Promise.all([
    getMucDuDoan(),
    getTodaysPicks().catch(() => []),
    getOddsBoard().catch(() => []),
  ]);
  const curator = picks.filter((p) => (p.author ?? "curator") === "curator");
  const hang = dungHang(muc, curator, odds, await getTranDaDa(doiCanPhongDo(muc)));
  // Bài chưa khai trận (thiếu giờ đá) không xếp được vào tab ngày → giữ danh sách cũ.
  const nhom = theoGiai(muc.filter((m) => !m.duDoan || !m.kickoffUtc));
  const hoi = cauHoiDuDoan(muc, hang);
  // Mỗi trận một SportsEvent (60 trận gần nhất là đủ — như FixturesJsonLd).
  const suKien = hang.slice(0, 60).map((h) => suKienTran(h, SITE_URL));

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Dự đoán", url: "/du-doan" }]} />
      {suKien.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Dự đoán bóng đá",
              itemListElement: suKien.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
            }),
          }}
        />
      )}
      {hoi.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(hoi)) }} />}
      <h1 className="gradient-text font-display text-4xl font-bold">Dự đoán bóng đá hôm nay</h1>
      <p className="mt-2 text-sm text-muted">Tỷ số dự đoán từng trận, chấm đúng/sai sau trận.</p>
      <div className="mt-4">
        <OThanhTichDuDoan tong={thanhTichDuDoan(muc)} lang={lang} />
      </div>

      <div className="mt-6">
        <DuDoanTheoNgay rows={hang} homNay={ngayVN(Date.now())} lang={lang} hienTyLe />
      </div>

      {hang.length === 0 && nhom.length === 0 ? (
        <p className="mt-10 rounded-card border border-line bg-card px-6 py-8 text-center text-sm text-muted">
          Chưa có dự đoán.
        </p>
      ) : (
        nhom.map(([giai, ds]) => (
          <section key={giai} className="mt-10">
            <h2 className="font-display text-xl font-bold">{giai}</h2>
            <ul className="mt-4 space-y-3">
              {ds.map((m) => (
                <DongBai key={m.bai.slug} m={m} lang={lang} />
              ))}
            </ul>
          </section>
        ))
      )}

      <BangDungSai muc={muc} lang={lang} />

      {hoi.length > 0 && <HoiNhanh ds={hoi} />}

      <p className="mt-10 text-xs text-muted">
        Xem thêm{" "}
        <Link href={withLang("/analysis", lang)} className="text-brand hover:underline">mọi bài phân tích</Link>.
      </p>
    </div>
  );
}
