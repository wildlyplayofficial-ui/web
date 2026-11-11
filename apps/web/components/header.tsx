"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import { WORDMARK_A, WORDMARK_B } from "@/lib/brand";

interface NavCompetition {
  name: string;
  href: string;
  logo_url?: string;
}

type NavLink = { name: string; href: string; logo_url?: string };
/** A dropdown row: a link, or a visual divider between groups. */
type NavItem = NavLink | { divider: true };
/** A top-level nav cluster: either a single link or a dropdown of items. */
type NavCluster =
  | { label: string; href: string; moi?: boolean }
  | { label: string; items: NavItem[]; accent?: boolean };

const LANG_PREFIX_RE = /^\/(vi|th|es)(\/|$)/;

/** Strip any existing lang prefix from a pathname. */
function stripLangPrefix(pathname: string): string {
  return pathname.replace(LANG_PREFIX_RE, "/");
}

// LocaleSwitch ĐÃ XOÁ 10/9/2026.
// Từ 16/8 nó luôn `return null` (site chỉ còn tiếng Việt) nên không vẽ ra gì cả —
// nhưng nó gọi useSearchParams() TRƯỚC dòng return, mà hook thì không đặt sau
// điều kiện được. Next thấy useSearchParams trong trang prerender tĩnh là ném cả
// cụm Suspense gần nhất sang client. Cụm đó chính là <HeaderWithData> ở
// app/[lang]/layout.tsx:77 → TOÀN BỘ HEADER biến mất khỏi HTML máy chủ.
// Đo 10/9 trước khi xoá: trang chủ và /competitions/premier-league đều có
// <template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING">, đếm <header> = 0.
// Một thành phần chết làm cả bộ điều hướng của site không vào được HTML.

/** Khung viền xanh quanh tab đang mở (Peter 11/11: "làm có khung này… đang ở tab nào"). Mục khác giữ viền trong suốt để chữ không nhảy. */
const KHUNG = "rounded-md border px-2.5 py-1 text-sm font-medium transition-colors";
const KHUNG_ON = "border-brand text-ink";
const KHUNG_OFF = "border-transparent text-muted hover:text-ink";

/**
 * A nav cluster rendered as a dropdown of links. Inline list on mobile
 * (the nav is already an expanded column); absolute card menu on desktop.
 */
function NavDropdown({
  label,
  active,
  items,
  lang,
  onNavigate,
  accent = false,
}: {
  label: string;
  active: boolean;
  items: NavItem[];
  lang: Lang;
  onNavigate: () => void;
  /** Mục nhấn màu brand cả khi không active — dùng cho "Dự Đoán Hôm Nay". */
  accent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          accent
            ? "flex items-center gap-1 whitespace-nowrap rounded-full border border-brand/40 bg-brand-dim px-3 py-1 text-sm font-semibold text-brand transition-colors hover:border-brand"
            : `flex items-center gap-1 whitespace-nowrap ${KHUNG} ${active ? KHUNG_ON : KHUNG_OFF}`
        }
      >
        {label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="mt-2 flex flex-col gap-3 pl-3 xl:absolute xl:left-0 xl:z-20 xl:w-56 xl:gap-0 xl:rounded-card xl:border xl:border-line xl:bg-card xl:py-1 xl:pl-0 xl:shadow-card"
        >
          {items.map((it, i) =>
            "divider" in it ? (
              <li
                key={`divider-${i}`}
                role="separator"
                aria-hidden="true"
                className="border-t border-line xl:my-1"
              />
            ) : (
              <li key={it.href} role="none">
                <Link
                  role="menuitem"
                  href={withLang(it.href, lang)}
                  onClick={() => {
                    setOpen(false);
                    onNavigate();
                  }}
                  className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink xl:px-4 xl:py-2 xl:hover:bg-card-hover"
                >
                  {it.logo_url && (
                    <img
                      src={it.logo_url}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-4 flex-shrink-0 object-contain"
                    />
                  )}
                  {it.name}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </li>
  );
}

export function Header({ competitions = [] }: { competitions?: NavCompetition[] }) {
  const pathname = usePathname();
  const params = useParams<{ lang: string }>();
  const lang = resolveLang(params.lang);
  const dict = getDict(lang);
  const [open, setOpen] = useState(false);

  // Strip lang prefix for route matching
  const barePath = stripLangPrefix(pathname);
  const isActive = (href: string) => (href === "/" ? barePath === "/" : barePath.startsWith(href));

  const nav = dict.nav;
  const clusters: NavCluster[] = [
    // Peter 11/11: menu trên chỉ 4 mục; Blog, Phân Tích, Giới Thiệu xuống chân trang.
    // Bỏ Chú Tám chọn, Thành Tích, Kèo (trang vẫn sống, chỉ gỡ khỏi menu).
    { label: nav.predictions, href: "/du-doan", moi: true },
    { label: nav.results, href: "/ket-qua" },
    {
      label: nav.matches,
      items: [
        { name: nav.allMatches, href: "/matches", logo_url: "/icons/icon-192x192.png" },
        ...(competitions.length > 0 ? [{ divider: true } as const] : []),
        ...competitions,
      ],
    },
    { label: nav.news, href: "/news" },
  ];


  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-8 px-5">
        <Link href={withLang("/", lang)} className="flex items-center gap-2 font-display text-2xl font-bold">
          <BrandMark size={28} />
          <span>
            <span className="text-ink">{WORDMARK_A}</span>
            <span className="text-brand">{WORDMARK_B}</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] xl:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="h-0.5 w-6 rounded bg-ink" />
          <span className="h-0.5 w-6 rounded bg-ink" />
          <span className="h-0.5 w-6 rounded bg-ink" />
        </button>

        <nav
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-16 flex-col gap-4 border-b border-line bg-bg p-6 xl:static xl:flex xl:flex-row xl:items-center xl:gap-6 xl:border-0 xl:p-0`}
        >
          <ul className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-1">
            {clusters.map((cluster) => {
              if ("href" in cluster) {
                return (
                  <li key={cluster.href}>
                    <Link
                      href={withLang(cluster.href, lang)}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(cluster.href) ? "page" : undefined}
                      className={`inline-block whitespace-nowrap ${KHUNG} ${isActive(cluster.href) ? KHUNG_ON : KHUNG_OFF}`}
                    >
                      {cluster.label}
                      {cluster.moi && (
                        <span className="ml-1.5 rounded bg-brand px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase text-bg">
                          {nav.newTag}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              }
              const active = cluster.items.some((it) => "href" in it && isActive(it.href));
              return (
                <NavDropdown
                  key={cluster.label}
                  label={cluster.label}
                  active={active}
                  items={cluster.items}
                  lang={lang}
                  onNavigate={() => setOpen(false)}
                  accent={"accent" in cluster && cluster.accent}
                />
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle onToggle={() => setOpen(false)} />
          </div>
        </nav>
      </div>
    </header>
  );
}
