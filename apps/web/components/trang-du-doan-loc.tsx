import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DoiLogo } from "@/components/doi-logo";
import { DongTran } from "@/components/dong-tran";
import { DuDoanPZ } from "@/components/du-doan-pz";
import { ChuThichPhongDo, DauCotKeo } from "@/components/phong-do-dong";
import { OG_VERSION, SITE_URL } from "@/lib/brand";
import { giaiTuSlug, metaGiai, metaNgay, ngayTuSlug, duongDanNgay, tranCuaGiai, type GiaiTrang } from "@/lib/du-doan-loc";
import { ngayVN, type HangDuDoan } from "@/lib/du-doan-hang";
import { jsonLd, suKienTran } from "@/lib/du-doan-schema";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { getCompetitionFixtures, getStandingsCompetitions } from "@/lib/standings-extra";
import { teamBadge } from "@/lib/team-badges";

/**
 * Trang dự đoán theo NGÀY (/du-doan/ngay-mai, /du-doan/thu-bay…) và theo GIẢI (/du-doan/ngoai-hang-anh…),
 * Peter 11/11/2026. Dùng chung route /du-doan/[slug] với trang trận; slug do lib/du-doan-loc.ts phân giải.
 */

const og = (tieuDe: string) => ({ url: `/api/og/editorial?title=${encodeURIComponent(tieuDe)}&v=${OG_VERSION}`, width: 1200, height: 630 });

/** Metadata trang ngày/giải; slug không phải ngày hay giải → null (để trang trận xử lý). */
export async function metaLoc(slug: string, lang: Lang): Promise<Metadata | null> {
  const homNay = ngayVN(Date.now());
  const ngay = ngayTuSlug(slug, homNay);
  const giai = giaiTuSlug(slug);
  if (!ngay && !giai) return null;
  const { tieuDe, moTa } = ngay ? metaNgay(ngay, homNay) : metaGiai(giai!);
  // Thứ trùng ngày mai (vd hôm nay thứ Sáu, /du-doan/thu-bay) → canonical về /du-doan/ngay-mai, khỏi hai bản.
  const duong = ngay ? duongDanNgay(ngay, homNay) : `/du-doan/${slug}`;
  // Ngày chưa có trận nào → noindex (trang rỗng); trang giải luôn có lịch vòng tới nên luôn index.
  const rong = ngay ? !(await taiDuDoan()).hang.some((h) => h.ngay === ngay) : false;
  return {
    title: tieuDe,
    description: moTa,
    alternates: buildAlternates(duong, lang),
    ...(rong ? { robots: { index: false, follow: true } } : {}),
    openGraph: { locale: "vi_VN", title: `${tieuDe} | banhbong.net`, description: moTa, images: [og(tieuDe)] },
  };
}

function DanhSachSuKien({ ds, ten }: { ds: HangDuDoan[]; ten: string }) {
  if (ds.length === 0) return null;
  const items = ds.slice(0, 60).map((h, i) => ({ "@type": "ListItem", position: i + 1, item: suKienTran(h, SITE_URL, true) }));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "ItemList", name: ten, itemListElement: items }) }}
    />
  );
}

/** Giờ Livescore (UTC) → khoá ngày + giờ VN. */
function gioVN(date: string, time: string, tamTinh?: boolean): { ngay: string; gio: string } {
  // Trận chỉ có lịch tĩnh (provisional) giờ chưa chốt → chỉ giữ ngày.
  const coGio = !tamTinh && /^\d{2}:\d{2}/.test(time);
  if (!coGio) return { ngay: date, gio: "--:--" };
  const iso = new Date(Date.parse(`${date}T${time.slice(0, 5)}:00Z`) + 7 * 3_600_000).toISOString();
  return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
}

/** Giải nghỉ (FIFA Days…): lịch vòng tới từ Livescore, chưa có dự đoán. */
async function LichVongToi({ g, homNay }: { g: GiaiTrang; homNay: string }) {
  const comp = g.bxh ? (await getStandingsCompetitions().catch(() => [])).find((c) => c.slug === g.bxh) : null;
  const ngays = comp ? await getCompetitionFixtures(comp.livescoreId).catch(() => []) : [];
  const sap = ngays
    .flatMap((d) => d.matches.filter((m) => !m.finished).map((m) => ({ ...m, ...gioVN(m.date || d.date, m.time, m.provisional) })))
    .filter((m) => m.ngay >= homNay)
    .sort((a, b) => (a.ngay + a.gio).localeCompare(b.ngay + b.gio));
  // Vòng tới ≈ các trận trong 4 ngày kể từ trận sắp đá đầu tiên.
  const dau = sap[0]?.ngay;
  const vong = dau ? sap.filter((m) => Date.parse(m.ngay) - Date.parse(dau) <= 3 * 86_400_000) : [];
  return (
    <section className="mt-4 rounded-card border border-line bg-card p-4">
      <p className="text-[15px]">
        {dau
          ? `${g.ten} chưa có trận trong mấy ngày tới. Vòng tới bắt đầu ${thuVN(dau)} ${ngayThang(dau)}; dự đoán từng trận lên trước giờ bóng lăn.`
          : `${g.ten} chưa có trận trong mấy ngày tới; dự đoán lên trước giờ bóng lăn.`}
      </p>
      {vong.length > 0 && (
        <ul className="mt-3 divide-y divide-line/60">
          {vong.map((m) => (
            <li key={m.id} className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-3 py-2 text-sm">
              <span className="tabular-nums text-muted">{thuVN(m.ngay).replace("Thứ ", "T").replace("Chủ Nhật", "CN")} {ngayThang(m.ngay)}{m.gio === "--:--" ? "" : ` · ${m.gio}`}</span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex min-w-0 items-center gap-1.5"><DoiLogo src={teamBadge(m.homeName)} ten={m.homeName} size={20} /><span className="truncate font-semibold">{m.homeName}</span></span>
                <span className="text-muted">vs</span>
                <span className="flex min-w-0 items-center gap-1.5"><DoiLogo src={teamBadge(m.awayName)} ten={m.awayName} size={20} /><span className="truncate font-semibold">{m.awayName}</span></span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";

async function TrangGiai({ g, lang }: { g: GiaiTrang; lang: Lang }) {
  const homNay = ngayVN(Date.now());
  const ds = tranCuaGiai((await taiDuDoan()).hang, g, homNay);
  const theoNgay = [...new Set(ds.map((h) => h.ngay))].map((n) => [n, ds.filter((h) => h.ngay === n)] as const);
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: g.ten, url: `/du-doan/${g.slug}` }]} />
      <DanhSachSuKien ds={ds} ten={`Dự đoán ${g.ten}`} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">{g.ten}</span>
      </nav>
      <h1 className="font-display text-[22px] font-bold leading-tight sm:text-[30px]">Dự đoán {g.ten}</h1>
      <p className="mt-1.5 text-[13px] text-muted sm:text-[15px]">
        {ds.length > 0 ? `${ds.length} trận sắp đá · ` : ""}giờ Việt Nam · tỷ số chốt trước giờ bóng lăn
        {g.bxh && (
          <>
            {" · "}
            <Link href={withLang(`/competitions/${g.bxh}`, lang)} className="text-brand hover:underline">BXH {g.ten}</Link>
          </>
        )}
      </p>
      {ds.length === 0 ? (
        <LichVongToi g={g} homNay={homNay} />
      ) : (
        <>
          <div className="pt-2.5"><ChuThichPhongDo /></div>
          {theoNgay.map(([n, tran]) => (
            <section key={n}>
              <h2 className="border-b border-line pb-2 pt-[18px] font-display text-[17px] font-bold">
                <Link href={withLang(duongDanNgay(n, homNay), lang)} className="hover:text-brand">{thuVN(n)} {ngayThang(n)}</Link>
              </h2>
              <DauCotKeo />
              <ul>
                {tran.map((h) => (
                  <li key={h.slug}><DongTran h={h} lang={lang} phongDo /></li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <Link href={withLang("/du-doan", lang)} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        Dự đoán mọi giải hôm nay →
      </Link>
    </div>
  );
}

async function TrangNgay({ ngay, lang }: { ngay: string; lang: Lang }) {
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  const trongNgay = hang.filter((h) => h.ngay === ngay);
  const ten = duongDanNgay(ngay, homNay).endsWith("ngay-mai") ? "Ngày mai" : `${thuVN(ngay)} ${ngayThang(ngay)}`;
  return (
    <div className="mx-auto max-w-[1100px] px-0 py-4 sm:px-5 sm:py-8">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: ten, url: duongDanNgay(ngay, homNay) }]} />
      <DanhSachSuKien ds={trongNgay} ten={`Dự đoán bóng đá ${ten}`} />
      <DuDoanPZ rows={hang} homNay={homNay} ngayChon={ngay} lang={lang} />
    </div>
  );
}

/** Trang ngày hoặc giải cho slug; slug không phải hai loại này → null. */
export function TrangLoc({ slug, lang }: { slug: string; lang: Lang }) {
  const ngay = ngayTuSlug(slug, ngayVN(Date.now()));
  if (ngay) return <TrangNgay ngay={ngay} lang={lang} />;
  const g = giaiTuSlug(slug);
  return g ? <TrangGiai g={g} lang={lang} /> : null;
}
