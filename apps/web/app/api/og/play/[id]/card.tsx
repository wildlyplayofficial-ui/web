import type { ReactNode } from "react";

/**
 * Thẻ trận Pick — khuôn Peter chốt 21/8, dựng lại bằng Satori cho worker dùng tự động.
 * Bản gốc vẽ bằng Python/PIL ở tools/watchlist/tao-the-pick.py; hai bên phải nhìn giống nhau.
 *
 * Khác bản Python vì Satori không vẽ được tự do:
 *  - vạch sân và quầng sáng: thay bằng gradient, không dùng ảnh phủ
 *  - ba biểu tượng xu/khiên/đồng hồ: bỏ, chỉ giữ chữ — Satori không vẽ polygon
 * Màu và cỡ chữ giữ đúng bản gốc: vàng #ffd640, nền dốc ngang #0a5c34 → #032818.
 */

const VANG = "#ffd640";
const XANH_NHAT = "#bee8d0";

export type TheTranPickProps = {
  /** Chữ nhỏ trên cùng. Trước trận "NHẬN ĐỊNH NỔI BẬT", sau trận "KẾT QUẢ". */
  nhan: string;
  giai: string;
  doiNha: string;
  doiKhach: string;
  duDoan: string;
  mucTuTin: string | null;
  donVi: string | null;
  gioDa: string;
  /** Sau trận: thay hàng Đơn vị/Tự tin/Giờ bằng "Kết quả: 2-2 · TRÚNG".
   *  Giờ đá và mức tự tin sau trận không còn nghĩa gì (Jane 29/8). */
  ketQua: string | null;
  huyHieuNha: string | null;
  huyHieuKhach: string | null;
  anhCauThu: string | null;
  logo: string | null;
};

/** Chữ dài thì hạ cỡ, giống hàm _fit bên bản Python. */
function coChu(s: string, rong: number, coMax: number, coMin = 30): number {
  const uoc = s.length * coMax * 0.52;
  if (uoc <= rong) return coMax;
  return Math.max(coMin, Math.floor((rong / (s.length * 0.52))));
}

function TenDoi({ huyHieu, ten }: { huyHieu: string | null; ten: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
        {huyHieu ? <img src={huyHieu} width={64} height={64} style={{ objectFit: "contain" }} /> : null}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: coChu(ten, 460, 52),
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: -0.5,
        }}
      >
        {ten.toUpperCase()}
      </div>
    </div>
  );
}

export function TheTranPick(p: TheTranPickProps): ReactNode {
  const oThongTin = p.ketQua
    ? [p.ketQua]
    : [
        ...(p.donVi ? [`Đơn vị: ${p.donVi}`] : []),
        ...(p.mucTuTin ? [`Tự tin: ${p.mucTuTin}`] : []),
        p.gioDa,
      ];
  return (
    <div
      style={{
        display: "flex",
        width: 1200,
        height: 630,
        position: "relative",
        backgroundImage: "linear-gradient(90deg, #0a5c34 0%, #0a5c34 30%, #032818 100%)",
        fontFamily: "SpaceGrotesk",
      }}
    >
      {/* Cầu thủ bám mép phải, tràn xuống đáy — giống bản Python (cao 604, lệch phải 34) */}
      {p.anhCauThu ? (
        <img
          src={p.anhCauThu}
          height={604}
          style={{ position: "absolute", right: -34, bottom: 0, height: 604, objectFit: "contain" }}
        />
      ) : null}

      {/* Lớp tối mờ nửa trái cho chữ nổi */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 700,
          height: 630,
          backgroundImage: "linear-gradient(90deg, rgba(0,26,14,0.55) 0%, rgba(0,26,14,0.35) 60%, rgba(0,26,14,0) 100%)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 50, top: 32, width: 620 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {p.logo ? <img src={p.logo} width={50} height={50} style={{ objectFit: "contain" }} /> : null}
          {/* Hình thoi VẼ BẰNG Ô XOAY, đừng gõ ký tự ◆ — phông không có, ra ô vuông.
              Đúng bẫy đã dính hai lần: bản Python phải vẽ polygon, bản này phải xoay div. */}
          <div style={{ display: "flex", width: 14, height: 14, backgroundColor: VANG, transform: "rotate(45deg)" }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: VANG, letterSpacing: 1 }}>
            {p.nhan}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: XANH_NHAT }}>{p.giai}</div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 16, gap: 6 }}>
          <TenDoi huyHieu={p.huyHieuNha} ten={p.doiNha} />
          <div style={{ display: "flex", marginLeft: 84, fontSize: 30, fontWeight: 700, color: VANG }}>VS</div>
          <TenDoi huyHieu={p.huyHieuKhach} ten={p.doiKhach} />
        </div>

        {/* Khung viền vàng: dự đoán to nhất tấm */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 22,
            width: 572,
            borderRadius: 20,
            border: `3px solid ${VANG}`,
            backgroundColor: "rgba(1,30,18,0.6)",
            padding: "16px 28px 18px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: coChu(p.duDoan, 500, 82, 40),
              fontWeight: 700,
              color: VANG,
              letterSpacing: -1,
            }}
          >
            {p.duDoan.toUpperCase()}
          </div>
          <div style={{ display: "flex", height: 2, backgroundColor: "rgba(255,214,64,0.45)", marginTop: 10 }} />
          <div style={{ display: "flex", marginTop: 12, gap: 18, alignItems: "center" }}>
            {oThongTin.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                {i > 0 ? <div style={{ display: "flex", width: 2, height: 26, backgroundColor: "rgba(255,214,64,0.45)" }} /> : null}
                <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: VANG }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", position: "absolute", left: 50, bottom: 40, fontSize: 28, color: XANH_NHAT }}>
        banhbong.net
      </div>
    </div>
  );
}
