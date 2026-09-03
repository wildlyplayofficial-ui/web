import { describe, expect, it } from 'vitest';
import { trichCauHoiNhanh } from '../../web/lib/faq-from-markdown';

/**
 * Hàm nằm ở apps/web/lib nhưng test đặt ở đây vì apps/web KHÔNG có bộ chạy test
 * (không có vitest trong devDependencies, không có file *.test.* nào). Vitest
 * của worker là bộ chạy duy nhất trong repo — để test cạnh file thì `npm test`
 * không ai chạy, mà `tsc --noEmit` của web lại đỏ vì thiếu type của vitest.
 */

const BAI_MAU = `# Ai ghi bàn nhiều nhất Ngoại hạng Anh

Mở bài gì đó.

## Bảng xếp hạng

Nội dung bảng.

## Câu hỏi nhanh

**Ai ghi bàn nhiều nhất Ngoại hạng Anh?**
Alan Shearer với 260 bàn trong 441 trận, cho Blackburn Rovers và Newcastle United.

**Có ai vượt được 200 bàn không?**
Ba người: Shearer 260, Harry Kane 213, Wayne Rooney 208.

## Xem thêm trên Banh Bóng

- [Bảng xếp hạng](/blog/bxh)
`;

describe('trichCauHoiNhanh', () => {
  it('rút đúng hai cặp hỏi–đáp của mục Câu hỏi nhanh', () => {
    expect(trichCauHoiNhanh(BAI_MAU)).toEqual([
      {
        question: 'Ai ghi bàn nhiều nhất Ngoại hạng Anh?',
        answer:
          'Alan Shearer với 260 bàn trong 441 trận, cho Blackburn Rovers và Newcastle United.',
      },
      {
        question: 'Có ai vượt được 200 bàn không?',
        answer: 'Ba người: Shearer 260, Harry Kane 213, Wayne Rooney 208.',
      },
    ]);
  });

  it('trả mảng rỗng khi bài không có mục Câu hỏi nhanh', () => {
    const bai = `## Bảng xếp hạng\n\n**In đậm nhưng ngoài mục?**\nCâu này không được lấy.\n`;
    expect(trichCauHoiNhanh(bai)).toEqual([]);
  });

  it('trả mảng rỗng khi mục có tiêu đề nhưng không có cặp nào', () => {
    const bai = `## Câu hỏi nhanh\n\nChưa cập nhật.\n\n## Xem thêm trên Banh Bóng\n`;
    expect(trichCauHoiNhanh(bai)).toEqual([]);
  });

  it('bỏ dòng in đậm không có câu trả lời bên dưới', () => {
    const bai = `## Câu hỏi nhanh\n\n**Câu hỏi cụt?**\n\n**Câu hỏi có đáp?**\nCó đáp án đây.\n`;
    expect(trichCauHoiNhanh(bai)).toEqual([
      { question: 'Câu hỏi có đáp?', answer: 'Có đáp án đây.' },
    ]);
  });

  it('nối câu trả lời hai dòng bằng một dấu cách', () => {
    const bai = `## Câu hỏi nhanh\n\n**Vì sao Shearer giữ kỷ lục lâu vậy?**\nÔng ghi 260 bàn trong 441 trận.\nKhông ai trong nhóm đang thi đấu tới gần con số đó.\n`;
    expect(trichCauHoiNhanh(bai)).toEqual([
      {
        question: 'Vì sao Shearer giữ kỷ lục lâu vậy?',
        answer:
          'Ông ghi 260 bàn trong 441 trận. Không ai trong nhóm đang thi đấu tới gần con số đó.',
      },
    ]);
  });

  it('bỏ markdown link trong câu hỏi lẫn câu trả lời', () => {
    const bai = `## Câu hỏi nhanh\n\n**[Alan Shearer](/blog/shearer) ghi bao nhiêu bàn?**\n260 bàn, xem thêm ở [bảng xếp hạng](/blog/bxh).\n`;
    expect(trichCauHoiNhanh(bai)).toEqual([
      {
        question: 'Alan Shearer ghi bao nhiêu bàn?',
        answer: '260 bàn, xem thêm ở bảng xếp hạng.',
      },
    ]);
  });

  it('không ném lỗi với thân bài rỗng', () => {
    expect(trichCauHoiNhanh('')).toEqual([]);
  });
});
