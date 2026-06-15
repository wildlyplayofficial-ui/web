import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRevalidator } from './revalidate';

const SITE = 'https://www.example.com';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createRevalidator', () => {
  it('no-ops without a secret (never calls fetch)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const revalidate = createRevalidator({ siteUrl: SITE, secret: undefined });
    await revalidate(['picks']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs tags with the secret header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const revalidate = createRevalidator({ siteUrl: SITE, secret: 's3cret' });
    await revalidate(['picks', 'posts']);
    expect(fetchMock).toHaveBeenCalledWith(`${SITE}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': 's3cret' },
      body: JSON.stringify({ tags: ['picks', 'posts'] }),
    });
  });

  it('swallows HTTP errors and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const revalidate = createRevalidator({ siteUrl: SITE, secret: 's' });
    await expect(revalidate(['picks'])).resolves.toBeUndefined();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(revalidate(['picks'])).resolves.toBeUndefined();
  });
});
