import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/** Bài tin đăng xong phải lên Facebook: một bài trên bảng tin + một Story
 *  (Peter chốt 25/8). Và Facebook hỏng thì TIN VẪN PHẢI LÊN WEB. */
const goi: Array<{ duong: string; body: Record<string, unknown> }> = [];
let hongO: string | null = null;

beforeEach(() => {
  goi.length = 0;
  hongO = null;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const duong = String(url);
    goi.push({ duong, body: JSON.parse(String(init?.body ?? '{}')) });
    if (hongO && duong.includes(hongO)) {
      return { ok: false, status: 500, json: async () => ({ error: { message: 'hỏng' } }) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ id: 'anh1', post_id: 'story1' }) } as Response;
  }));
});
afterEach(() => vi.unstubAllGlobals());

const FB = { pageId: 'trang1', pageToken: 'khoa1' };

async function dang() {
  const { postPhotoToFacebook, postFacebookStory } = await import('./announce');
  const anh = 'https://banhbong.net/api/og/news/abc?locale=vi';
  await postPhotoToFacebook(FB, anh, 'Tiêu đề\n\nhttps://banhbong.net/news/abc');
  await postFacebookStory(FB, anh);
}

describe('tin tức lên Facebook', () => {
  it('đăng bài trên bảng tin RỒI đăng Story cùng ảnh đó', async () => {
    await dang();
    const duong = goi.map((g) => g.duong);
    expect(duong.some((d) => d.includes('/trang1/photos'))).toBe(true);
    expect(duong.some((d) => d.includes('/trang1/photo_stories'))).toBe(true);
    // Story phải dùng ĐÚNG ảnh vừa upload, không phải ảnh khác
    const story = goi.find((g) => g.duong.includes('photo_stories'))!;
    expect(story.body.photo_id).toBe('anh1');
  });

  it('bài có kèm link tới trang tin, không chỉ mỗi tiêu đề', async () => {
    await dang();
    const bai = goi.find((g) => g.duong.includes('/photos'))!;
    expect(String(bai.body.caption)).toContain('/news/abc');
  });

  it('Story hỏng thì ném lỗi để chỗ gọi nuốt — bài trên bảng tin vẫn sống', async () => {
    hongO = 'photo_stories';
    const { postPhotoToFacebook, postFacebookStory } = await import('./announce');
    const anh = 'https://banhbong.net/api/og/news/abc?locale=vi';
    await expect(postPhotoToFacebook(FB, anh, 'x')).resolves.toBeTruthy();
    await expect(postFacebookStory(FB, anh)).rejects.toThrow();
  });
});
