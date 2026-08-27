import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { log } from './log';
import { lsFetch } from './ls-fetch';
import { ghiMapping, runProviderMatcher, teamsMatch, tuTen } from './provider-matcher';

vi.mock('./log');
vi.mock('./ls-fetch', () => ({ lsFetch: vi.fn() }));

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

type Dong = Record<string, unknown>;
type Hang = Parameters<typeof ghiMapping>[1];

/** Fake supabase tối thiểu, GIỮ đúng khoá unique của bảng thật
 *  (competition_id, home_team, away_team, kickoff_utc): chèn trùng thì trả lỗi
 *  "duplicate key" y như Postgres — đúng lỗi prod 27/8/2026 15:41Z. `bang` là dữ liệu
 *  sống, bài test soi thẳng vào đó. */
function giaLapSb(banDau: Dong[], cuocThi: Dong[] = []) {
  const bang: Dong[] = banDau.map((d, i) => ({ id: i + 1, ...d }));
  let idKe = bang.length + 1;
  const khoa = (r: Dong) => [r.competition_id, r.home_team, r.away_team, r.kickoff_utc].join('|');
  const builder = (rows: Dong[]) => {
    const loc: Array<(r: Dong) => boolean> = [];
    let thaoTac: 'select' | 'update' | 'delete' = 'select';
    let du: Dong = {};
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.limit = () => b;
    b.update = (v: Dong) => { thaoTac = 'update'; du = v; return b; };
    b.delete = () => { thaoTac = 'delete'; return b; };
    b.match = (obj: Dong) => { loc.push((r) => Object.entries(obj).every(([k, v]) => r[k] === v)); return b; };
    b.eq = (k: string, v: unknown) => { loc.push((r) => r[k] === v); return b; };
    b.is = b.eq;
    b.insert = async (v: Dong) => {
      if (rows.some((r) => khoa(r) === khoa(v))) {
        return { error: { message: 'duplicate key value violates unique constraint "provider_mappings_competition_id_home_team_away_team_kickof_key"' } };
      }
      rows.push({ id: idKe++, ...v });
      return { error: null };
    };
    b.then = (res: (v: unknown) => unknown) => {
      const hits = rows.filter((r) => loc.every((f) => f(r)));
      if (thaoTac === 'update') for (const r of hits) Object.assign(r, du);
      if (thaoTac === 'delete') for (const r of hits) rows.splice(rows.indexOf(r), 1);
      return Promise.resolve({ data: thaoTac === 'select' ? hits : null, error: null }).then(res);
    };
    return b;
  };
  const sb = { from: (table: string) => builder(table === 'competitions' ? cuocThi : bang) } as unknown as SupabaseClient;
  return { sb, bang };
}

/** Dòng odds-only y như prod 27/8/2026: odds-api ghi "Celta Vigo"/"Osasuna" trùng khít
 *  tên livescore, nên lượt chỉ-livescore chèn thêm là vỡ unique. */
const dongOdds = {
  competition_id: 'laliga-2026', home_team: 'Celta Vigo', away_team: 'Osasuna', kickoff_utc: '2026-08-27T18:30:00Z',
  odds_api_event_id: 555, livescore_match_id: null, confidence: 'odds-only', slug: 'celta-vigo-vs-osasuna-2026-08-27',
};
const hangLs: Hang = { ...dongOdds, odds_api_event_id: null, livescore_match_id: '999', confidence: 'ls-only' };

describe('ghiMapping — gộp theo khoá tự nhiên khi tên+giờ đã có (duplicate key 27/8/2026 15:41Z)', () => {
  it('ls-only gặp dòng odds-only cùng tên cùng giờ → không chèn, dòng cũ nhận mã tỷ số, confidence auto, vẫn 1 dòng', async () => {
    const { sb, bang } = giaLapSb([dongOdds]);
    const { error } = await ghiMapping(sb, hangLs);
    expect(error).toBeNull();
    expect(bang).toHaveLength(1);
    expect(bang[0]).toMatchObject({ odds_api_event_id: 555, livescore_match_id: '999', confidence: 'auto' });
  });

  it('odds gặp dòng ls-only cùng tên cùng giờ → dòng cũ nhận mã kèo, giữ mã tỷ số, confidence auto', async () => {
    const { sb, bang } = giaLapSb([{ ...dongOdds, odds_api_event_id: null, livescore_match_id: '999', confidence: 'ls-only' }]);
    const { error } = await ghiMapping(sb, dongOdds);
    expect(error).toBeNull();
    expect(bang).toHaveLength(1);
    expect(bang[0]).toMatchObject({ odds_api_event_id: 555, livescore_match_id: '999', confidence: 'auto' });
  });

  it('trận khác hẳn → vẫn chèn dòng mới', async () => {
    const { sb, bang } = giaLapSb([dongOdds]);
    const { error } = await ghiMapping(sb, {
      ...hangLs, home_team: 'Tijuana', away_team: 'Pumas', kickoff_utc: '2026-08-29T03:10:00Z',
      livescore_match_id: '777', slug: 'tijuana-vs-pumas-2026-08-29',
    });
    expect(error).toBeNull();
    expect(bang).toHaveLength(2);
  });

  it('lượt ls-only kế tiếp (odds-api vẫn 429) tìm theo mã tỷ số, giờ nhích vẫn 1 dòng và KHÔNG xoá mã kèo đã gộp', async () => {
    const { sb, bang } = giaLapSb([{ ...dongOdds, livescore_match_id: '999', confidence: 'auto' }]);
    const { error } = await ghiMapping(sb, { ...hangLs, kickoff_utc: '2026-08-27T18:40:00Z' });
    expect(error).toBeNull();
    expect(bang).toHaveLength(1);
    expect(bang[0]).toMatchObject({ kickoff_utc: '2026-08-27T18:40:00Z', odds_api_event_id: 555, livescore_match_id: '999', confidence: 'auto' });
  });
});

describe('runProviderMatcher — nhánh chỉ-livescore (odds-api 429 mọi khoá) không còn "ls-only upsert failed"', () => {
  it('hết WARN → job-tracker/dl-monitor hết báo; dòng Celta Vigo vs Osasuna có cả 2 mã', async () => {
    const { sb, bang } = giaLapSb([dongOdds], [{ id: 'laliga-2026', status: 'active', livescore_id: 1, odds_api_key: 'spain-laliga' }]);
    const fetch429 = (async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    vi.mocked(lsFetch).mockResolvedValue({
      json: async () => ({ success: true, data: { fixtures: [{ id: '999', fixture_id: '999', home_name: 'Celta Vigo', away_name: 'Osasuna', date: '2026-08-27', time: '18:30' }] } }),
    } as unknown as Response);
    await runProviderMatcher(sb, ['k1', 'k2'], 'ls-key', 'ls-secret', fetch429);
    expect(lsFetch).toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalledWith(expect.stringContaining('upsert failed'));
    expect(bang).toHaveLength(1);
    expect(bang[0]).toMatchObject({ odds_api_event_id: 555, livescore_match_id: '999', confidence: 'auto' });
  });
});
