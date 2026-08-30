import { describe, expect, it, vi } from 'vitest';
import { dongWatchingChoNoPlay } from './noplay-article';
import { MemoryStore } from './store';

/** Nick 30/8: /api/noplay trả ok:true nhưng daily-board vẫn trống.
 *  Gốc rễ: đường sinh no-play KHÔNG đóng dòng watching, mà bảng đếm "Bỏ qua"
 *  lại đọc watching(status='expired'). Sáng 30/8 vá mỗi lệnh bot, quên endpoint API. */
const w = (home: string, away: string) => ({
  home_team: home, away_team: away, league: 'Premier League 2026-27',
  kickoff_utc: '2026-08-30T15:30:00.000Z', note: null, status: 'active' as const,
  pick_id: null, unified_fixture_id: null, author: 'scout' as const,
});
const np = (home: string, away: string, note: string | null = null) => ({
  homeTeam: home, awayTeam: away, league: 'Premier League 2026-27',
  reason: 'NO_EDGE', watching: null, verdict: null, note, author: 'scout',
} as never);

describe('dongWatchingChoNoPlay', () => {
  it('đóng dòng watching và ghi lý do — daily-board mới đếm được', async () => {
    const store = new MemoryStore();
    await store.insertWatching(w('Manchester United', 'Ipswich Town') as never);
    await dongWatchingChoNoPlay({ store }, np('Manchester United', 'Ipswich Town', 'No validated edge'));
    expect(await store.getActiveWatching()).toHaveLength(0);
  });

  it('khớp dù tên đội viết khác nhau giữa hai nguồn', async () => {
    const store = new MemoryStore();
    await store.insertWatching(w('Manchester United FC', 'Ipswich Town') as never);
    await dongWatchingChoNoPlay({ store }, np('Manchester United', 'Ipswich Town FC'));
    expect(await store.getActiveWatching()).toHaveLength(0);
  });

  it('KHÔNG ném lỗi khi không có dòng nào — pass trận ngoài watchlist là bình thường', async () => {
    const store = new MemoryStore();
    await expect(dongWatchingChoNoPlay({ store }, np('Real Madrid', 'Malaga'))).resolves.toBeUndefined();
  });

  it('kho hỏng cũng KHÔNG ném lỗi — không được chặn việc sinh bài', async () => {
    const store = new MemoryStore();
    vi.spyOn(store, 'expireWatchingByTeams').mockRejectedValueOnce(new Error('kho sập'));
    await expect(dongWatchingChoNoPlay({ store }, np('Chelsea', 'Brighton'))).resolves.toBeUndefined();
  });

  it('KHÔNG đụng dòng của trận khác', async () => {
    const store = new MemoryStore();
    await store.insertWatching(w('Manchester United', 'Ipswich Town') as never);
    await store.insertWatching(w('Monaco', 'Marseille') as never);
    await dongWatchingChoNoPlay({ store }, np('Manchester United', 'Ipswich Town'));
    const con = await store.getActiveWatching();
    expect(con).toHaveLength(1);
    expect(con[0].home_team).toBe('Monaco');
  });
});
