import Link from "next/link";
import { linkDuDoanCuoiBai } from "@/lib/link-du-doan";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * Khối cuối bài blog/phân tích (16/11/2026): dẫn người đọc và Google sang trang dự đoán.
 * Đo 16/11: 33/37 bài blog và 8/8 bài phân tích không có link nào tới /du-doan.
 */
// 20/11: gom link xem bóng đá (trang chính + 2 bài hướng dẫn) để dồn lực nội bộ về nhóm trang mạnh.
const LINK_XEM_BONG = [
  { href: "/xem-bong-da-o-dau", ten: "Xem bóng đá ở đâu" },
  { href: "/blog/xem-v-league-2026-27-o-dau-fpt-play", ten: "Xem V-League 2026/27 ở đâu" },
  { href: "/blog/xem-asian-cup-2027-o-dau-tv360", ten: "Xem Asian Cup 2027 ở đâu" },
];

export function KhoiLinkDuDoan({ chu, lang }: { chu: string; lang: Lang }) {
  const ds = linkDuDoanCuoiBai(chu);
  // Không tự trỏ về chính bài đang đọc (chu có chứa slug bài).
  const xem = LINK_XEM_BONG.filter((l) => !chu.includes(l.href.replace("/blog/", "")));
  return (
    <section aria-label="Dự đoán bóng đá theo giải" className="mt-10 rounded-card border border-line bg-card p-4 sm:p-5">
      <h2 className="font-display text-base font-bold sm:text-lg">Dự đoán tỷ số vòng tới</h2>
      <p className="mt-1 text-sm text-muted">
        Tỷ số dự đoán, phong độ 5 trận và Over/Under từng trận, giờ Việt Nam.{" "}
        <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">Xem tất cả dự đoán hôm nay</Link>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {ds.map((l, i) => (
          <li key={l.href}>
            <Link
              href={withLang(l.href, lang)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${i === 0 ? "border-brand/50 text-brand hover:bg-brand/10" : "border-line text-muted hover:text-brand"}`}
            >
              {l.ten}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold">Xem trực tiếp ở đâu</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {xem.map((l) => (
          <li key={l.href}>
            <Link
              href={withLang(l.href, lang)}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-3.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
            >
              {l.ten}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
