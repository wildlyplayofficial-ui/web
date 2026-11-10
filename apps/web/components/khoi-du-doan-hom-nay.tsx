import Link from "next/link";
import { DuDoanTheoNgay } from "@/components/du-doan-theo-ngay";
import { ODuDoanTran } from "@/components/o-du-doan-tran";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { formatOdds, formatUnits } from "@/lib/format";
import { getDict, withLang, type Lang } from "@/lib/i18n";
import type { Pick as PickRow, TrackRecord } from "@/lib/types";

/** Ô PICK vàng: pick thật đầu tiên của Chú Tám hôm nay + thành tích thật từ sổ pick. */
function OPick({ pick, record, lang }: { pick: PickRow | null; record: TrackRecord; lang: Lang }) {
  const dict = getDict(lang);
  const t = dict.duDoan;
  return (
    <div className="rounded-card border-2 border-amber-400/70 bg-amber-400/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-amber-500">★ {t.pickTitle}</p>
        {record.settled > 0 && (
          <p className="font-display text-xs font-semibold">
            {record.wins}-{record.losses}-{record.pushes}
            <span className={record.units_pl >= 0 ? " text-brand" : " text-loss"}> · {formatUnits(record.units_pl)}</span>
          </p>
        )}
      </div>
      {pick ? (
        <Link href={withLang("/daily-board", lang)} className="mt-1.5 block">
          <p className="text-xs text-muted">{pick.home_team} vs {pick.away_team}</p>
          <p className="font-display text-lg font-bold">
            {pick.selection} <span className="text-amber-500">@{formatOdds(pick.odds_publish)}</span>
          </p>
        </Link>
      ) : (
        <p className="mt-1.5 font-display text-sm font-semibold">{t.noPick}</p>
      )}
      <Link href={withLang("/track-record", lang)} className="mt-1 inline-block text-[11px] text-brand hover:underline">{t.seeRecord}</Link>
    </div>
  );
}

/**
 * Khối đầu trang chủ (mock4 Peter duyệt 10/11): pick Chú Tám, trận dự đoán nổi
 * bật, dự đoán theo ngày, nút sang /du-doan. Các khu cũ bên dưới giữ nguyên.
 */
export function KhoiDuDoanHomNay({
  rows,
  homNay,
  lang,
  pick,
  record,
}: {
  rows: HangDuDoan[];
  homNay: string;
  lang: Lang;
  pick: PickRow | null;
  record: TrackRecord;
}) {
  const t = getDict(lang).duDoan;
  // Trận nổi bật = trận chưa đá gần nhất (hôm nay trước), không có thì bỏ ô.
  const noiBat = rows.filter((r) => r.sapDa).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))[0] ?? null;
  return (
    <section aria-labelledby="du-doan-hom-nay" className="mt-5 space-y-4">
      <h2 id="du-doan-hom-nay" className="font-display text-2xl font-bold sm:text-3xl">{t.title}</h2>
      <OPick pick={pick} record={record} lang={lang} />
      {noiBat && <ODuDoanTran h={noiBat} lang={lang} lienKet />}
      <DuDoanTheoNgay rows={rows} homNay={homNay} lang={lang} locGiai={false} />
      <Link
        href={withLang("/du-doan", lang)}
        className="block rounded-card bg-brand px-5 py-3 text-center font-display text-sm font-bold text-bg transition-colors hover:bg-brand-hover"
      >
        {`${t.seeAll} →`}
      </Link>
    </section>
  );
}
