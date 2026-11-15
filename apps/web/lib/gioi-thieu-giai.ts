/**
 * Đoạn giới thiệu + câu hỏi đầu bảng cho trang 5 giải lớn (Peter 15/11: SEO/GEO kiểu PredictZ,
 * "các giải phải khác nhau tí"). Chỉ ghi điều mình làm thật; số liệu động lấy từ trang truyền vào.
 */
export interface GioiThieuGiai {
  /** Đoạn mở trang. `vong` = vòng sắp đá, `soTran` = số trận đã có dự đoán. */
  mo: (mua: string, vong: number | null, soTran: number) => string;
  /** Tiêu đề câu hỏi trên khối BXH. */
  hoiDauBang: (mua: string) => string;
}

const vongCo = (vong: number | null, soTran: number, mau: (v: number, n: number) => string) =>
  vong && soTran > 0 ? ` ${mau(vong, soTran)}` : "";

const GIOI_THIEU: Record<string, GioiThieuGiai> = {
  "ngoai-hang-anh": {
    mo: (mua, v, n) =>
      `Ngoại hạng Anh mùa ${mua} có 20 đội, 38 vòng, và trận nào banhbong cũng có dự đoán tỷ số, kèm hai lựa chọn Over/Under 2.5 và Cả 2 đội ghi bàn.` +
      vongCo(v, n, (v, n) => `Vòng ${v} đã lên dự đoán cho ${n} trận.`) +
      ` Mỗi dự đoán dựa trên phong độ 5 trận gần nhất, chỉ số xG và danh sách cầu thủ vắng mặt, cập nhật hằng ngày theo giờ Việt Nam.`,
    hoiDauBang: (mua) => `Đội nào đang dẫn đầu Ngoại hạng Anh ${mua}?`,
  },
  "la-liga": {
    mo: (mua, v, n) =>
      `Dự đoán La Liga ${mua}: 20 đội Tây Ban Nha, 38 vòng, trận nào cũng có tỷ số dự đoán cùng hai lựa chọn Over/Under 2.5 và Cả 2 đội ghi bàn.` +
      vongCo(v, n, (v, n) => `${n} trận của vòng ${v} đã có dự đoán.`) +
      ` banhbong chấm từng trận theo xG, phong độ 5 trận và tình hình chấn thương, treo giò; giờ đá đã đổi sang giờ Việt Nam.`,
    hoiDauBang: (mua) => `Ai đang đứng đầu La Liga ${mua}?`,
  },
  "serie-a": {
    mo: (mua, v, n) =>
      `banhbong theo sát Serie A ${mua} từ vòng đầu tới vòng 38: 20 đội Ý, mỗi trận một dự đoán tỷ số, thêm Over/Under 2.5 và Cả 2 đội ghi bàn để bạn chọn.` +
      vongCo(v, n, (v, n) => `Vòng ${v} hiện có ${n} trận đã dự đoán.`) +
      ` Cơ sở là chỉ số xG, 5 trận gần nhất của từng đội và lực lượng ra sân, làm mới mỗi ngày.`,
    hoiDauBang: (mua) => `Đội nào đang dẫn đầu Serie A ${mua}?`,
  },
  bundesliga: {
    mo: (mua, v, n) =>
      `Bundesliga ${mua} có 18 đội, 34 vòng. Trên banhbong, trận Bundesliga nào cũng có dự đoán tỷ số, Over/Under 2.5 và Cả 2 đội ghi bàn.` +
      vongCo(v, n, (v, n) => `Đã có dự đoán ${n} trận vòng ${v}.`) +
      ` Dự đoán tính từ xG, phong độ 5 trận gần đây và cầu thủ vắng mặt, cập nhật mỗi ngày theo giờ Việt Nam.`,
    hoiDauBang: (mua) => `Ai đang dẫn đầu Bundesliga ${mua}?`,
  },
  "ligue-1": {
    mo: (mua, v, n) =>
      `Ligue 1 ${mua} gồm 18 đội Pháp đá 34 vòng, và banhbong có dự đoán tỷ số cho từng trận, kèm Over/Under 2.5 và Cả 2 đội ghi bàn.` +
      vongCo(v, n, (v, n) => `Vòng ${v}: ${n} trận đã có dự đoán.`) +
      ` Mỗi trận được xem qua xG, phong độ 5 trận gần nhất và tình hình lực lượng, làm mới hằng ngày, giờ Việt Nam.`,
    hoiDauBang: (mua) => `Đội nào đang đứng đầu Ligue 1 ${mua}?`,
  },
};

export function gioiThieuGiai(slug: string, compName: string): GioiThieuGiai {
  return (
    GIOI_THIEU[slug] ?? {
      mo: (mua, v, n) =>
        `Mọi trận ${compName} mùa ${mua} đều có dự đoán tỷ số trên banhbong, kèm Over/Under 2.5 và Cả 2 đội ghi bàn.` +
        vongCo(v, n, (v, n) => `Vòng ${v} đã có dự đoán cho ${n} trận.`) +
        ` Dự đoán dựa trên phong độ 5 trận gần nhất, xG và lực lượng, cập nhật hằng ngày theo giờ Việt Nam.`,
      hoiDauBang: (mua) => `Ai đang dẫn đầu ${compName} ${mua}?`,
    }
  );
}
