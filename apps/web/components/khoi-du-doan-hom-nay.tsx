import Link from "next/link";
import { DongTran } from "@/components/dong-tran";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { formatOdds } from "@/lib/format";
import { getDict, withLang, type Lang } from "@/lib/i18n";
import type { Pick as PickRow, TrackRecord } from "@/lib/types";

const REC_WIN: Record<string, string> = { vi: "đúng", en: "won", th: "ชนะ", es: "acierto" };
const REC_LOSS: Record<string, string> = { vi: "sai", en: "lost", th: "แพ้", es: "fallo" };
const REC_PUSH: Record<string, string> = { vi: "hoà", en: "push", th: "เสมอ", es: "nulo" };

/** Số trận sắp đá hiện ở trang chủ; muốn xem hết thì sang /du-doan. */
const SO_TRAN = 8;

/** Dòng vàng mỏng: pick thật của Chú Tám hôm nay (không có thì bỏ trống) + thành tích thật từ sổ pick. */
function DongChuTam({ pick, record, lang }: { pick: PickRow | null; record: TrackRecord; lang: Lang }) {
  const t = getDict(lang).duDoan;
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[13px] sm:mt-3.5 sm:px-3.5 sm:text-sm">
      <b className="whitespace-nowrap text-xs uppercase tracking-wide text-amber-500">★ {t.pickTitle}</b>
      {/* Không có pick thì im, chỉ để thành tích (Peter 11/11: "hôm nay k chọn trận nào" hiện hoài). */}
      {pick && (
        <Link href={withLang("/daily-board", lang)} className="inline-flex min-h-11 items-center font-semibold hover:underline sm:min-h-0">
          {pick.home_team} vs {pick.away_team}: {pick.selection} @{formatOdds(pick.odds_publish)}
        </Link>
      )}
      {record.settled > 0 && (
        <span className="whitespace-nowrap font-semibold text-brand sm:ml-auto">
          {record.wins} {REC_WIN[lang] ?? REC_WIN.en} · {record.losses} {REC_LOSS[lang] ?? REC_LOSS.en} · {record.pushes} {REC_PUSH[lang] ?? REC_PUSH.en}
        </span>
      )}
      <Link href={withLang("/track-record", lang)} className="inline-flex min-h-11 items-center whitespace-nowrap text-brand hover:underline sm:min-h-0">
        {t.seeRecord} →
      </Link>
    </p>
  );
}

/**
 * Khối đầu trang chủ (mẫu Peter duyệt 10/11): h1, dòng Chú Tám chọn, 8 trận sắp đá
 * gom theo ngày, MỘT nút sang /du-doan. Bấm trận nào ra trang dự đoán trận đó.
 */
export function KhoiDuDoanHomNay({
  rows,
  homNay,
  lang,
  pick,
  record,
}: {
  rows: HangDuDoan[];
  /** Khoá ngày hôm nay theo giờ VN (YYYY-MM-DD). */
  homNay: string;
  lang: Lang;
  pick: PickRow | null;
  record: TrackRecord;
}) {
  const t = getDict(lang).duDoan;
  // Xếp theo ngày rồi giờ; trận chưa ghép được giờ ("--:--") đứng cuối ngày của nó.
  const sapDa = rows
    .filter((r) => r.sapDa)
    .sort((a, b) => a.ngay.localeCompare(b.ngay) || Number(a.gio === "--:--") - Number(b.gio === "--:--") || a.kickoffUtc.localeCompare(b.kickoffUtc))
    .slice(0, SO_TRAN);
  const ngays = [...new Set(sapDa.map((r) => r.ngay))];
  return (
    <section aria-label={t.title} className="pb-8 pt-4 sm:pt-6">
      <h1 className="font-display text-[21px] font-bold leading-tight sm:text-[28px]">{t.homeTitle}</h1>
      <p className="mt-1.5 hidden text-muted sm:block">{t.homeSub}</p>
      <DongChuTam pick={pick} record={record} lang={lang} />
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
