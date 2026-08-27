import { describe, expect, it } from 'vitest';
import { teamsMatch, tuTen } from './provider-matcher';

/** Mọi cặp dưới đây là TÊN THẬT lấy từ hai nhà cung cấp lúc 11h ngày 27/8/2026,
 *  không phải tên bịa. Cách so cũ (so nguyên chuỗi) trượt 73/89 trận. */
describe('teamsMatch — tên thật từ odds-api và livescore', () => {
  const KHOP: Array<[string, string, string]> = [
    ['Liverpool FC', 'Liverpool', 'đuôi FC'],
    ['Everton FC', 'Everton', 'đuôi FC'],
    ['Arsenal FC', 'Arsenal', 'đuôi FC'],
    ['Sunderland AFC', 'Sunderland', 'đuôi AFC'],
    ['Brentford FC', 'Brentford', 'đuôi FC'],
    ['AFC Bournemouth', 'AFC Bournemouth', 'giống hệt'],
    ['Sassuolo Calcio', 'Sassuolo', 'thừa chữ Calcio'],
    ['Parma Calcio', 'Parma', 'thừa chữ Calcio'],
    ['Como 1907', 'Como', 'thừa năm thành lập'],
    ['SSC Napoli', 'Napoli', 'thừa tiền tố SSC'],
    ['Borussia Monchengladbach', 'Borussia Moenchengladbach', 'tiếng Đức viết hai kiểu'],
    ['Real Betis Seville', 'Real Betis', 'thừa tên thành phố'],
    ['Espanyol Barcelona', 'Espanyol', 'thừa tên thành phố'],
    ['Levante UD', 'Levante', 'đuôi UD'],
    ['Deportivo Alaves', 'Alaves', 'thừa chữ Deportivo'],
    ['RC Celta de Vigo', 'Celta Vigo', 'thừa RC và de'],
    ['Real Sociedad San Sebastian', 'Real Sociedad', 'thừa tên thành phố'],
    ['VfB Stuttgart', 'Stuttgart', 'thừa tiền tố VfB'],
  ];
  for (const [a, b, vi] of KHOP) {
    it(`khớp "${a}" với "${b}" (${vi})`, () => {
      expect(teamsMatch(a, b)).toBe(true);
    });
  }
});

/** Quan trọng hơn phần khớp: KHÔNG được khớp bừa. Ghép nhầm gắn tỷ số trực tiếp
 *  của trận khác vào, hại hơn là không ghép được. */
describe('teamsMatch — KHÔNG được khớp bừa', () => {
  const KHONG: Array<[string, string]> = [
    ['Manchester City', 'Manchester United'],
    ['Real Madrid', 'Real Sociedad'],
    ['Real Betis', 'Real Madrid'],
    ['Borussia Dortmund', 'Borussia Monchengladbach'],
    ['Atletico Madrid', 'Athletic Bilbao'],
    ['Stade Rennais', 'Rennes'],
  ];
  for (const [a, b] of KHONG) {
    it(`KHÔNG khớp "${a}" với "${b}"`, () => {
      expect(teamsMatch(a, b)).toBe(false);
    });
  }
});

describe('teamsMatch — mấy ca dễ vỡ', () => {
  it('tên rỗng thì không khớp với gì cả', () => {
    expect(teamsMatch('', 'Arsenal')).toBe(false);
    expect(teamsMatch('Arsenal', '')).toBe(false);
  });

  it('tên chỉ toàn chữ thừa thì không khớp bừa', () => {
    // "FC" một mình không còn từ nào → tập rỗng → phải trả false, KHÔNG được
    // coi là tập con của mọi tên.
    expect(teamsMatch('FC', 'Liverpool FC')).toBe(false);
  });

  it('vẫn giữ bảng thay tên đội tuyển quốc gia làm hồi World Cup', () => {
    expect(teamsMatch('Turkey', 'Turkiye')).toBe(true);
    expect(teamsMatch('South Korea', 'Korea Republic')).toBe(true);
    expect(teamsMatch('USA', 'United States')).toBe(true);
  });

  it('bỏ số năm thành lập nhưng giữ số là phần tên riêng thì vẫn phân biệt được', () => {
    expect(tuTen('Como 1907').has('1907')).toBe(false);
    expect(tuTen('Mainz 05')).toEqual(new Set(['mainz']));
  });

  it('không phân biệt hoa thường và dấu', () => {
    expect(teamsMatch('ATLÉTICO MADRID', 'atletico madrid')).toBe(true);
  });
});

/** RỦI RO ĐÃ BIẾT, ghi ra chứ không giấu.
 *
 *  Luật "tên ngắn nằm trọn trong tên dài" khiến một tên CHỈ CÓ MỘT TỪ có thể lọt
 *  vào tên hai từ: "Inter" nằm trong "Inter Miami", "Nottingham" nằm trong
 *  "Nottingham Forest". Bài dưới đây khẳng định ĐÚNG hành vi hiện tại, chứ không
 *  phải hành vi mong muốn.
 *
 *  Vì sao vẫn chấp nhận được: hàm này không bao giờ được gọi trần. Chỗ gọi chặn
 *  bằng bốn lớp — cùng một giải, cùng một ngày, PHẢI khớp CẢ đội nhà lẫn đội khách,
 *  và có từ hai trận cùng khớp thì bỏ không ghép. Inter với Inter Miami không bao
 *  giờ chung một giải. Đo thật 27/8/2026 trên 86 trận ghép được: 0 ca ghép nhầm,
 *  kiểm chéo độc lập bằng giờ đá.
 *
 *  Siết chặt hơn thì gãy chỗ khác: bắt tên một từ phải khớp tuyệt đối sẽ làm trượt
 *  "Espanyol" với "Espanyol Barcelona" — cặp có thật ở La Liga.
 *  Có ca ghép nhầm THẬT thì sửa ở đây, kèm ca đó làm bằng chứng.
 */
describe('teamsMatch — rủi ro đã biết, chưa chặn ở tầng này', () => {
  it('tên một từ LỌT vào tên hai từ — chỗ gọi phải chặn bằng giải và ngày', () => {
    expect(teamsMatch('Inter', 'Inter Miami')).toBe(true);
    expect(teamsMatch('Nottingham', 'Nottingham Forest')).toBe(true);
  });
});
