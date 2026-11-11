import type { KQ } from "@/lib/phong-do";

/**
 * Ô phong độ + tỷ lệ 1·X·2 gọn cho dòng trận /du-doan (kiểu PredictZ, Peter gật 11/11).
 * Ô màu đặc: T thắng xanh · H hoà vàng · B bại đỏ. Chuỗi phong độ CŨ NHẤT TRƯỚC → trận mới nhất nằm bên phải.
 * Thiếu dữ liệu thì không vẽ gì.
 */

const NEN: Record<KQ, string> = { T: "bg-[#059652]", H: "bg-amber-500", B: "bg-[#f85149]" };
const TEN: Record<KQ, string> = { T: "thắng", H: "hoà", B: "bại" };

export function PhongDoNho({ kq, doi }: { kq: readonly KQ[] | null; doi: string }) {
  if (!kq || kq.length === 0) return null;
  return (
    <span className="flex gap-[3px]" aria-label={`Phong độ ${doi}, 5 trận gần nhất (mới nhất bên phải): ${kq.join(" ")}`}>
      {kq.map((k, i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] font-display text-[10px] font-bold leading-none text-white ${NEN[k]}`}
        >
          {k}
        </span>
      ))}
    </span>
  );
}

const NHAN_KEO = ["1", "X", "2"] as const;

/** 3 ô tỷ lệ 1 · X · 2; `chieu` (0/1/2) = cửa dự đoán chọn, tô viền xanh. */
export function Keo1X2({ mot, chieu }: { mot: readonly [number, number, number]; chieu: number | null }) {
  return (
    <span className="flex gap-1" aria-label={`Tỷ lệ 1 X 2: ${mot.map((x) => x.toFixed(2)).join(" · ")}`}>
      {mot.map((x, i) => (
        <span
          key={i}
          className={`inline-flex flex-1 items-baseline justify-center gap-1 whitespace-nowrap rounded border px-1 py-0.5 text-[12px] tabular-nums lg:text-[13px] ${
            i === chieu ? "border-brand font-bold text-brand" : "border-line bg-card"
          }`}
        >
          <span className="text-[10px] font-normal text-muted">{NHAN_KEO[i]}</span>
          {x.toFixed(2)}
        </span>
      ))}
    </span>
  );
}

/** Một dòng chú thích màu ô phong độ, đặt một lần mỗi trang. */
export function ChuThichPhongDo() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span>Phong độ 5 trận, mới nhất bên phải:</span>
      {(["T", "H", "B"] as const).map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <PhongDoNho kq={[k]} doi="" /> {TEN[k]}
        </span>
      ))}
      <span>· 1 X 2 = tỷ lệ chủ nhà thắng · hoà · khách thắng</span>
    </p>
  );
}
