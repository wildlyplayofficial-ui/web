import type { TongKet } from "@/lib/du-doan-cham";
import { getDict, type Lang } from "@/lib/i18n";

/**
 * Ô thành tích dự đoán (đầu /du-doan + trang chủ): "Chú Tám đoán đúng 18/27 trận".
 * Số THẬT từ trận đã chấm, tách THEO TÁC GIẢ (firewall — không gộp một tổng).
 * Chưa chấm trận nào thì không vẽ gì (bảng đúng/sai bên dưới đã nói rõ trạng thái).
 */
export function OThanhTichDuDoan({ tong, lang }: { tong: readonly TongKet[]; lang: Lang }) {
  if (tong.length === 0) return null;
  const t = getDict(lang).duDoan;
  return (
    <div className="flex flex-wrap gap-2">
      {tong.map((x) => (
        <p
          key={x.tacGia}
          className="rounded-card border border-brand/40 bg-brand/10 px-4 py-2 font-display text-sm font-semibold"
        >
          {x.tacGia} {t.hitRate}{" "}
          <span className="text-lg font-bold text-brand tabular-nums">{x.dungKetQua}/{x.tran}</span> {t.matchesUnit}
          <span className="ml-2 text-xs font-normal text-muted">
            · {t.exactScore.toLowerCase()} {x.dungTySo}
          </span>
        </p>
      ))}
    </div>
  );
}
