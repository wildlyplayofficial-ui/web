/**
 * POST /api/indexnow — Ping IndexNow (Bing/Yandex) for freshly published URLs.
 * Called by worker after settle/publish. Protected by REVALIDATE_SECRET.
 * Free, instant indexing for news/recap articles.
 */

const INDEXNOW_KEY = "4c6e15b396a148b29b0e69e5abaf2835";
const HOST = "www.wildlyplay.com";

export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { urls } = (await request.json()) as { urls?: string[] };
  if (!urls || urls.length === 0) {
    return Response.json({ error: "No URLs provided" }, { status: 400 });
  }

  // IndexNow batch API (up to 10,000 URLs)
  const body = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls.map((u) => (u.startsWith("http") ? u : `https://${HOST}${u}`)),
  });

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
    });

    return Response.json({
      ok: res.ok,
      status: res.status,
      submitted: urls.length,
    });
  } catch {
    return Response.json({ error: "IndexNow request failed" }, { status: 502 });
  }
}
