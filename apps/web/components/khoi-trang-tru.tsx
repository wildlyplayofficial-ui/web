import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import { localizedCompetitionName } from "@/lib/competition-logos";
import { laBlogLichCaMua } from "@/lib/chi-muc";

/**
 * Khối "trang trụ" cuối trang chủ (9/11/2026). Trang chủ là trang DUY NHẤT Google
 * còn giữ chỉ mục (đo GSC 9/11: 37/37 bài /blog Google chưa từng biết, trang chủ
 * 0 link sang /blog). Khối này đưa thẳng link thường (<a href>, dựng phía server)
 * tới nhóm trang lâu năm: lịch cả mùa / xem ở đâu / đá mấy giờ (analysis + blog),
 * trang bảng xếp hạng từng giải, và bài blog mới — để Google bò tiếp từ trang chủ.
 * Toàn bộ lấy từ dữ liệu, không ghi cứng đường dẫn bài.
 */

type Bai = { slug: string; title: string };
type Giai = { slug: string; name: string };
type Muc = { href: string; ten: string };

const SO_BLOG_MOI = 5;

export function KhoiTrangTru({
  lang,
  trangLich,
  blogs,
  giai,
}: {
  lang: Lang;
  /** Bài analysis lịch/xem ở đâu cả mùa (đã lọc laTrangLichCaMua). */
  trangLich: Bai[];
  /** Mọi bài blog đã đăng, mới nhất trước. */
  blogs: Bai[];
  /** Giải đang mở trang bảng xếp hạng. */
  giai: Giai[];
}) {
  const a = (b: Bai): Muc => ({ href: `/analysis/${b.slug}`, ten: b.title });
  const bl = (b: Bai): Muc => ({ href: `/blog/${b.slug}`, ten: b.title });
  const blogLich = blogs.filter((b) => laBlogLichCaMua(b.slug));
  const blogKhac = blogs.filter((b) => !laBlogLichCaMua(b.slug)).slice(0, SO_BLOG_MOI);

  const nhom: { ten: string; muc: Muc[]; tatCa?: Muc }[] = [
    {
      ten: "Xem ở đâu",
      muc: [
        ...trangLich.filter((b) => b.slug.startsWith("xem-")).map(a),
        ...blogLich.filter((b) => b.slug.startsWith("xem-")).map(bl),
      ],
    },
    {
      ten: "Lịch thi đấu cả mùa",
      muc: [
        ...blogLich.filter((b) => !b.slug.startsWith("xem-")).map(bl),
        ...trangLich.filter((b) => b.slug.startsWith("lich-thi-dau-")).map(a),
      ],
    },
    { ten: "Đá mấy giờ (giờ Việt Nam)", muc: trangLich.filter((b) => b.slug.includes("-da-may-gio-")).map(a) },
    {
      ten: "Bảng xếp hạng",
      muc: giai.map((g) => ({
        href: `/competitions/${g.slug}`,
        ten: `BXH ${localizedCompetitionName(g.slug, g.name, lang)}`,
      })),
      tatCa: { href: "/competitions", ten: "Tất cả giải đấu" },
    },
    { ten: "Blog bóng đá", muc: blogKhac.map(bl), tatCa: { href: "/blog", ten: "Tất cả bài blog" } },
  ].filter((n) => n.muc.length > 0);

  if (nhom.length === 0) return null;

  return (
    <section className="pb-10" aria-labelledby="lich-xem-o-dau">
      <h2 id="lich-xem-o-dau" className="mb-4 font-display text-xl font-bold">
        Lịch thi đấu &amp; xem bóng đá ở đâu
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {nhom.map((n) => (
          <div key={n.ten} className="rounded-card border border-line bg-card p-5">
            <h3 className="font-display text-base font-bold">{n.ten}</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {n.muc.map((m) => (
                <li key={m.href}>
                  <Link
                    href={withLang(m.href, lang)}
                    prefetch={false}
                    className="text-ink transition-colors hover:text-brand hover:underline"
                  >
                    {m.ten}
                  </Link>
                </li>
              ))}
            </ul>
            {n.tatCa && (
              <Link
                href={withLang(n.tatCa.href, lang)}
                prefetch={false}
                className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
              >
                {n.tatCa.ten} &rarr;
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
