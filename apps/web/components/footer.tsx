"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getDict, resolveLang, withLang } from "@/lib/i18n";
import { trackTgFollowClick } from "@/lib/analytics";
import { WORDMARK_A, WORDMARK_B } from "@/lib/brand";
import { BrandMark } from "./brand-mark";
import { DoiDinhDang } from "./doi-dinh-dang";

type FooterLink = { href: string; label: string };

export function Footer() {
  const params = useParams<{ lang: string }>();
  const lang = resolveLang(params.lang);
  const dict = getDict(lang);

  // 14/11/2026 Peter: "không gỡ mà nên gom, để index toàn trang" — chân trang chia
  // nhóm, dẫn tới mọi mục công khai. Đây là đường link nội bộ duy nhất có trong HTML
  // máy chủ trả về (menu thả xuống ở đầu trang là client) nên Google bò theo đường này
  // (đo 30/8: /blog chỉ được thấy khi có ở chân trang). Peter 11/11 đã bỏ Bảng Dự Đoán,
  // Thành Tích, Minh Bạch, Học Hỏi khỏi chân trang — giữ nguyên. Hub đội ghi tay (khớp
  // TEAM_HUBS trong lib/teams.ts) để không kéo bảng logo vào bundle client.
  const groups: ReadonlyArray<{ title: string; links: ReadonlyArray<FooterLink> }> = [
    {
      title: "Dự đoán & kèo",
      links: [
        { href: "/du-doan", label: dict.nav.predictions },
        { href: "/keo-xien", label: dict.nav.parlay },
        { href: "/tai-xiu-hom-nay", label: "Tài xỉu hôm nay" },
        { href: "/ca-2-doi-ghi-ban-hom-nay", label: "Cả 2 đội ghi bàn" },
        { href: "/ty-so-hom-nay", label: "Tỷ số hôm nay" },
        { href: "/tai-xiu-ngay-mai", label: "Tài xỉu ngày mai" },
        { href: "/ca-2-doi-ghi-ban-ngay-mai", label: "Cả 2 đội ghi bàn ngày mai" },
        { href: "/ty-so-ngay-mai", label: "Tỷ số ngày mai" },
        { href: "/chuoi-dang-chu-y", label: "Chuỗi đáng chú ý" },
        { href: "/doi-phong-do-tot-nhat", label: "Đội phong độ tốt nhất" },
        { href: "/ket-qua", label: dict.nav.results },
        { href: "/matches", label: dict.nav.matches },
      ],
    },
    {
      title: "Bài viết",
      links: [
        { href: "/news", label: dict.nav.news },
        { href: "/analysis", label: dict.nav.analysis },
        { href: "/blog", label: dict.nav.blog },
        { href: "/guides", label: dict.nav.guides },
      ],
    },
    {
      title: "Giải & đội",
      links: [
        { href: "/competitions", label: dict.nav.standings },
        { href: "/doi/man-united", label: "Manchester United" },
        { href: "/doi/arsenal", label: "Arsenal" },
        { href: "/doi/chelsea", label: "Chelsea" },
        { href: "/doi/man-city", label: "Manchester City" },
        { href: "/doi/vietnam", label: "Việt Nam" },
      ],
    },
    {
      title: "Công cụ & dữ liệu",
      links: [
        { href: "/calculators", label: dict.nav.calculators },
        { href: "/stats", label: dict.nav.stats },
        { href: "/archive", label: dict.nav.archive },
      ],
    },
    {
      title: "Về banhbong",
      links: [
        { href: "/about", label: dict.nav.about },
        { href: "/tac-gia/pete-nguyen", label: "Tác giả" },
        { href: "/responsible-play", label: dict.nav.responsiblePlay },
      ],
    },
  ];

  const linkClass = "text-sm text-muted transition-colors hover:text-brand";

  return (
    <footer className="mt-16 border-t border-line py-12">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5">
        <div className="text-center">
          <span className="inline-flex items-center justify-center gap-2 font-display text-xl font-bold">
            <BrandMark size={22} />
            <span>
              <span className="text-ink">{WORDMARK_A}</span>
              <span className="text-brand">{WORDMARK_B}</span>
            </span>
          </span>
          <p className="mt-2 text-sm text-muted">{dict.footerDisclaimer}</p>
        </div>
        <div className="flex justify-center">
          <DoiDinhDang />
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink">{g.title}</p>
              <ul className="flex flex-col gap-2">
                {g.links.map((link) => (
                  <li key={link.href}>
                    <Link href={withLang(link.href, lang)} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                {g.title === "Về banhbong" && (
                  <li>
                    <a
                      href="https://t.me/banhbongnet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                      onClick={trackTgFollowClick}
                    >
                      Telegram
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
        <div className="text-center">
          <p className="text-xs text-muted">© 2026 banhbong.net. All rights reserved.</p>
          <p className="mt-2 text-xs text-muted/60">Football data provided by the <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">Football-Data.org API</a></p>
        </div>
      </div>
    </footer>
  );
}
