// Gửi toàn bộ URL trong sitemap lên IndexNow (Bing/Yandex/Copilot...).
// Chạy: node apps/web/scripts/indexnow.mjs [--dry]
// Key công khai theo thiết kế, được phục vụ tại https://www.banhbong.net/<key>.txt
const HOST = "www.banhbong.net";
const KEY = "2a99a4a6b93bbefa14ed80c8b02e0ca6";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10000;

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

async function collect(url, seen = new Set(), depth = 0) {
  if (seen.has(url) || depth > 3) return [];
  seen.add(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const xml = await res.text();
  const found = locs(xml);
  if (!/<sitemapindex/i.test(xml)) return found;
  const nested = [];
  for (const child of found) nested.push(...(await collect(child, seen, depth + 1)));
  return nested;
}

const urls = [...new Set(await collect(SITEMAP))].filter((u) => new URL(u).host === HOST);
console.log(`Thu được ${urls.length} URL`);
if (process.argv.includes("--dry")) process.exit(0);

for (let i = 0; i < urls.length; i += BATCH) {
  const urlList = urls.slice(i, i + BATCH);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  console.log(`Lô ${i / BATCH + 1}: ${urlList.length} URL -> HTTP ${res.status}`);
}
