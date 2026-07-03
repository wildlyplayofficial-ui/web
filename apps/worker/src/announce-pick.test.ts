import { afterEach, describe, expect, it, vi } from 'vitest';
import { announcePick, announceVoid, formatPickMessage, formatVoidMessage, postToFacebook, type AnnouncePickDeps } from './announce-pick';
import { MemoryStore, type NewPick } from './store';

function publishedPick(overrides: Partial<NewPick> = {}): NewPick {
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
    status: 'published',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
    confidence: null,
    primary_edge: null,
    supporting_evidence: null,
    loss_type: null,
    postmortem_status: null,
    postmortem_draft: null,
    postmortem_approved: null,
    postmortem_at: null,
    market_side: null,
    favored_dog: null,
    ...overrides,
  };
}

function fakeApi() {
  let nextId = 100;
  return { sendMessage: vi.fn(async () => ({ message_id: nextId++ })) };
}

const CHANNEL = '-100123';
const SITE = 'https://beta.wildlyplay.com';
const FB = { pageId: '111', pageToken: 'tok' };

afterEach(() => vi.unstubAllGlobals());

describe('formatPickMessage — 3-second card (Post Restructure v1 §2.1)', () => {
  it('includes matchup, KO in UTC, pick block, play link and disclosure — no thesis dump', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const msg = formatPickMessage(pick, SITE);
    expect(msg).toContain('\u{1F3AF} PICK \u2014 Mexico vs South Africa \u00b7 FIFA World Cup 2026 \u2014 Group A');
    expect(msg).toContain('\u23F0 KO 19:00 UTC');
    expect(msg).toContain('\u{1F449} Mexico -1.25 -1.25 @ 2.05 \u00b7 1u');
    expect(msg).toContain(`${SITE}/play/${pick.id}`);
    expect(msg).toContain('Human-picked \u00b7 Odds at publish \u00b7 Not financial advice');
    expect(msg).not.toContain('test thesis'); // R2: card is scannable, thesis lives on the play page
    expect(msg).not.toContain('sure win');
    expect(msg).not.toContain('live @');
    expect(msg).not.toContain('Confidence:'); // none registered on this pick
  });

  it('marks a running pick with the score at entry', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ publish_score_home: 1, publish_score_away: 0 }));
    const msg = formatPickMessage(pick, SITE);
    expect(msg).toContain('\u23F0 KO 19:00 UTC (live @ 1-0)');
  });

  it('shows the confidence line with the against-the-market cue (R3)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ confidence: 'high' }));
    expect(formatPickMessage(pick, SITE)).toContain('\u{1F39A} Confidence: HIGH');
    expect(formatPickMessage(pick, SITE, { againstMarket: true }))
      .toContain('\u{1F39A} Confidence: HIGH \u00b7 \u26A0\uFE0F against the market');
  });

  it('renders the hand-written hook untouched and omits the line when absent (R5)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const hook = 'Swiss press suffocates deep blocks — market slept on it.';
    expect(formatPickMessage(pick, SITE, { hook })).toContain(`\u{1F4DD} ${hook}`);
    expect(formatPickMessage(pick, SITE)).not.toContain('\u{1F4DD}');
  });
});

describe('formatVoidMessage', () => {
  it('says the play was voided before kickoff and does not count', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ status: 'void' }));
    const msg = formatVoidMessage(pick, SITE);
    expect(msg).toContain('PLAY VOIDED');
    expect(msg).toContain('Mexico vs South Africa');
    expect(msg).toContain('Mexico -1.25 @ 2.05 — voided before kickoff.');
    expect(msg).toContain('Does not count toward the record.');
    expect(msg).toContain(`${SITE}/play/${pick.id}`);
  });
});

describe('announceVoid', () => {
  it('posts the void notice to channel + FB with detail "void announce"', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ status: 'void' }));
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_444' }), { status: 200 })));

    await announceVoid({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, formatVoidMessage(pick, SITE));
    expect(store.logs).toHaveLength(2);
    expect(store.logs[0]).toMatchObject({ pick_id: pick.id, channel: 'telegram', ok: true, detail: 'void announce' });
    expect(store.logs[1]).toMatchObject({ pick_id: pick.id, channel: 'facebook', external_id: '111_444', ok: true, detail: 'void announce' });
  });

  it('never throws when both channel and FB fail', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ status: 'void' }));
    const api = { sendMessage: vi.fn(async () => { throw new Error('tg down'); }) };
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    await announceVoid({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs).toHaveLength(0);
  });
});

describe('postToFacebook', () => {
  it('posts to the page feed and returns the post id', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const id = await postToFacebook(FB, 'hello', `${SITE}/play/x`);
    expect(id).toBe('111_222');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v19.0/111/feed');
    expect(JSON.parse(String(init.body))).toMatchObject({ message: 'hello', link: `${SITE}/play/x`, access_token: 'tok' });
  });

  it('throws on a Graph API error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'bad token' } }), { status: 400 })));
    await expect(postToFacebook(FB, 'hello', 'link')).rejects.toThrow('bad token');
  });
});

describe('announcePick', () => {
  it('posts to the channel + FB and logs both in channel_log', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 })));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, formatPickMessage(pick, SITE));
    expect(store.logs).toHaveLength(2);
    expect(store.logs[0]).toMatchObject({ pick_id: pick.id, channel: 'telegram', external_id: '100', ok: true, detail: 'pick announce' });
    expect(store.logs[1]).toMatchObject({ pick_id: pick.id, channel: 'facebook', external_id: '111_222', ok: true, detail: 'pick announce' });
  });

  it('skips the channel when CHANNEL_CHAT_ID is unset and FB when not configured', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: undefined, store, siteUrl: SITE }, pick);

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.logs).toHaveLength(0);
  });

  it('still posts to FB when the channel send fails, and never throws', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = { sendMessage: vi.fn(async () => { throw new Error('tg down'); }) };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_333' }), { status: 200 })));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({ channel: 'facebook', external_id: '111_333' });
  });

  it('does not throw when FB posting fails after a successful channel post', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({ channel: 'telegram' });
  });
});
