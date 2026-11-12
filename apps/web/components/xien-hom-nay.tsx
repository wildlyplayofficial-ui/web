import Link from "next/link";
import { DoiLogo } from "@/components/doi-logo";
import { PhongDoNho } from "@/components/phong-do-dong";
import { withLang, type Lang } from "@/lib/i18n";
import type { CuaXien, Xien } from "@/lib/xien";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { coGiaiGoc } from "@/lib/ten-viet";

const chuCua = (cua: CuaXien, h: HangDuDoan) =>
  cua === "tai" ? "Tài 2.5 bàn" : cua === "xiu" ? "Xỉu 2.5 bàn" : cua === "co" ? "Hai đội cùng ghi bàn" : cua === "khong" ? "Ít nhất một đội không ghi bàn" : `${cua === 0 ? h.nha : h.khach} thắng`;

/** Một xiên trên /keo-xien: đầu khối là cờ giải + giải + loại xiên + tỷ lệ gộp, mỗi chân là link sang trang trận. */
export function KhoiXien({ xien, giai, loai, moDau, id, lang }: { xien: Xien; giai: string; loai: string; moDau: string; id: string; lang: Lang }) {
  // Cờ giải theo tên giải; giải nhiều nước (CAN…) không có cờ riêng thì hình cúp, không mượn cờ một đội.
  const co = coGiaiGoc(giai);
  return (
    <section aria-labelledby={id} className="mb-3 break-inside-avoid rounded-card border border-line bg-card px-3.5 py-3">
      <h3 id={id} className="font-display text-[17px] font-bold leading-snug">
        <span className="flex items-center gap-2">
          {co ? (
            <DoiLogo src={co} ten={giai} lop="h-6 w-6 rounded-full bg-card" />
          ) : (
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
              <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
            </svg>
          )}
          <span className="min-w-0">{giai}</span>
        </span>
        <span className="mt-0.5 block">
          {loai} <span className="tabular-nums text-brand">@ {xien.tong.toFixed(2)}</span>
        </span>
      </h3>
      <p className="mt-0.5 text-[13px] text-muted">{moDau}</p>
      <ul className="mt-2">
        {xien.chan.map(({ h, cua, gia }) => (
          <li key={h.slug} className="border-t border-line/60">
            <Link href={withLang(`/du-doan/${h.slug}`, lang)} className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-2 hover:bg-card-hover">
              <span className="flex -space-x-1.5" aria-hidden>
                <DoiLogo src={h.logoNha} ten={h.nha} lop="h-6 w-6 rounded-full bg-card" />
                <DoiLogo src={h.logoKhach} ten={h.khach} lop="h-6 w-6 rounded-full bg-card" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug">{h.nha} – {h.khach}</span>
                <span className="block text-[13px] text-muted"><span className="tabular-nums">{h.gio}</span> · {chuCua(cua, h)}</span>
                {h.formNha && h.formKhach && (
                  <span className="mt-1 flex items-center gap-2">
                    <PhongDoNho kq={h.formNha} doi={h.nha} />
                    <span aria-hidden className="text-xs text-muted">–</span>
                    <PhongDoNho kq={h.formKhach} doi={h.khach} />
                  </span>
                )}
                {h.mot && (
                  <span className="mt-1 block text-xs tabular-nums text-muted">
                    Chủ {h.mot[0].toFixed(2)} · Hòa {h.mot[1].toFixed(2)} · Khách {h.mot[2].toFixed(2)}
                  </span>
                )}
              </span>
              <span className="text-base font-bold tabular-nums text-brand">{gia.toFixed(2)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-t border-line/60 pt-2.5 text-center text-[15px] font-semibold text-amber-400">
        Đặt 100k, đúng hết nhận <span className="tabular-nums">{Math.round(xien.tong * 100).toLocaleString("vi-VN")}k</span>
      </p>
    </section>
  );
}
