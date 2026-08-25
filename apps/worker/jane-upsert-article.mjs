import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Tên toà soạn lấy từ hằng số dùng chung, không gõ tay ở đây.
const BYLINES = JSON.parse(readFileSync(new URL('./src/data/byline.json', import.meta.url), 'utf8'));

// usage: node jane-upsert-article.mjs <bodyFile> <slug> <title> <status> [publishedAtISO]
const [bodyFile, slug, title, status, publishedAt] = process.argv.slice(2);
const body = readFileSync(bodyFile, 'utf8');

const row = {
  slug, kind: 'preview', tier: 'T2_marquee', league: 'Premier League',
  byline: BYLINES.desk, author_type: 'desk_ai', title, body, status,
};
if (status === 'published') row.published_at = publishedAt;

const { error } = await sb.from('analysis_articles').upsert(row, { onConflict: 'slug' });
if (error) { console.error('upsert failed:', error.message); process.exit(1); }
console.log(`upserted ${slug} status=${status} ${body.length} chars`);
