import { describe, expect, it } from 'vitest';
import { isUsableText } from './soldier';

describe('isUsableText — chặn câu hỏng, không chỉ số sai', () => {
  it('chặn đúng ca đã lọt lên bài 23/8: "Vào sáng ngày"', () => {
    expect(isUsableText('Vào sáng ngày')).toBe(false);
  });

  it('chặn chuỗi rỗng / null / khoảng trắng', () => {
    expect(isUsableText(null)).toBe(false);
    expect(isUsableText('')).toBe(false);
    expect(isUsableText('    ')).toBe(false);
  });

  it('chặn đoạn dài nhưng không có dấu kết câu (bị cắt giữa chừng)', () => {
    expect(isUsableText('Arsenal thắng Coventry City ba không trong trận mở màn Ngoại hạng Anh và điều đó có nghĩa là')).toBe(false);
  });

  it('nhận đoạn đủ dài, có dấu kết câu', () => {
    expect(isUsableText('Arsenal 3-0 Coventry City là kết quả trận Ngoại hạng Anh rạng sáng 22/8 giờ Việt Nam. Ba điểm trọn vẹn giúp Arsenal dẫn đầu.')).toBe(true);
  });

  it('bắt buộc nhắc tên đối tượng — thiếu là loại', () => {
    const t = 'Trận đấu đã kết thúc với chiến thắng thuyết phục dành cho đội chủ nhà trong hiệp hai.';
    expect(isUsableText(t, { mustInclude: ['Arsenal'] })).toBe(false);
    expect(isUsableText(t + ' Arsenal giành ba điểm.', { mustInclude: ['Arsenal'] })).toBe(true);
  });

  it('ngưỡng độ dài chỉnh được theo bản gốc', () => {
    const ngan = 'Arsenal thắng 3-0.';
    expect(isUsableText(ngan, { minChars: 10 })).toBe(true);
    expect(isUsableText(ngan, { minChars: 200 })).toBe(false);
  });
});
