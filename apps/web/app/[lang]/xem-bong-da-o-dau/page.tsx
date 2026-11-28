import type { Metadata } from "next";
import Link from "next/link";
import { OG_VERSION } from "@/lib/brand";
import { getAllBlogSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs } from "@/lib/analysis-articles";
import { laBlogLichCaMua, laTrangLichCaMua } from "@/lib/chi-muc";
import { resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { KhoiLinkDuDoan } from "@/components/khoi-link-du-doan";

/**
 * Hub /xem-bong-da-o-dau (16/11/2026). GSC: nhóm "xem … ở đâu / lịch cả mùa / đá mấy giờ" là nhóm
 * DUY NHẤT từng ăn click, nhưng 8 bài kẹt "đã thu thập – chưa lập chỉ mục" và trang chủ chỉ trỏ
 * được vài bài. Trang này gom link tới MỌI bài trong nhóm (cùng bộ lọc với khối trang chủ
 * khoi-trang-tru.tsx), dựng phía server. Toàn bộ lấy từ dữ liệu, không ghi cứng đường dẫn bài.
 */

export const revalidate = 3600;

const DUONG = "/xem-bong-da-o-dau";
const TIEU_DE = "Xem bóng đá ở đâu: kênh chiếu & lịch thi đấu các giải 2026-27";
const MO_TA =
  "Gom đủ bài xem bóng đá ở đâu, lịch thi đấu cả mùa và giờ đá theo giờ Việt Nam của Ngoại hạng Anh, La Liga, Serie A, Bundesliga, Ligue 1, Cúp C1, V-League và các giải khác.";

type Bai = { slug: string; title: string };
type Muc = { href: string; ten: string; slug: string };
type Props = { params: Promise<{ lang: string }> };

/** Tên hiển thị cho khoá giải tách từ slug; khoá lạ thì tự viết hoa từ slug. */
const TEN_GIAI: Record<string, string> = {
  "ngoai-hang-anh": "Ngoại hạng Anh",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
  "cup-c1": "Cúp C1",
  "europa-league": "Europa League",
  "v-league": "V-League",
  mls: "MLS",
  "liga-mx": "Liga MX",
  "asian-cup": "Asian Cup",
};
const tenGiai = (k: string) =>
  TEN_GIAI[k] ?? k.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/** Khoá giải từ slug: "xem-la-liga-2026-27-o-dau-…" → "la-liga"; "la-liga-da-may-gio-…" → "la-liga". */
const khoaXem = (slug: string) => slug.match(/^xem-(.+?)-20\d\d/)?.[1] ?? null;
const khoaGio = (slug: string) => slug.match(/^(.+?)-da-may-gio-/)?.[1] ?? null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const canonical = withLang(DUONG, lang);
  const og = `/api/og/editorial?title=${encodeURIComponent("Xem bóng đá ở đâu")}&subtitle=${encodeURIComponent("Kênh chiếu & lịch thi đấu 2026-27")}&v=${OG_VERSION}`;
  return {
    title: TIEU_DE,
    description: MO_TA,
    alternates: { canonical },
    openGraph: {
      locale: "vi_VN",
      title: `${TIEU_DE} | banhbong.net`,
      description: MO_TA,
      url: canonical,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: `${TIEU_DE} | banhbong.net`, description: MO_TA },
  };
}

function DanhSach({ id, ten, muc, lang }: { id: string; ten: string; muc: Muc[]; lang: Lang }) {
  if (muc.length === 0) return null;
  return (
    <section aria-labelledby={id} className="pb-8">
      <h2 id={id} className="font-display text-xl font-bold">{ten}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {muc.map((m) => (
          <li key={m.href} className="flex gap-2.5">
            <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <Link href={withLang(m.href, lang)} prefetch={false} className="text-ink transition-colors hover:text-brand hover:underline">
              {m.ten}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function XemBongDaODau({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const [trangLich, blogs] = await Promise.all([
    getAllAnalysisArticleSlugs()
      .then((all) => all.filter((a) => laTrangLichCaMua(a.slug)))
      .catch(() => [] as Bai[]),
    getAllBlogSlugs()
      .then((all) => all.filter((b) => laBlogLichCaMua(b.slug)))
      .catch(() => [] as Bai[]),
  ]);

  const a = (b: Bai): Muc => ({ href: `/analysis/${b.slug}`, ten: b.title, slug: b.slug });
  const bl = (b: Bai): Muc => ({ href: `/blog/${b.slug}`, ten: b.title, slug: b.slug });
  // Cùng cách chia nhóm với khối trang chủ (components/khoi-trang-tru.tsx).
  const xem = [...trangLich.filter((b) => b.slug.startsWith("xem-")).map(a), ...blogs.filter((b) => b.slug.startsWith("xem-")).map(bl)];
  const lich = [
    ...blogs.filter((b) => !b.slug.startsWith("xem-")).map(bl),
    ...trangLich.filter((b) => b.slug.startsWith("lich-thi-dau-")).map(a),
  ];
  const gio = trangLich.filter((b) => b.slug.includes("-da-may-gio-")).map(a);

  // Bảng theo giải: chỉ dựng từ slug — giải nào có bài xem ở đâu / giờ đá thì có ô link.
  // 16/11: bỏ cột "Lịch cả mùa" — gần hết ô trống và bị cắt trên điện thoại; lịch đã có danh sách riêng bên dưới.
  const khoa = [...new Set([...xem.map((m) => khoaXem(m.slug)), ...gio.map((m) => khoaGio(m.slug))].filter((k): k is string => !!k))];
  const bang = khoa.map((k) => ({
    k,
    xem: xem.find((m) => khoaXem(m.slug) === k),
    gio: gio.find((m) => khoaGio(m.slug) === k),
  }));
  const o = (m: Muc | undefined, chu: string) =>
    m ? (
      <Link href={withLang(m.href, lang)} prefetch={false} className="text-brand hover:underline">{chu}</Link>
    ) : (
      <span className="text-muted">–</span>
    );

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Xem bóng đá ở đâu", url: DUONG }]} />
      <section className="py-12">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{TIEU_DE}</h1>
        <div className="mt-4 flex flex-col gap-3 text-ink">
          <p>
            Mỗi giải đấu ở Việt Nam do một đơn vị khác nhau giữ bản quyền phát sóng, và đơn vị đó có thể đổi
            sau mỗi mùa. Vì vậy trước mùa giải mới, câu hỏi hay gặp nhất vẫn là giải này xem trên kênh nào,
            ứng dụng nào.
          </p>
          <p>
            Trang này gom lại mọi bài của banhbong.net về chuyện đó: xem từng giải ở đâu, lịch thi đấu cả mùa
            của các giải và đội lớn, và giờ đá đã đổi sang giờ Việt Nam. Trận châu Âu đá buổi tối bên đó
            thường rơi vào khuya hoặc rạng sáng ở mình, nên nhìn đúng giờ Việt Nam sẽ đỡ lỡ trận.
          </p>
          <p>Danh sách tự cập nhật khi có bài mới. Bấm vào tên bài để xem chi tiết từng giải.</p>
        </div>
      </section>

      {bang.length > 0 && (
        <section aria-labelledby="theo-giai" className="pb-8">
          <h2 id="theo-giai" className="font-display text-xl font-bold">Tra nhanh theo giải</h2>
          <div className="mt-3 overflow-x-auto rounded-card border border-line">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Giải</th>
                  <th className="px-4 py-2 font-semibold">Xem ở đâu</th>
                  <th className="px-4 py-2 font-semibold">Giờ đá (giờ VN)</th>
                </tr>
              </thead>
              <tbody>
                {bang.map((r) => (
                  <tr key={r.k} className="border-t border-line">
                    <td className="px-4 py-2 font-semibold">{tenGiai(r.k)}</td>
                    <td className="px-4 py-2">{o(r.xem, `Xem ${tenGiai(r.k)} ở đâu`)}</td>
                    <td className="px-4 py-2">{o(r.gio, `${tenGiai(r.k)} đá mấy giờ`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DanhSach id="xem-o-dau" ten="Xem ở đâu" muc={xem} lang={lang} />
      <DanhSach id="lich-ca-mua" ten="Lịch thi đấu cả mùa" muc={lich} lang={lang} />
      <DanhSach id="da-may-gio" ten="Đá mấy giờ (giờ Việt Nam)" muc={gio} lang={lang} />

      {xem.length + lich.length + gio.length === 0 && (
        <p className="pb-10 text-muted">Chưa có bài nào. Ghé lại sau nhé.</p>
      )}

      <div className="pb-10">
        <KhoiLinkDuDoan chu={DUONG} lang={lang} />
      </div>
    </div>
  );
}
