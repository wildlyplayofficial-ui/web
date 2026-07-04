import { describe, expect, it } from 'vitest';
import { MemoryStore, type NewPick, type NewPost, type NewWatching, type PickAuthor } from './store';

function watching(overrides: Partial<NewWatching> = {}): NewWatching {
  return {
    home_team: 'Mexico',
    away_team: 'South Africa',
    league: 'FIFA World Cup 2026 — Group A',
    kickoff_utc: '2026-06-11T19:00:00.000Z',
    note: 'Mexico dominant at home, visitors missing key players',
    status: 'active',
    pick_id: null,
    ...overrides,
  };
}

function pick(author: PickAuthor, status: NewPick['status'], overrides: Partial<NewPick> = {}): NewPick {
  return {
    fixture_id: 0,
    league: 'FIFA World Cup 2026 — Group A',
    kickoff_utc: '2026-06-11T19:00:00.000Z',
    home_team: 'Mexico',
    away_team: 'South Africa',
    market: 'ah',
    selection: 'Mexico -1.25',
    line: -1.25,
    odds_publish: 2.05,
    odds_close: null,
    publish_score_home: null,
    publish_score_away: null,
    home_id: null,
    away_id: null,
    stake_units: 1,
    thesis: 'test thesis',
    confidence: null,
    primary_edge: null,
    consensus_edge_pct: null,
    supporting_evidence: null,
    loss_type: null,
    postmortem_status: null,
    postmortem_draft: null,
    postmortem_approved: null,
    postmortem_at: null,
    market_side: null,
    favored_dog: null,
    status,
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
    author,
    ...overrides,
  };
}

function noPlayPost(author: PickAuthor, overrides: Partial<NewPost> = {}): NewPost {
  return {
    type: 'no-play',
    slug: `no-play-${Math.random()}`,
    lang: 'en',
    title: 'No Play',
    body_md: 'body',
    pick_ids: [],
    status: 'published',
    published_at: '2026-06-11T08:00:00.000Z',
    author,
    ...overrides,
  };
}

describe('MemoryStore.listByStatus — author firewall (§12.A item 1/2)', () => {
  it('with no author filter, returns picks from all authors', async () => {
    const store = new MemoryStore();
    await store.insertPick(pick('curator', 'won'));
    await store.insertPick(pick('scout', 'won'));
    const all = await store.listByStatus(['won']);
    expect(all).toHaveLength(2);
  });

  it('filters strictly by author — no blended record', async () => {
    const store = new MemoryStore();
    await store.insertPick(pick('curator', 'won'));
    await store.insertPick(pick('curator', 'lost'));
    await store.insertPick(pick('scout', 'won'));

    const curatorRecord = await store.listByStatus(['won', 'lost'], 'curator');
    const scoutRecord = await store.listByStatus(['won', 'lost'], 'scout');

    expect(curatorRecord).toHaveLength(2);
    expect(scoutRecord).toHaveLength(1);
    expect(scoutRecord.every((p) => p.author === 'scout')).toBe(true);
  });

  it('item 6: a push/void under one author never leaks into another author\'s settled counts', async () => {
    const store = new MemoryStore();
    await store.insertPick(pick('curator', 'push'));
    await store.insertPick(pick('scout', 'void'));

    const curatorSettled = await store.listByStatus(['won', 'lost', 'push'], 'curator');
    const scoutSettled = await store.listByStatus(['won', 'lost', 'push'], 'scout');

    // curator's push is counted, scout's void is excluded from won/lost/push entirely
    expect(curatorSettled).toHaveLength(1);
    expect(curatorSettled[0].status).toBe('push');
    expect(scoutSettled).toHaveLength(0);
  });
});

describe('MemoryStore.countNoPlayByAuthor (§12.A item 3)', () => {
  it('counts no-play posts per author, en-only, without blending', async () => {
    const store = new MemoryStore();
    await store.insertPost(noPlayPost('curator'));
    await store.insertPost(noPlayPost('curator'));
    await store.insertPost(noPlayPost('scout'));
    await store.insertPost(noPlayPost('curator', { lang: 'vi' })); // non-en, should not count

    expect(await store.countNoPlayByAuthor('curator')).toBe(2);
    expect(await store.countNoPlayByAuthor('scout')).toBe(1);
  });
});

describe('MemoryStore.expireWatching — closing note (Nick 4/7 item ①)', () => {
  it('expires without a note by default', async () => {
    const store = new MemoryStore();
    const row = await store.insertWatching(watching());

    const expired = await store.expireWatching(row.id);

    expect(expired.status).toBe('expired');
    expect(expired.close_note).toBeNull();
  });

  it('sets close_note when provided', async () => {
    const store = new MemoryStore();
    const row = await store.insertWatching(watching());

    const expired = await store.expireWatching(row.id, 'Might, not is — turned out: not.');

    expect(expired.status).toBe('expired');
    expect(expired.close_note).toBe('Might, not is — turned out: not.');
  });
});
