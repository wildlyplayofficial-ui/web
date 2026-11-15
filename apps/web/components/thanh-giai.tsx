import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";

/** Thanh thứ hai của header (Peter duyệt mẫu 15/11): ngày + 5 giải lớn, mọi trang đều thấy. */
const MUC: { nhan: string; href: string }[] = [
  { nhan: "Hôm nay", href: "/du-doan" },
  { nhan: "Ngày mai", href: "/du-doan/ngay-mai" },
  { nhan: "Ngoại hạng Anh", href: "/competitions/premier-league" },
  { nhan: "La Liga", href: "/competitions/la-liga" },
  { nhan: "Serie A", href: "/competitions/serie-a" },
  { nhan: "Bundesliga", href: "/competitions/bundesliga" },
  { nhan: "Ligue 1", href: "/competitions/ligue-1" },
];

export function ThanhGiai({ lang, barePath }: { lang: Lang; barePath: string }) {
  const dang = (href: string) => barePath === href || (href.startsWith("/competitions/") && barePath.startsWith(`${href}/`));
  return (
    <nav aria-label="Giải đấu" className="border-b border-line bg-card">
      <ul className="mx-auto flex max-w-[1240px] gap-2 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] sm:px-5">
        {MUC.map((m) => {
          const on = dang(m.href);
          return (
            <li key={m.href} className="shrink-0">
              <Link
                href={withLang(m.href, lang)}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-brand-dim text-brand ring-1 ring-inset ring-brand" : "text-muted hover:bg-card hover:text-ink"}`}
              >
                {m.nhan}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
