import Link from "next/link";
import { getDict, withLang, type Lang } from "@/lib/i18n";
import { xienTrongNgay, type Xien } from "@/lib/xien";
import type { HangDuDoan } from "@/lib/du-doan-hang";

/** Một xiên: mỗi chân là link sang trang trận, góc phải là tỷ lệ gộp. Dùng ở /du-doan và /du-doan/xien. */
export function KhoiXien({ xien, tieuDe, id, lang, cap: H = "h3", children }: { xien: Xien; tieuDe: string; id: string; lang: Lang; cap?: "h2" | "h3"; children?: React.ReactNode }) {
  const t = getDict(lang).duDoan;
  return (
    <section aria-labelledby={id} className="mt-3 rounded-card border border-brand/40 bg-brand/[.06] px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <H id={id} className="font-display text-[17px] font-bold leading-snug">{tieuDe}</H>
        <p className="shrink-0 text-[13px] text-muted">
          tỷ lệ gộp <span className="font-display text-base font-bold tabular-nums text-brand">{xien.tong.toFixed(2)}</span>
        </p>
      </div>
      <ul className="mt-1.5">
        {xien.chan.map(({ h, cua, gia }) => (
          <li key={h.slug} className="border-t border-line/60">
            <Link href={withLang(`/du-doan/${h.slug}`, lang)} className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-2.5 py-1.5 hover:bg-card-hover">
              <span className="text-sm font-semibold tabular-nums">{h.gio}</span>
              <span className="min-w-0">
                <span className="block text-sm">{h.nha} – {h.khach}</span>
                <span className="block truncate text-[13px] font-semibold text-brand">
                  {cua === "tai" ? "Tài 2.5 bàn" : cua === "xiu" ? "Xỉu 2.5 bàn" : cua === 1 ? t.draw : t.teamWins.replace("{team}", cua === 0 ? h.nha : h.khach)}
                </span>
              </span>
              <span className="rounded border border-brand px-2 py-0.5 text-[13px] font-bold tabular-nums text-brand">{gia.toFixed(2)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}

/** Khối xiên của ngày đang xem trên /du-doan, dẫn sang trang riêng; không đủ 3 chân thì không hiện. */
export function XienHomNay({ rows, tieuDe, lang }: { rows: readonly HangDuDoan[]; tieuDe: string; lang: Lang }) {
  const xien = xienTrongNgay(rows);
  if (!xien) return null;
  return (
    <KhoiXien xien={xien} tieuDe={tieuDe} id="xien" lang={lang} cap="h2">
      <p className="mt-1.5 text-xs text-muted">Sai một trận là hỏng cả xiên. Tỷ lệ chỉ để tham khảo và có thể đổi.</p>
      <Link href={withLang("/du-doan/xien", lang)} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        Xem mọi kèo xiên: xiên 3, xiên 5, tài xỉu →
      </Link>
    </KhoiXien>
  );
}
