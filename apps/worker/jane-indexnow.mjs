const site = process.env.SITE_URL || 'https://www.banhbong.net';
const urls = process.argv.slice(2);
const r = await fetch(`${site}/api/indexnow`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
  body: JSON.stringify({ urls }),
});
console.log('indexnow', r.status, (await r.text()).slice(0, 300));
