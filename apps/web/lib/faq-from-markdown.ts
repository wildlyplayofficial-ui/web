/**
 * Rút cặp hỏi–đáp từ mục "## Câu hỏi nhanh" trong thân bài markdown.
 *
 * VÌ SAO CÓ FILE NÀY: từ tháng 8/2023 Google chỉ còn hiện FAQ rich result cho
 * site cơ quan nhà nước và y tế — bài bóng đá của mình KHÔNG được hiện. Cái này
 * làm cho AI/LLM (ChatGPT, Perplexity, AI Overview) đọc và trích lại câu trả
 * lời, chứ KHÔNG phải để lấy ô FAQ trên trang kết quả Google. Đừng kỳ vọng
 * thêm lượt bấm từ nó.
 *
 * Khuôn mục trong bài (do bộ sinh bài đẻ ra):
 *
 *   ## Câu hỏi nhanh
 *
 *   **Ai ghi bàn nhiều nhất Ngoại hạng Anh?**
 *   Alan Shearer với 260 bàn trong 441 trận.
 *
 *   ## Xem thêm trên Banh Bóng
 */

/** Câu hỏi là dòng in đậm TOÀN BỘ, ví dụ `**Ai ghi bàn nhiều nhất?**` */
const DONG_IN_DAM = /^\*\*(.+?)\*\*$/;

/** Mục kết thúc khi gặp tiêu đề kế tiếp (## Xem thêm...) hoặc hết bài. */
const DONG_TIEU_DE = /^#{1,6}\s/;

/** Tiêu đề H2 mở mục — so sau khi đã bỏ markdown và hạ chữ thường. */
const TEN_MUC = "câu hỏi nhanh";

/** Bỏ markdown để còn câu chữ trần: `[text](url)` → `text`, bỏ `*` và `**`. */
function boMarkdown(chu: string): string {
  return chu
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function trichCauHoiNhanh(bodyMd: string): Array<{ question: string; answer: string }> {
  if (!bodyMd) return [];

  // Chuẩn hoá NFC: dấu tiếng Việt tổ hợp (NFD) sẽ không khớp chuỗi TEN_MUC.
  const dong = bodyMd.normalize("NFC").split(/\r?\n/);

  let i = dong.findIndex((d) => {
    const tieuDe = d.match(/^##(?!#)\s+(.+)$/);
    return tieuDe !== null && boMarkdown(tieuDe[1]).toLowerCase() === TEN_MUC;
  });
  if (i === -1) return [];

  const ketQua: Array<{ question: string; answer: string }> = [];
  let cauHoi: string | null = null;
  let cacDongDap: string[] = [];

  // Chốt cặp đang gom. Dòng in đậm không có câu trả lời bên dưới thì bỏ.
  const chot = () => {
    const dap = boMarkdown(cacDongDap.join(" "));
    if (cauHoi && dap) ketQua.push({ question: cauHoi, answer: dap });
    cauHoi = null;
    cacDongDap = [];
  };

  for (i += 1; i < dong.length; i += 1) {
    if (DONG_TIEU_DE.test(dong[i])) break;

    const chu = dong[i].trim();
    if (!chu) continue;

    const hoi = chu.match(DONG_IN_DAM);
    if (hoi) {
      chot();
      cauHoi = boMarkdown(hoi[1]) || null;
      continue;
    }

    // Chữ trước câu hỏi đầu tiên là lời dẫn của mục, không phải câu trả lời.
    if (cauHoi) cacDongDap.push(chu);
  }
  chot();

  return ketQua;
}
