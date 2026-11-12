import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import type { CuaXien, Xien } from "@/lib/xien";
import type { HangDuDoan } from "@/lib/du-doan-hang";

const chuCua = (cua: CuaXien, h: HangDuDoan) =>
  cua === "tai" ? "Tài 2.5 bàn" : cua === "xiu" ? "Xỉu 2.5 bàn" : cua === "co" ? "Hai đội cùng ghi bàn" : cua === "khong" ? "Ít nhất một đội không ghi bàn" : `${cua === 0 ? h.nha : h.khach} thắng`;

/** Một xiên trên /keo-xien: đầu khối là giải + loại xiên + tỷ lệ gộp, mỗi chân là link sang trang trận. */
export function KhoiXien({ xien, giai, loai, moDau, id, lang }: { xien: Xien; giai: string; loai: string; moDau: string; id: string; lang: Lang }) {
  return (
    <section aria-labelledby={id} className="mt-3 rounded-card border border-line bg-card px-3.5 py-3">
      <h3 id={id} className="font-display text-[17px] font-bold leading-snug">
        {giai}
        <span className="block">
          {loai} <span className="tabular-nums text-brand">@ {xien.tong.toFixed(2)}</span>
        </span>
      </h3>
      <p className="mt-0.5 text-[13px] text-muted">{moDau}</p>
      <ul className="mt-2">
        {xien.chan.map(({ h, cua, gia }) => (
          <li key={h.slug} className="border-t border-line/60">
            <Link href={withLang(`/du-doan/${h.slug}`, lang)} className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2 hover:bg-card-hover">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug">{h.nha} – {h.khach}</span>
                <span className="block text-[13px] text-muted">{chuCua(cua, h)}</span>
              </span>
              <span className="text-base font-bold tabular-nums text-brand">{gia.toFixed(2)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
