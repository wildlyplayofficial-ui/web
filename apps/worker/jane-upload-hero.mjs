import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// usage: node jane-upload-hero.mjs <localFile> <storageName> <articleSlug>
const [file, name, slug] = process.argv.slice(2);
const bytes = readFileSync(file);

const { error: upErr } = await sb.storage
  .from('player-photos')
  .upload(name, bytes, { contentType: name.endsWith('.png') ? 'image/png' : 'image/jpeg', upsert: true });
if (upErr) { console.error('upload:', upErr.message); process.exit(1); }

const { data: pub } = sb.storage.from('player-photos').getPublicUrl(name);
const url = pub.publicUrl;
const head = await fetch(url, { method: 'HEAD' });
console.log('hero URL:', url, 'HEAD', head.status);
if (head.status !== 200) process.exit(1);

const { error } = await sb.from('analysis_articles').update({ hero_image: url }).eq('slug', slug);
if (error) { console.error('update:', error.message); process.exit(1); }
console.log('hero set on', slug);

const res = await fetch(`${process.env.SITE_URL || 'https://www.wildlyplay.com'}/api/revalidate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
  body: JSON.stringify({ tags: ['posts'] }),
});
console.log('revalidate:', res.status, await res.text());
