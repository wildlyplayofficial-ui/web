"use client";

import Link from "next/link";
import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";
import { OPhongDo, OTySoDuDoan } from "@/components/phong-do";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { getDict, withLang, type Lang } from "@/lib/i18n";

/** Cộng/trừ ngày trên khoá YYYY-MM-DD (tính ở UTC để khỏi lệch múi giờ máy). */
const lechNgay = (khoa: string, n: number) =>
  new Date(Date.parse(`${khoa}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const thuNgay = (khoa: string) => {
  const p = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" })
    .formatToParts(new Date(`${khoa}T00:00:00Z`));
  const lay = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${lay("weekday")} ${lay("day")}/${lay("month")}`;
};

function Chip({ chon, onClick, children }: { chon: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chon}
      className={`shrink-0 rounded-full border px-3 py-1.5 font-display text-xs font-semibold transition-colors ${
        chon ? "border-brand bg-brand text-bg" : "border-line bg-card text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Dong({ h, lang, hienTyLe }: { h: HangDuDoan; lang: Lang; hienTyLe: boolean }) {
  const t = getDict(lang).duDoan;
  const doi: [string, string | null, HangDuDoan["formNha"]][] = [
    [h.nha, h.logoNha, h.formNha],
    [h.khach, h.logoKhach, h.formKhach],
  ];
  return (
    <li>
      <Link href={withLang(`/analysis/${h.slug}`, lang)} className="block px-4 py-3 transition-colors hover:bg-card-hover">
        <span className="flex items-center gap-3">
          <span className="w-11 shrink-0 font-display text-sm font-semibold tabular-nums text-muted">{h.gio}</span>
          <span className="min-w-0 flex-1 space-y-1.5">
            {doi.map(([ten, logo, form]) => (
              <span key={ten} className="flex items-center gap-2">
                <DoiLogo src={logo} ten={ten} size={20} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{ten}</span>
                  <OPhongDo kq={form} nhan={t.form} />
                </span>
              </span>
            ))}
            {hienTyLe && h.mot && (
              <span className="block text-[11px] tabular-nums text-muted">
                1 {h.mot[0].toFixed(2)} · X {h.mot[1].toFixed(2)} · 2 {h.mot[2].toFixed(2)}
              </span>
            )}
          </span>
          {h.pick && (
            <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 font-display text-[10px] font-bold text-black">PICK</span>
          )}
          <span className="flex shrink-0 flex-col items-center gap-1">
            <OTySoDuDoan du={h.du} chu={{ home: t.homeShort, draw: t.draw, away: t.awayShort }} className="min-w-[84px] text-sm" />
            {h.dung !== null && (
              <span className={`text-[11px] font-bold ${h.dung ? "text-brand" : "text-loss"}`}>
                {h.dung ? `✓ ${t.correct}` : `✗ ${t.wrong}`}
                {h.that && <span className="font-normal text-muted"> {h.that[0]}-{h.that[1]}</span>}
              </span>
            )}
          </span>
        </span>
        {hienTyLe && (
          <span className="mx-auto mt-2.5 block w-max rounded-md border border-line px-4 py-1 font-display text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t.preview}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * Dự đoán theo ngày (tab Hôm qua/Hôm nay/Ngày mai…) + lọc giải, dòng gom theo giải.
 * `homNay` tính ở server (giờ VN) để HTML server và client giống nhau.
 */
export function DuDoanTheoNgay({
  rows,
  homNay,
  lang,
  locGiai = true,
  hienTyLe = false,
}: {
  rows: HangDuDoan[];
  homNay: string;
  lang: Lang;
  locGiai?: boolean;
  hienTyLe?: boolean;
}) {
  const t = getDict(lang).duDoan;
  const coDuLieu = new Set(rows.map((r) => r.ngay));
  const ngays = [...new Set([lechNgay(homNay, -1), homNay, lechNgay(homNay, 1), ...coDuLieu])].sort();
  // Mặc định: hôm nay nếu có trận, không thì ngày gần nhất phía trước có trận.
  const macDinh = coDuLieu.has(homNay) ? homNay : ngays.find((n) => n > homNay && coDuLieu.has(n)) ?? homNay;
  const [ngay, setNgay] = useState(macDinh);
  const [giai, setGiai] = useState<string | null>(null);

  const trongNgay = rows.filter((r) => r.ngay === ngay).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  const cacGiai = [...new Set(trongNgay.map((r) => r.giai))];
  const hien = giai ? trongNgay.filter((r) => r.giai === giai) : trongNgay;
  const nhom = cacGiai.filter((g) => !giai || g === giai).map((g) => [g, hien.filter((r) => r.giai === g)] as const);

  const nhan = (n: string) =>
    n === homNay ? t.today : n === lechNgay(homNay, -1) ? t.yesterday : n === lechNgay(homNay, 1) ? t.tomorrow : thuNgay(n);

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ngays.map((n) => (
          <Chip key={n} chon={n === ngay} onClick={() => { setNgay(n); setGiai(null); }}>
            {nhan(n)}
          </Chip>
        ))}
      </div>
      {locGiai && cacGiai.length > 1 && (
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip chon={giai === null} onClick={() => setGiai(null)}>{t.all}</Chip>
          {cacGiai.map((g) => (
            <Chip key={g} chon={g === giai} onClick={() => setGiai(g)}>{g}</Chip>
          ))}
        </div>
      )}
      {nhom.length === 0 ? (
        <p className="mt-3 rounded-card border border-line bg-card px-4 py-6 text-center text-sm text-muted">{t.empty}</p>
      ) : (
        nhom.map(([g, ds]) => (
          <section key={g} className="mt-3 overflow-hidden rounded-card border border-line bg-card">
            <h3 className="border-b border-line bg-card-hover px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-muted">{g}</h3>
            <ul className="divide-y divide-line">
              {ds.map((h) => (
                <Dong key={h.slug} h={h} lang={lang} hienTyLe={hienTyLe} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
