import type { KetQuaHub } from "@/lib/giai-hub";
import { ngayVN } from "@/lib/du-doan-hang";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { LogoDoi } from "./khoi";

const THU_NGAN: Record<string, string> = { "Chủ Nhật": "CN", "Thứ Hai": "T2", "Thứ Ba": "T3", "Thứ Tư": "T4", "Thứ Năm": "T5", "Thứ Sáu": "T6", "Thứ Bảy": "T7" };

/** Kết quả vòng vừa xong: nhà (logo) · tỷ số · khách (logo). Tên được xuống dòng, không cắt. */
export function KetQuaVong({ ds, logo }: { ds: KetQuaHub[]; logo?: Record<string, string> }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
      {ds.map((m) => {
        const ngay = ngayVN(m.gioUtc);
        return (
          <li key={`${m.nha}-${m.khach}`} className="grid min-h-14 grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-2 px-3 py-2.5">
            <span className="flex min-w-0 items-center justify-end gap-2 text-right">
              <span className="min-w-0 break-words text-sm font-semibold leading-snug">{m.nha}</span>
              <LogoDoi ten={m.nha} du={logo} />
            </span>
            <span className="text-center">
              <span className="block font-display text-lg font-bold tabular-nums">{`${m.bn} - ${m.bk}`}</span>
              <span className="block text-[12px] text-muted">{`${THU_NGAN[thuVN(ngay)]} ${ngayThang(ngay)}`}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <LogoDoi ten={m.khach} du={logo} />
              <span className="min-w-0 break-words text-sm font-semibold leading-snug">{m.khach}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
