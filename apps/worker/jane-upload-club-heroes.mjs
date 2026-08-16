import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// usage: node jane-upload-club-heroes.mjs <thư mục chứa club-*.jpg>
const dir = process.argv[2];
const files = readdirSync(dir).filter(f => f.startsWith('club-') && f.endsWith('.jpg'));

let ok = 0;
for (const f of files) {
  const { error } = await sb.storage
    .from('player-photos')
    .upload(f, readFileSync(join(dir, f)), { contentType: 'image/jpeg', upsert: true });
  if (error) { console.error('FAIL', f, error.message); continue; }
  const { data } = sb.storage.from('player-photos').getPublicUrl(f);
  const head = await fetch(data.publicUrl, { method: 'HEAD' });
  if (head.status !== 200) { console.error('FAIL HEAD', f, head.status); continue; }
  ok++;
  console.log('ok', f, data.publicUrl);
}
console.log(`\nupload xong ${ok}/${files.length}`);
