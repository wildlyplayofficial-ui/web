import type { Metadata } from "next";
import { getOddsBoard, type OddsBoardMatch } from "@/lib/odds-data";
import { locales } from "@/lib/format";
import { resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { OddsBoardList } from "@/components/odds-board-list";

/**
 * Trang Kèo (Nick 23/8) — kèo Bet365 hiện tại + kèo đã chạy thế nào từ lúc mở
 * tới giờ, cộng xác suất thực sau khi bóc phần nhà cái giữ lại. CHỈ HIỂN THỊ
 * số liệu tham khảo — không nút đăng ký/khuyến mãi nhà cái, không dẫn link cá
 * cược (ranh giới đã chốt cùng Nick/Peter khi bật tính năng).
 *
 * v1.2 (Nick 24/8: "bắt buộc phải gọn cho tiện user") — mỗi trận là 1 dòng
 * gọn, bấm mới xoè chi tiết. Việc gộp ngày/render giữ ở server (page.tsx),
 * phần cần state (mở/đóng từng dòng) chuyển qua components/odds-board-list.tsx
 * ("use client") — tách để phần data-fetch vẫn chạy server, không kéo cả
 * trang thành client component.
 *
 * CHƯA làm (còn lại trong list Nick chốt): bộ lọc đội/giải/ngày.
 */

export const revalidate = 900;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const title = "Bảng Kèo Bóng Đá Hôm Nay — Kèo Mở, Kèo Hiện Tại, Xác Suất Thực";
  const description =
    "Kèo 1X2, kèo châu Á, tài xỉu các trận sắp đá — cập nhật mỗi 3 tiếng, kèm xác suất thực sau khi bóc phần nhà cái giữ lại. Chỉ để tham khảo.";
  return {
    title,
    description,
    alternates: { canonical: withLang("/keo", lang) },
    openGraph: {
      title: `${title} | banhbong.net`,
      description,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent("Bảng Kèo Bóng Đá")}&subtitle=${encodeURIComponent("Kèo mở · kèo hiện tại · xác suất thực")}`, width: 1200, height: 630 }],
    },
  };
}

interface DayGroup {
  dateKey: string;
  heading: string;
  matches: OddsBoardMatch[];
}

/** Nhóm theo NGÀY LỊCH THEO NGÔN NGỮ TRANG (vi → giờ VN, còn lại UTC) — cùng
 *  cách làm với groupByLocalDate trong league-fixtures.tsx, để một trận 23:30
 *  giờ VN không lọt sang nhóm ngày hôm sau theo UTC. */
function groupByDate(matches: OddsBoardMatch[], lang: Lang): DayGroup[] {
  const zone = lang === "vi" ? "Asia/Ho_Chi_Minh" : "UTC";
  const groups = new Map<string, OddsBoardMatch[]>();
  for (const m of matches) {
    const d = new Date(m.kickoffUtc);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayMatches]) => ({
      dateKey,
      heading: formatDateHeading(dateKey, lang),
      matches: dayMatches,
    }));
}

function formatDateHeading(dateKey: string, lang: Lang): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(locales[lang], {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export default async function OddsBoardPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const matches = await getOddsBoard();
  const days = groupByDate(matches, lang);

  return (
    <div className="mx-auto max-w-[900px] px-5 overflow-x-hidden">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Bảng Kèo", url: "/keo" }]} />
      <section className="pt-10 pb-6">
        <h1 className="font-display text-3xl font-bold">Bảng Kèo Bóng Đá</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Kèo 1X2, kèo châu Á, tài xỉu — cập nhật mỗi 3 tiếng. Bấm vào 1 trận để xem xác suất thực (đã bóc
          phần nhà cái giữ lại) và kèo đã chạy thế nào từ lúc mở tới giờ. Chỉ để tham khảo — banhbong.net
          không tổ chức cá cược.
        </p>
      </section>

      {matches.length === 0 ? (
        <div className="rounded-card border border-dashed border-brand/30 bg-brand-dim/20 px-5 py-10 text-center">
          <h2 className="font-display text-xl font-bold text-ink">Chưa có kèo trong 4 ngày tới</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Dữ liệu kèo cập nhật mỗi 3 tiếng — quay lại sau nhé.
          </p>
        </div>
      ) : (
        <OddsBoardList days={days} lang={lang} />
      )}
    </div>
  );
}
