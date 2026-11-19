import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OG_VERSION } from "@/lib/brand";
import { buildAlternates, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import type { DuLieuTrang } from "@/lib/lich-2027-kieu";
import { TRANG_LICH_2027 } from "@/lib/lich-2027-ds";
import { hinhLich2027 } from "@/lib/lich-2027-hinh";

const H2 = "font-display text-xl font-bold";
const DOAN = "mt-3 text-[15px] leading-relaxed text-ink";
const KHUNG_BANG = "mt-4 overflow-x-auto rounded-card border border-line bg-card shadow-card";
const LINK = "font-semibold text-brand hover:underline";

export function HinhLich({ duong, priority = true }: { duong: string; priority?: boolean }) {
  const h = hinhLich2027(duong);
  return (
    <Image
      src={`${h.src}?v=${OG_VERSION}`}
      alt={h.alt}
      width={h.width}
      height={h.height}
      priority={priority}
      unoptimized
      className="mt-5 h-auto w-full rounded-card border border-line"
    />
  );
}

export function metadataLich2027(d: DuLieuTrang, lang: Lang): Metadata {
  const h = hinhLich2027(d.duong);
  const og = `${h.src}?v=${OG_VERSION}`;
  return {
    title: d.h1,
    description: d.moTa,
    alternates: buildAlternates(d.duong, lang),
    robots: { index: true, follow: true },
    openGraph: {
      locale: "vi_VN",
      title: `${d.h1} | banhbong.net`,
      description: d.moTa,
      images: [{ url: og, width: h.width, height: h.height, alt: h.alt }],
    },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export async function TrangLich2027({ d, params }: { d: DuLieuTrang; params: Promise<{ lang: string }> }) {
  const lang = resolveLang((await params).lang);
  const khac = TRANG_LICH_2027.filter((t) => t.duong !== d.duong);

  return (
    <div className="mx-auto max-w-[800px] px-5 pb-14">
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: withLang("/", lang) },
          { name: d.h1.split(":")[0], url: withLang(d.duong, lang) },
        ]}
      />

      <header className="py-8">
        <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{d.h1}</h1>
        <p className="mt-2 text-sm text-muted">{`Cập nhật ${d.capNhat}`}</p>
        <p className={DOAN}>{d.moDau}</p>
        <HinhLich duong={d.duong} />
        <p className={DOAN}>
          {"Dự đoán các trận bóng đá hôm nay nằm ở "}
          {d.lienKetDuDoan.map((l, i) => (
            <span key={l.href}>
              {i > 0 ? " · " : ""}
              <Link href={withLang(l.href, lang)} className={LINK}>{l.ten}</Link>
            </span>
          ))}
          {"."}
        </p>
      </header>

      {d.khoi.map((k, i) => (
        <section key={k.id} aria-labelledby={k.id} className={i === 0 ? undefined : "mt-10"}>
          <h2 id={k.id} className={H2}>{k.tieuDe}</h2>
          {k.doan?.map((p) => <p key={p} className={DOAN}>{p}</p>)}
          {k.bang && (
            <div className={KHUNG_BANG}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    {k.bang.cot.map((c) => <th key={c} scope="col" className="px-3 py-2 font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {k.bang.hang.map((h) => (
                    <tr key={h[0]} className="border-b border-line last:border-0">
                      {h.map((o, j) =>
                        j === 0 ? (
                          <th key={o} scope="row" className="px-3 py-2.5 text-left font-semibold">{o}</th>
                        ) : (
                          <td key={`${h[0]}-${j}`} className="px-3 py-2.5">{o}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {k.danhSach && (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink">
              {k.danhSach.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
        </section>
      ))}

      <section aria-labelledby="hoi-dap" className="mt-10">
        <h2 id="hoi-dap" className={H2}>{`Câu hỏi thường gặp về ${d.h1.split(":")[0].toLowerCase()}`}</h2>
        <div className="mt-4 space-y-2">
          {d.hoiDap.map((c, i) => (
            <details key={c.hoi} open={i === 0} className="group rounded-card border border-line bg-card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15px] font-semibold">{c.hoi}</h3>
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="border-t border-line px-4 py-3 text-[15px] leading-relaxed text-ink">{c.dap}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="lich-khac" className="mt-10">
        <h2 id="lich-khac" className="font-display text-base font-bold">Lịch thi đấu bóng đá 2027 khác</h2>
        <ul className="mt-2 space-y-1 text-[15px]">
          {khac.map((t) => (
            <li key={t.duong}>
              <Link href={withLang(t.duong, lang)} className={LINK}>{t.ten}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nguon" className="mt-10">
        <h2 id="nguon" className="font-display text-base font-bold">Nguồn</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {d.nguon.map((n) => (
            <li key={n.url}>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand hover:underline">{n.ten}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
