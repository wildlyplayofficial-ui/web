import { describe, it, expect, vi } from 'vitest';
import { buildArticleCaption, buildArticleLink, announceArticle } from './announce-article';
import type { NewPost } from './store';
import { MemoryStore } from './store';

const SITE = 'https://www.wildlyplay.com';

const mockPost: NewPost = {
  type: 'preview',
  slug: 'preview-mexico-vs-south-africa',
  lang: 'en',
  title: 'Preview: Mexico vs South Africa',
  body_md: 'Mexico face South Africa in the **opening match** of the World Cup. The Curator picked Mexico -1.25 at 2.05 odds.',
  pick_ids: ['abc-123'],
  status: 'published',
  published_at: new Date().toISOString(),
};

describe('buildArticleCaption', () => {
  it('builds TG caption with link and correct UTM', () => {
    const caption = buildArticleCaption(mockPost, SITE, 'telegram');
    expect(caption).toContain('Preview: Mexico vs South Africa');
    expect(caption).toContain('utm_source=telegram');
    expect(caption).toContain('utm_medium=social');
    expect(caption).toContain('utm_campaign=newsroom');
    expect(caption).toContain('/news/preview-mexico-vs-south-africa');
  });

  it('builds FB caption WITHOUT link (link passed separately)', () => {
    const caption = buildArticleCaption(mockPost, SITE, 'facebook', false);
    expect(caption).not.toContain('http');
    expect(caption).not.toContain('utm_source');
    expect(caption).toContain('Preview: Mexico vs South Africa');
  });

  it('strips markdown from body excerpt', () => {
    const caption = buildArticleCaption(mockPost, SITE, 'telegram');
    expect(caption).not.toContain('**');
    expect(caption).toContain('opening match');
  });

  it('truncates at word boundary, not mid-word', () => {
    // "abcdefghij " repeated = 11 chars per repeat. At 200 char limit, naive slice would cut mid-word.
    const longPost: NewPost = {
      ...mockPost,
      body_md: 'abcdefghij '.repeat(30), // 330 chars
    };
    const caption = buildArticleCaption(longPost, SITE, 'telegram');
    const lines = caption.split('\n');
    const excerptLine = lines[2];
    expect(excerptLine.length).toBeLessThanOrEqual(200);
    expect(excerptLine).toContain('...');
    // Should end with "abcdefghij..." (full word + ellipsis), not "abcde..." (mid-word)
    expect(excerptLine).toMatch(/abcdefghij\.\.\.$/);
  });

  it('uses correct emoji per article type', () => {
    const recap: NewPost = { ...mockPost, type: 'recap' };
    const news: NewPost = { ...mockPost, type: 'news' };
    const analysis: NewPost = { ...mockPost, type: 'analysis' };

    expect(buildArticleCaption(mockPost, SITE, 'telegram')).toMatch(/\u{1F4CB}/u);
    expect(buildArticleCaption(recap, SITE, 'telegram')).toMatch(/\u{1F4DD}/u);
    expect(buildArticleCaption(news, SITE, 'telegram')).toMatch(/\u{1F441}/u);
    expect(buildArticleCaption(analysis, SITE, 'telegram')).toMatch(/\u{1F4CA}/u);
  });
});

describe('buildArticleLink', () => {
  it('builds correct UTM link', () => {
    const link = buildArticleLink(SITE, 'preview-mexico-vs-south-africa', 'facebook');
    expect(link).toBe('https://www.wildlyplay.com/news/preview-mexico-vs-south-africa?utm_source=facebook&utm_medium=social&utm_campaign=newsroom');
  });
});

describe('announceArticle', () => {
  it('never throws even when TG + FB both fail', async () => {
    const deps = {
      api: { sendMessage: vi.fn().mockRejectedValue(new Error('TG down')) },
      channelChatId: '-100123',
      store: new MemoryStore(),
      siteUrl: SITE,
      facebook: { pageId: '123', pageToken: 'tok' },
    };
    // Mock fetch for FB (postToFacebook uses global fetch)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('FB down'));
    try {
      await expect(announceArticle(deps, mockPost)).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('posts to TG channel when channelChatId is set', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 42 });
    const store = new MemoryStore();
    const deps = {
      api: { sendMessage },
      channelChatId: '-100123',
      store,
      siteUrl: SITE,
    };
    await announceArticle(deps, mockPost);
    expect(sendMessage).toHaveBeenCalledOnce();
    const caption = sendMessage.mock.calls[0][1] as string;
    expect(caption).toContain('utm_source=telegram');
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0].channel).toBe('telegram');
  });

  it('skips TG when channelChatId is undefined', async () => {
    const sendMessage = vi.fn();
    const deps = {
      api: { sendMessage },
      channelChatId: undefined,
      store: new MemoryStore(),
      siteUrl: SITE,
    };
    await announceArticle(deps, mockPost);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
