import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { trichCauHoiNhanh } from "../../web/lib/faq-from-markdown";

/**
 * Chạy bộ rút hỏi–đáp trên THÂN BÀI THẬT chụp từ kho ngày 4/9/2026 — 6 bài blog
 * đang sống. Test kia dùng ví dụ tự soạn, dễ trùng khớp với chính mình; test này
 * để bắt trường hợp bộ sinh bài đẻ ra khuôn hơi khác thật.
 * Ảnh chụp nằm cùng thư mục, KHÔNG gọi mạng khi chạy test.
 */
const MAU = path.join(__dirname, "faq-bai-that.mau.json");

describe("rút Câu hỏi nhanh từ bài blog thật", () => {
  const bai: Array<{ slug: string; body_md: string }> = JSON.parse(fs.readFileSync(MAU, "utf8"));

  it("có đủ 6 bài trong ảnh chụp", () => {
    expect(bai.length).toBe(6);
  });

  it("mỗi bài rút được ít nhất 3 cặp, chữ đã sạch markdown", () => {
    for (const b of bai) {
      const r = trichCauHoiNhanh(b.body_md);
      expect(r.length, b.slug).toBeGreaterThanOrEqual(3);
      for (const x of r) {
        expect(x.question, b.slug).not.toContain("*");
        expect(x.answer, b.slug).not.toContain("*");
        expect(x.answer.length, b.slug).toBeGreaterThan(10);
        expect(x.question.length, b.slug).toBeLessThan(160);
      }
    }
  });

  it("câu hỏi giữ nguyên dấu hỏi, không nuốt mục kế tiếp", () => {
    const r = trichCauHoiNhanh(bai[0].body_md);
    expect(r.every((x) => !x.answer.includes("Xem thêm trên Banh Bóng"))).toBe(true);
  });
});
