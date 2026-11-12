"use client";

import Link from "next/link";
import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";
import { DongTran } from "@/components/dong-tran";
import { XienHomNay } from "@/components/xien-hom-nay";
import { ChuThichPhongDo, DauCotKeo } from "@/components/phong-do-dong";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { ngayTabDuDoan, ngayThang, thuVN, tieuDeH1 } from "@/lib/du-doan-tran";
import { duongDanNgay, GIAI_TRANG } from "@/lib/du-doan-loc";
import { getDict, withLang, type Lang } from "@/lib/i18n";
import { coGiaiGoc } from "@/lib/ten-viet";

/**
 * Bảng dự đoán theo ngày và theo giải (mẫu Peter duyệt 10/11): h1 theo ngày đang chọn,
 * dòng đếm, hàng nút ngày + ô chọn giải, rồi từng khối giải với dòng trận dùng chung
 * (components/dong-tran.tsx) — bấm trận nào ra trang riêng của trận đó.
 */

/** Cờ tròn đầu khối giải: theo tên giải, không đoán được thì logo đội nhà trận đầu. */
function coGiai(giai: string, dau: HangDuDoan): string | null {
  const g = giai.toLowerCase();
  const co = coGiaiGoc(giai);
  if (co) return co;
  if (/premier league|ngoại hạng anh|fa cup|championship/.test(g)) return "https://flagcdn.com/w40/gb-eng.png";
  if (/v-league|vtv cup|casper|việt nam|vietnam|aff/.test(g)) return "https://flagcdn.com/w40/vn.png";
  if (/la liga|laliga/.test(g)) return "https://flagcdn.com/w40/es.png";
  if (/serie a/.test(g)) return "https://flagcdn.com/w40/it.png";
  if (/bundesliga/.test(g)) return "https://flagcdn.com/w40/de.png";
  if (/ligue 1/.test(g)) return "https://flagcdn.com/w40/fr.png";
  return dau.logoNha;
}

const NUT = "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm";

export function DuDoanPZ({
  rows,
  homNay,
  ngayChon,
  lang,
}: {
  rows: HangDuDoan[];
  /** Khoá ngày hôm nay giờ VN, dựng ở server. */
  homNay: string;
  /** Ngày trang này hiện (trang ngày /du-doan/ngay-mai, /du-doan/thu-bay…); bỏ trống = ngày đầu có trận. */
  ngayChon?: string;
  lang: Lang;
}) {
  const t = getDict(lang).duDoan;
  // Hôm nay → 5 ngày tới, CHỈ ngày có trận; hôm qua không hiện (Peter 11/11, xem /ket-qua).
  // Mỗi tab ngày là LINK riêng (Peter 11/11: Google phải thấy được trang từng ngày).
  const tab = ngayTabDuDoan(homNay, new Set(rows.map((r) => r.ngay)));
  const ngay = ngayChon ?? tab.macDinh;
  const ngays = tab.ngays.includes(ngay) ? tab.ngays : [...tab.ngays, ngay].sort();
  const [giai, setGiai] = useState("");

  const trongNgay = rows.filter((r) => r.ngay === ngay).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  const cacGiai = [...new Set(trongNgay.map((r) => r.giai))];
  const nhom = cacGiai.filter((g) => !giai || g === giai).map((g) => [g, trongNgay.filter((r) => r.giai === g)] as const);
  const nhan = (n: string) => `${n === homNay ? t.today : thuVN(n)} ${ngayThang(n)}`;

  return (
    <div className="px-3.5 sm:px-2.5">
      <h1 className="font-display text-[21px] font-bold leading-tight sm:text-[28px]">{ngayChon && duongDanNgay(ngayChon, homNay).endsWith("ngay-mai") ? `Dự đoán bóng đá ngày mai, ${thuVN(ngayChon)} ${ngayThang(ngayChon)}` : tieuDeH1(ngay)}</h1>
      <p className="mt-1.5 text-[13px] text-muted sm:text-[15px]">
        {trongNgay.length} {t.matchesUnit} · {cacGiai.length} giải · giờ Việt Nam · tỷ số chốt trước giờ bóng lăn
      </p>
      <nav aria-label="Dự đoán theo giải" className="mt-2.5 flex gap-x-4 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
        {GIAI_TRANG.map((g) => (
          <Link key={g.slug} href={withLang(`/du-doan/${g.slug}`, lang)} className="inline-flex min-h-9 items-center text-brand hover:underline">
            {g.ten}
          </Link>
        ))}
      </nav>
      <div className="mt-1 flex flex-col gap-2.5 border-b border-line pb-2.5 lg:flex-row lg:items-center">
        {/* 1 hàng cuộn ngang thay nút xếp dọc (ăn nửa màn điện thoại) — góp ý Jane 10/11. */}
        <div className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]">
          {ngays.map((n) => (
            <Link
              key={n}
              href={withLang(duongDanNgay(n, homNay), lang)}
              aria-current={n === ngay ? "page" : undefined}
              className={`${NUT} ${n === ngay ? "border-ink font-semibold text-ink" : "border-line text-muted hover:text-ink"}`}
            >
              {nhan(n)}
            </Link>
          ))}
        </div>
        <select
          aria-label="Chọn giải đấu"
          value={giai}
          onChange={(e) => setGiai(e.target.value)}
          className="h-11 w-full shrink-0 rounded-md border border-line bg-card px-3 text-sm text-ink lg:ml-auto lg:w-auto"
        >
          <option value="">Tất cả giải ({cacGiai.length})</option>
          {cacGiai.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {!giai && <XienHomNay rows={trongNgay} tieuDe={ngay === homNay ? "Xiên hôm nay" : `Xiên ${thuVN(ngay)} ${ngayThang(ngay)}`} lang={lang} />}
      {nhom.length > 0 && (
        <div className="pt-2.5">
          <ChuThichPhongDo />
        </div>
      )}
      {nhom.length === 0 ? (
        <p className="border-b border-line py-6 text-sm text-muted">{t.empty}</p>
      ) : (
        nhom.map(([g, ds]) => (
          <section key={g}>
            <div className="flex items-center gap-2.5 border-b border-line px-0.5 pb-2 pt-[18px] lg:px-1.5">
              <span className="inline-block h-5 w-5 shrink-0 overflow-hidden rounded-full [&_img]:object-cover">
                <DoiLogo src={coGiai(g, ds[0])} ten={g} size={20} />
              </span>
              <h2 className="min-w-0 font-display text-[17px] font-bold leading-snug">Dự đoán {g}</h2>
              <span className="shrink-0 text-[13px] text-muted">{ds.length} {t.matchesUnit}</span>
            </div>
            <DauCotKeo />
            <ul>
              {ds.map((h) => (
                <li key={h.slug}>
                  <DongTran h={h} lang={lang} phongDo />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
