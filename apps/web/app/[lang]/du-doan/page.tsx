import type { Metadata } from "next";
import Link from "next/link";
import { OG_VERSION, SITE_URL } from "@/lib/brand";
import { cauHoiDuDoan, faqSchema, jsonLd, metaDuDoan, suKienTran, type CauHoi } from "@/lib/du-doan-schema";
import { getBaiDuDoan } from "@/lib/du-doan";
import { getBlogs } from "@/lib/data";
import { cacTranChon } from "@/lib/chon-tran";
import { ChonTran } from "@/components/chon-tran";
import { buildAlternates, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { PostListItem } from "@/lib/types";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DuDoanPZ } from "@/components/du-doan-pz";
import { ngayVN, type HangDuDoan } from "@/lib/du-doan-hang";
import { tranDuocIndex } from "@/lib/chi-muc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { capNhatDuDoan, chuCapNhat } from "@/lib/du-doan-cap-nhat";
import { tongQuanDuDoan, type TongQuan } from "@/lib/du-doan-tong-quan";
import { duongTran } from "@/lib/du-doan-tran";
import { CAU_HINH, LOAI_TIP } from "@/components/trang-tip-ngay";

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

/** 18/11 (soi chỉ mục): đoạn mở + bảng theo giải, toàn số đếm từ bảng trận đang có. Sát đầu trang. */
function TongQuanHub({ tq }: { tq: TongQuan }) {
  return (
    <section aria-labelledby="tong-quan" className="mt-10 text-[15px] leading-relaxed">
      <h2 id="tong-quan" className="font-display text-xl font-bold">Tổng quan các trận sắp đá</h2>
      <p className="mt-2">{tq.mo}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Số trận dự đoán theo giải</caption>
          <thead className="text-muted">
            <tr><th className="py-1.5 pr-3 font-semibold">Giải</th><th className="py-1.5 pr-3 font-semibold">Số trận</th><th className="py-1.5 font-semibold">Ngày đá</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tq.bang.slice(0, 12).map((g) => (
              <tr key={g.giai}>
                <td className="py-1.5 pr-3">{g.giai}</td>
                <td className="py-1.5 pr-3 tabular-nums">{g.so}</td>
                <td className="py-1.5 tabular-nums">{g.tu === g.den ? g.tu : `${g.tu} - ${g.den}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tq.bang.length > 12 && <p className="mt-2 text-sm text-muted">Và {tq.bang.length - 12} giải khác, xem đủ trong bảng trận phía trên.</p>}
    </section>
  );
}

/**
 * 16/11 (soi chỉ mục): hub chỉ dẫn sang trang trận noindex/nofollow, còn ô "Chọn trận khác" trỏ
 * /analysis/… (308). Thêm link thẳng tới bài nhận định /du-doan/nhan-dinh-… được index:
 * trận sắp đá trước (gần nhất trước), rồi trận đã đá (mới nhất trước), tối đa 8.
 */
function NhanDinhChiTiet({ hang, lang, daDa = false }: { hang: HangDuDoan[]; lang: Lang; daDa?: boolean }) {
  // 17/11: trận đã đá (ngày trước hôm nay) xuống dưới bảng — nằm trên đầu đẩy bảng trận xuống trên điện thoại.
  const homNay = ngayVN(Date.now());
  const bai = hang.filter((h) => h.coBai && h.slug.startsWith("nhan-dinh-") && tranDuocIndex(h));
  const ds = (
    daDa
      ? bai.filter((h) => h.ngay < homNay).sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc))
      : bai.filter((h) => h.ngay >= homNay).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))
  ).slice(0, 8);
  if (ds.length === 0) return null;
  const id = daDa ? "nhan-dinh-da-da" : "nhan-dinh-chi-tiet";
  return (
    <section aria-labelledby={id} className="mt-3">
      <h2 id={id} className="font-display text-xl font-bold">{daDa ? "Nhận định trận đã đá" : "Nhận định chi tiết"}</h2>
      <ul className="mt-2 space-y-1">
        {ds.map((h) => (
          <li key={h.slug}>
            <Link href={withLang(`/du-doan/${h.slug}`, lang)} className="inline-flex min-h-11 items-center text-brand hover:underline">
              Nhận định {h.nha} vs {h.khach}, {h.gio} ngày {h.ngay.slice(5).split("-").reverse().join("/")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 15/11 (soi chỉ mục): Google bò /du-doan 11/11 rồi bỏ, không lập chỉ mục — trang gần như chỉ là
 * bảng trận đổi mỗi ngày. Thêm một đoạn giới thiệu cố định + link sang vài bài blog mới nhất.
 */
function GioiThieu({ blogs, lang }: { blogs: PostListItem[]; lang: Lang }) {
  return (
    <section aria-labelledby="ve-du-doan" className="mt-10 px-2.5 text-[15px] leading-relaxed">
      <h2 id="ve-du-doan" className="font-display text-2xl font-bold">Dự đoán bóng đá trên banhbong</h2>
      <p className="mt-3">
        Trang dự đoán của banhbong gom các trận sắp đá trong ngày và ngày mai, từ Ngoại hạng Anh, La Liga, Serie A,
        Bundesliga, Ligue 1, Cúp C1 tới các trận đội tuyển quốc gia. Mỗi trận có tỷ số dự đoán, phong độ 5 trận gần
        nhất của hai đội và giờ đá theo giờ Việt Nam. Bảng được cập nhật mỗi ngày, trước giờ bóng lăn.
      </p>
      <p className="mt-3">
        Cách đọc nhanh: cột 1·X·2 cho biết khả năng đội nhà thắng (1), hòa (X) hay đội khách thắng (2). BTTS là cả hai
        đội cùng ghi bàn: &ldquo;Có&rdquo; nghĩa là hai bên đều dự kiến có bàn, &ldquo;Không&rdquo; là ít nhất một đội không ghi được.
        Over/Under 2.5 nói về tổng số bàn cả trận: Over là từ 3 bàn trở lên, Under là 2 bàn trở xuống.
      </p>
      <p className="mt-3">
        Dự đoán chỉ là nhận định dựa trên số liệu và phong độ, bóng đá luôn có bất ngờ. Bấm vào từng trận để xem
        đội hình, lực lượng, đối đầu và bài nhận định chi tiết nếu có. Muốn đọc thêm về lịch thi đấu, bảng xếp hạng và
        câu chuyện quanh các trận lớn, xem các bài blog mới nhất bên dưới.
      </p>
      {blogs.length > 0 && (
        <ul className="mt-3 space-y-1">
          {blogs.map((b) => (
            <li key={b.slug}>
              <Link href={withLang(`/blog/${b.slug}`, lang)} className="inline-flex min-h-11 items-center text-brand hover:underline">{b.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function DuDoanHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const [{ hang }, baiChon, tatCaBlog] = await Promise.all([taiDuDoan(), getBaiDuDoan(), getBlogs(lang)]);
  // 17/11: blog đã có trang trận thì bỏ (/blog/{slug} 301) — trận đó đã có link thẳng ở mục nhận định chi tiết.
  const blogs = tatCaBlog.filter((b) => !duongTran(hang, b.slug));
  const tq = tongQuanDuDoan(hang, ngayVN(Date.now()));
  const hoi = [...cauHoiDuDoan(hang), ...(tq?.faq ?? [])];
  // Mỗi trận một SportsEvent (60 trận gần nhất là đủ — như FixturesJsonLd), url = trang riêng của trận.
  const capNhat = capNhatDuDoan(hang, Date.now());
  const suKien = hang.slice(0, 60).map((h) => suKienTran(h, SITE_URL, true));

  return (
    <div className="mx-auto max-w-[1100px] px-0 py-4 sm:px-5 sm:py-8">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }]} />
      {suKien.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Dự đoán bóng đá",
              ...(capNhat ? { dateModified: new Date(capNhat).toISOString() } : {}),
              itemListElement: suKien.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
            }),
          }}
        />
      )}
      {hoi.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(hoi)) }} />}
      <DuDoanPZ
        rows={hang}
        homNay={ngayVN(Date.now())}
        lang={lang}
        sauMoDau={
          <>
            {capNhat && (
              <p className="mt-1 text-[13px] text-muted">
                Cập nhật: <time dateTime={new Date(capNhat).toISOString()}>{chuCapNhat(capNhat)}</time>
              </p>
            )}
            <NhanDinhChiTiet hang={hang} lang={lang} />
          </>
        }
      />
      <nav aria-label="Dự đoán theo loại kèo" className="mt-6 flex flex-wrap gap-2 px-3.5 sm:px-2.5">
        {LOAI_TIP.map((l) => (
          <Link key={l} href={withLang(CAU_HINH[l].duong, lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
            {CAU_HINH[l].tieuDe}
          </Link>
        ))}
        <Link href={withLang("/chuoi-dang-chu-y", lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
          Chuỗi đáng chú ý
        </Link>
      </nav>
      <div className="mt-6 px-2.5">
        <ChonTran nhom={cacTranChon(baiChon, Date.now())} lang={lang} />
      </div>

      <div className="px-2.5">
        <NhanDinhChiTiet hang={hang} lang={lang} daDa />
      </div>
      {/* 18/11: tổng quan để DƯỚI bảng trận — nằm trên đầu đẩy bảng trận xuống quá xa trên điện thoại. */}
      {tq && <div className="px-2.5"><TongQuanHub tq={tq} /></div>}
      <GioiThieu blogs={blogs.slice(0, 4)} lang={lang} />

      {/* Peter 11/11: bỏ danh sách bài Chú Tám Banh theo giải khỏi trang dự đoán. */}
      <div className="px-2.5">
        {hoi.length > 0 && <HoiNhanh ds={hoi} />}
      </div>

      <p className="mt-10 px-2.5 text-xs text-muted">
        Xem thêm{" "}
        <Link href={withLang("/analysis", lang)} className="text-brand hover:underline">mọi bài phân tích</Link>.
      </p>
    </div>
  );
}
