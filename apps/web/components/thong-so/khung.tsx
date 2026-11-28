import Link from "next/link";
import { duongHubGiai } from "@/lib/duong-hub-giai";
import type { ReactNode } from "react";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { LogoLoi } from "@/components/logo-loi";
import { LogoDoi } from "@/components/giai-hub/khoi";
import { KhoiLinkDuDoan } from "@/components/khoi-link-du-doan";
import { withLang, type Lang } from "@/lib/i18n";
import { ngayVi, type DoiXg, type GiaiXg } from "@/lib/xg-doi";

/** Khung chung /thong-so và /form: đường dẫn, H1, đoạn mở, chip giải, dòng nguồn. */

const MANH = "inline-flex min-h-11 items-center hover:text-ink";

export interface Buoc {
  ten: string;
  url: string;
}

export function KhungTrang({
  duong,
  h1,
  mo,
  lang,
  chip,
  nguon,
  capNhat,
  children,
}: {
  duong: Buoc[];
  h1: string;
  mo: ReactNode;
  lang: Lang;
  chip: ReactNode;
  nguon: string;
  capNhat: string;
  children: ReactNode;
}) {
  const ds = [{ ten: "Trang chủ", url: "/" }, ...duong];
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <LogoLoi />
      <BreadcrumbJsonLd items={ds.map((b) => ({ name: b.ten, url: b.url }))} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        {ds.map((b, i) =>
          i < ds.length - 1 ? (
            <span key={b.url} className="inline-flex items-center gap-x-1.5">
              <Link href={withLang(b.url, lang)} className={MANH}>{b.ten}</Link>
              <span aria-hidden>›</span>
            </span>
          ) : (
            <span key={b.url} className="text-ink">{b.ten}</span>
          ),
        )}
      </nav>
      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight sm:text-[30px]">{h1}</h1>
      <div className="mt-1.5 text-[15px] leading-relaxed">{mo}</div>
      <p className="mt-1.5 text-xs text-muted">
        Nguồn: {nguon} · cập nhật {ngayVi(capNhat)} · chỉ tính trận giải vô địch quốc gia.
      </p>
      <div className="mt-4">{chip}</div>
      <div className="mt-6 space-y-8">{children}</div>
      <KhoiLinkDuDoan chu={h1} lang={lang} />
    </div>
  );
}

/** Chip chọn giải — xuống dòng khi hết chỗ (không cuộn ngang trang), mỗi chip cao ≥44px. */
export function ChipGiai({ goc, giai, dang, lang }: { goc: string; giai: readonly GiaiXg[]; dang: string | null; lang: Lang }) {
  const ds = [{ slug: null as string | null, ten: "Tất cả giải" }, ...giai.map((g) => ({ slug: g.slug as string | null, ten: g.ten }))];
  return (
    <nav aria-label="Chọn giải">
      <ul className="flex flex-wrap gap-2">
        {ds.map((g) => {
          const on = g.slug === dang;
          // 16/11 gộp trang giải: chip giải trỏ thẳng về hub (/competitions/{slug} hoặc /thong-so/{giai}), không qua 301.
          const href = g.slug ? duongHubGiai(g.slug, `/thong-so/${g.slug}`) : goc;
          return (
            <li key={href}>
              <Link
                href={withLang(href, lang)}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${on ? "border-brand bg-brand-dim text-brand" : "border-line text-muted hover:bg-card hover:text-ink"}`}
              >
                {g.ten}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Ô đội: logo + tên (cắt chữ khi hẹp) + dòng phụ. */
export function ODoi({ d, phu }: { d: DoiXg; phu?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <LogoDoi ten={d.ten} du={{ [d.ten]: d.logo }} size={24} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold sm:text-[15px]">{d.ten}</p>
        {phu && <p className="truncate text-xs text-muted">{phu}</p>}
      </div>
    </div>
  );
}
