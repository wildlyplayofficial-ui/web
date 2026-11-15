/* eslint-disable @next/next/no-img-element -- ảnh bài từ kho ảnh ngoài, cùng kiểu AnalysisCard */
import Link from "next/link";
import { OG_VERSION } from "@/lib/brand";
import { withLang, type Lang } from "@/lib/i18n";
import type { AnalysisArticle } from "@/lib/types";

const ngay = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric" }).format(new Date(iso));

/** Bài mới nhất của giải (thật, từ analysis_articles) + trang trụ (lịch cả mùa, xem ở đâu). */
export function BaiMoi({ bai, trangTru, lang }: { bai: AnalysisArticle[]; trangTru: AnalysisArticle[]; lang: Lang }) {
  return (
    <div>
      {bai.length > 0 && (
        <ul className="space-y-2.5">
          {bai.map((a) => (
            <li key={a.slug}>
              <Link
                href={withLang(`/analysis/${a.slug}`, lang)}
                prefetch={false}
                className="grid min-h-[72px] grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-card border border-line bg-card transition-colors hover:bg-card-hover"
              >
                <img
                  src={a.thumb_image ?? a.hero_image ?? `/api/og/analysis/${a.slug}?locale=${lang}&v=${OG_VERSION}`}
                  alt={a.title}
                  width={96}
                  height={72}
                  loading="lazy"
                  className={`h-full w-24 bg-card-hover ${a.thumb_image ? "object-cover" : "object-contain"}`}
                />
                <span className="min-w-0 px-3 py-2.5">
                  <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{a.title}</span>
                  <span className="mt-1 block text-[13px] text-muted">{ngay(a.published_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {trangTru.length > 0 && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {trangTru.map((a) => (
            <li key={a.slug}>
              <Link href={withLang(`/analysis/${a.slug}`, lang)} prefetch={false} className="flex min-h-12 items-center px-3 py-2 text-[15px] font-semibold hover:text-brand">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
