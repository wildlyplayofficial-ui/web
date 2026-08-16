import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const [bodyFile, slug] = process.argv.slice(2);
const body = readFileSync(bodyFile, 'utf8');

const { error } = await sb.from('analysis_articles').update({ body }).eq('slug', slug);
if (error) { console.error('update failed:', error.message); process.exit(1); }
console.log('updated body', slug, body.length, 'chars');

const res = await fetch(`${process.env.SITE_URL || 'https://www.wildlyplay.com'}/api/revalidate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
  body: JSON.stringify({ tags: ['posts'] }),
});
console.log('revalidate:', res.status, await res.text());
