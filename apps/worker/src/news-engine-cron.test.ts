import { describe, expect, it } from 'vitest';
import { newsTickDue } from './news-engine-cron';

describe('newsTickDue', () => {
  it('fires morning at 22:00 UTC (05:00 VN)', () => {
    expect(newsTickDue(new Date('2026-08-21T22:05:00Z'), null)).toEqual({
      key: '2026-08-21:morning',
      mode: 'morning',
    });
  });

  it('fires evening at 10:00 UTC (17:00 VN)', () => {
    expect(newsTickDue(new Date('2026-08-21T10:30:00Z'), null)).toEqual({
      key: '2026-08-21:evening',
      mode: 'evening',
    });
  });

  it('dedupes within the same window', () => {
    expect(newsTickDue(new Date('2026-08-21T22:59:00Z'), '2026-08-21:morning')).toBeNull();
  });

  it('stays quiet outside both windows', () => {
    expect(newsTickDue(new Date('2026-08-21T15:00:00Z'), null)).toBeNull();
  });

  it('morning and evening dedupe independently', () => {
    expect(newsTickDue(new Date('2026-08-21T10:00:00Z'), '2026-08-21:morning')).toEqual({
      key: '2026-08-21:evening',
      mode: 'evening',
    });
  });
});
