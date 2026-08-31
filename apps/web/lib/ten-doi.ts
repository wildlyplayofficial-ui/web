/** Chữ chỉ LOẠI HÌNH câu lạc bộ, không phải tên. Nguồn kèo ghi "Juventus Turin",
 *  "AS Roma", "SSC Napoli", "Arsenal FC" trong khi kho lưu "Juventus", "Roma",
 *  "Napoli", "Arsenal" — bỏ mấy chữ này đi rồi tra lại là khớp.
 *  Đo 29/8 trên /keo: 76 đội, 23 khớp sẵn, 34 khớp thêm nhờ bước này. */
const CHU_LOAI_CLB = new Set([
  "fc", "ac", "as", "aj", "sc", "cf", "ssc", "ogc", "us", "acf", "rc", "ca",
  "afc", "bc", "cfc", "sco", "calcio", "sv", "vfb", "fk", "cd", "ud", "sd",
  "rcd", "ss", "ssd", "club", "estac",
]);

/** Tên rút gọn để tra: bỏ dấu, bỏ chữ loại hình CLB, còn lại nối bằng khoảng trắng.
 *  DÙNG CHUNG cho mọi chỗ tra tên đội (huy hiệu, ảnh cầu thủ). Có hai bản riêng là
 *  hai bản lệch nhau — đúng lý do huy hiệu hỏng 29/8 rồi ảnh cầu thủ hỏng 31/8. */
export function tenTra(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !CHU_LOAI_CLB.has(w))
    .join(" ");
}
