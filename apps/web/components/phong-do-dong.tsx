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

// Tên cột ghi MỘT LẦN trên đầu bảng, ô chỉ còn số (Peter 11/11 gửi mẫu PredictZ: chữ trong từng ô khó nhìn).
const NHAN_KEO = ["Chủ", "Hòa", "Khách"] as const;

/** Hàng tên cột đặt đầu mỗi khối giải, cùng lưới với DongTran (bảng /du-doan, không hienGiai). */
export function DauCotKeo() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-[44px_minmax(0,1fr)_auto_12px] gap-x-2.5 border-b border-line/60 px-0.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted lg:grid-cols-[58px_minmax(0,1fr)_150px_minmax(0,1fr)_176px_78px_16px] lg:gap-x-3 lg:px-1.5"
    >
      <div className="col-span-3 col-start-2 flex gap-1 lg:col-span-1 lg:col-start-5">
        {NHAN_KEO.map((n) => (
          <span key={n} className="flex-1 text-center">{n}</span>
        ))}
      </div>
      <span className="hidden text-center lg:col-start-6 lg:block">Tài/Xỉu</span>
    </div>
  );
}

/** 3 ô tỷ lệ chủ thắng · hòa · khách thắng (tên cột ở DauCotKeo); `chieu` (0/1/2) = cửa dự đoán chọn, tô viền xanh. */
export function Keo1X2({ mot, chieu }: { mot: readonly [number, number, number]; chieu: number | null }) {
  return (
    <span className="flex w-full gap-1" aria-label={`Tỷ lệ chủ nhà thắng · hòa · khách thắng: ${mot.map((x) => x.toFixed(2)).join(" · ")}`}>
      {mot.map((x, i) => (
        <span
          key={i}
          className={`flex-1 rounded border py-0.5 text-center text-[13px] tabular-nums ${
            i === chieu ? "border-brand font-bold text-brand" : "border-line bg-card"
          }`}
        >
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
      <span>· Ô viền xanh = cửa dự đoán chọn</span>
    </p>
  );
}
