import { describe, expect, it } from 'vitest';
import { scrubTaiXiu } from './vi-lexicon';

describe('scrubTaiXiu — rewrites betting tài/xỉu to Over/Under', () => {
  it('rewrites "Tài 2.5" to "Over 2.5"', () => {
    expect(scrubTaiXiu('Dự đoán: Tài 2.5')).toBe('Dự đoán: Over 2.5');
  });
  it('rewrites "Xỉu 2.5" to "Under 2.5"', () => {
    expect(scrubTaiXiu('Chọn Xỉu 2.5 bàn.')).toBe('Chọn Under 2.5 bàn.');
  });
  it('rewrites comma decimal and split lines', () => {
    expect(scrubTaiXiu('tài 2,5 hay xỉu 3.5/4')).toBe('Over 2,5 hay Under 3.5/4');
  });
  it('rewrites integer lines', () => {
    expect(scrubTaiXiu('(Tài 3)')).toBe('(Over 3)');
  });
  it('rewrites "tài xỉu" phrase from the Kyrgyzstan article', () => {
    expect(scrubTaiXiu('hai đội ghi bàn và tài xỉu từng trận'))
      .toBe('hai đội ghi bàn và Over/Under từng trận');
  });
  it('rewrites "Tài/Xỉu" and "TÀI XỈU" variants', () => {
    expect(scrubTaiXiu('Tài/Xỉu và TÀI XỈU')).toBe('Over/Under và Over/Under');
  });
  it('is idempotent', () => {
    const once = scrubTaiXiu('Tài 2.5, tài xỉu');
    expect(scrubTaiXiu(once)).toBe(once);
  });
});

describe('scrubTaiXiu — leaves ordinary Vietnamese alone', () => {
  it('keeps "trọng tài" even when followed by a number', () => {
    const s = 'Trọng tài 2 lần rút thẻ, trọng tài chính bắt chắc tay.';
    expect(scrubTaiXiu(s)).toBe(s);
  });
  it('keeps "tài năng", "tài chính", "tài liệu", "tài khoản"', () => {
    const s = 'Tài năng trẻ, tài chính CLB, tài liệu, tài khoản, nhân tài 3 đội.';
    expect(scrubTaiXiu(s)).toBe(s);
  });
  it('keeps "ngất xỉu" and words merely containing the letters', () => {
    const s = 'Cầu thủ ngất xỉu 2 lần; đội Tài Lộc thắng.';
    expect(scrubTaiXiu(s)).toBe(s);
  });
});
