import Link from "next/link";
import { DongTran } from "@/components/dong-tran";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { getDict, withLang, type Lang } from "@/lib/i18n";

/** Số trận sắp đá hiện ở trang chủ; muốn xem hết thì sang /du-doan. */
const SO_TRAN = 8;

/**
 * Khối đầu trang chủ (mẫu Peter duyệt 10/11): h1, dòng Chú Tám chọn, 8 trận sắp đá
 * gom theo ngày, MỘT nút sang /du-doan. Bấm trận nào ra trang dự đoán trận đó.
 */
export function KhoiDuDoanHomNay({
  rows,
  homNay,
  lang,
}: {
  rows: HangDuDoan[];
  /** Khoá ngày hôm nay theo giờ VN (YYYY-MM-DD). */
  homNay: string;
  lang: Lang;
}) {
  const t = getDict(lang).duDoan;
  // Xếp theo ngày rồi giờ; trận chưa ghép được giờ ("--:--") đứng cuối ngày của nó.
  const sapDa = rows
    .filter((r) => r.sapDa)
    .sort((a, b) => a.ngay.localeCompare(b.ngay) || Number(a.gio === "--:--") - Number(b.gio === "--:--") || a.kickoffUtc.localeCompare(b.kickoffUtc))
    .slice(0, SO_TRAN);
  const ngays = [...new Set(sapDa.map((r) => r.ngay))];
  // Số thật cho đoạn giới thiệu (Peter 13/11: câu giới thiệu phải đủ cho SEO và GEO).
  const tatCa = rows.filter((r) => r.sapDa);
  const giai = [...new Set(tatCa.map((r) => r.giai))];
  return (
    <section aria-label={t.title} className="pb-8 pt-4 sm:pt-6">
      <h1 className="font-display text-[21px] font-bold leading-tight sm:text-[28px]">{t.homeTitle}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
        banhbong.net{" "}
        <Link href={withLang("/du-doan", lang)} className="text-brand hover:underline">dự đoán tỷ số bóng đá</Link> mỗi ngày theo giờ Việt Nam.
        {tatCa.length > 0 && ` Hiện có ${tatCa.length} trận sắp đá ở ${giai.length} giải, gồm ${giai.slice(0, 3).join(", ")}.`} Mỗi trận có tỷ số dự đoán
        và phong độ 5 trận gần nhất; tỷ số chốt trước giờ bóng lăn, đá xong ghi công khai đúng hay sai. Ngoài ra có{" "}
        <Link href={withLang("/keo-xien", lang)} className="text-brand hover:underline">kèo xiên hôm nay</Link>, lịch thi đấu và{" "}
        <Link href={withLang("/competitions", lang)} className="text-brand hover:underline">bảng xếp hạng</Link> từng giải.
      </p>
      <h2 className="mt-4 font-display text-lg font-bold sm:mt-5 sm:text-xl">{t.upcoming}</h2>
      {sapDa.length === 0 && <p className="border-b border-line py-6 text-sm text-muted">{t.empty}</p>}
      {ngays.map((n) => (
        <div key={n}>
          <h3 className="border-b border-line px-0.5 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted sm:pt-4 sm:text-[13px] lg:px-1.5">
            {n === homNay && `${t.today} · `}
            {thuVN(n)} {ngayThang(n)}
          </h3>
          <ul>
            {sapDa.filter((r) => r.ngay === n).map((h) => (
              <li key={h.slug}>
                <DongTran h={h} lang={lang} hienGiai />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Link
        href={withLang("/du-doan", lang)}
        className="mx-auto mt-4 flex min-h-11 w-full items-center justify-center rounded-lg border border-brand px-5 py-2.5 text-center font-semibold text-brand transition-colors hover:bg-brand-dim sm:w-max"
      >
        <span className="sm:hidden">{t.seeAllShort} →</span>
        <span className="hidden sm:inline">{t.seeAll} →</span>
      </Link>
    </section>
  );
}
