"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getDict, resolveLang, withLang } from "@/lib/i18n";
import { trackTgFollowClick } from "@/lib/analytics";
import { WORDMARK_A, WORDMARK_B } from "@/lib/brand";
import { BrandMark } from "./brand-mark";

export function Footer() {
  const params = useParams<{ lang: string }>();
  const lang = resolveLang(params.lang);
  const dict = getDict(lang);

  const links: ReadonlyArray<{ href: string; label: string }> = [
    // Peter 11/11: bỏ Bảng Dự Đoán, Thành Tích, Minh Bạch, Học Hỏi; Blog + Giới Thiệu chỉ ở đây.
    { href: "/du-doan", label: dict.nav.predictions },
    { href: "/ket-qua", label: dict.nav.results },
    { href: "/matches", label: dict.nav.matches },
    { href: "/competitions", label: dict.nav.standings },
    { href: "/news", label: dict.nav.news },
    // Blog phải có mặt Ở ĐÂY chứ không chỉ trong menu thả xuống ở đầu trang: menu đó
    // nằm trong component client, không có trong HTML máy chủ trả về, nên Google
    // không thấy đường nào bò vào /blog. Đo 30/8: trang chủ có /learn, /guides,
    // /calculators (đều từ chân trang này) nhưng KHÔNG có /blog lần nào.
    { href: "/blog", label: dict.nav.blog },
    { href: "/analysis", label: dict.nav.analysis },
    { href: "/guides", label: dict.nav.guides },
    { href: "/calculators", label: dict.nav.calculators },
    { href: "/about", label: dict.nav.about },
    { href: "/responsible-play", label: dict.nav.responsiblePlay },
  ];

  return (
    <footer className="mt-16 border-t border-line py-12">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-5 text-center">
        <div>
          <span className="inline-flex items-center justify-center gap-2 font-display text-xl font-bold">
            <BrandMark size={22} />
            <span>
              <span className="text-ink">{WORDMARK_A}</span>
              <span className="text-brand">{WORDMARK_B}</span>
            </span>
          </span>
          <p className="mt-2 text-sm text-muted">{dict.footerDisclaimer}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={withLang(link.href, lang)}
              className="text-sm text-muted transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://t.me/banhbongnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-brand"
            onClick={trackTgFollowClick}
          >
            Telegram
          </a>
        </nav>
        <p className="text-xs text-muted">© 2026 banhbong.net. All rights reserved.</p>
        <p className="text-xs text-muted/60">Football data provided by the <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">Football-Data.org API</a></p>
      </div>
    </footer>
  );
}
