import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/**
 * On-demand cache busting (Nick 13/6: settled pick lagged ~10 min on the Board).
 * The worker POSTs here after /pick, settlement and /void so the Board/Archive/
 * Stats reflect pick lifecycle changes in seconds instead of waiting out the
 * 5-minute ISR + data-cache windows. Secret-gated; tags whitelist matches the
 * unstable_cache tags in lib/data.ts.
 */

const ALLOWED_TAGS = ["picks", "posts", "votes", "matches", "watching"] as const;

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const tags = (body as { tags?: unknown })?.tags;
  const requested = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : [];
  const valid = requested.filter((t) => (ALLOWED_TAGS as readonly string[]).includes(t));
  if (valid.length === 0) {
    return Response.json({ error: `tags required: ${ALLOWED_TAGS.join("|")}` }, { status: 400 });
  }
  // Next 16: the 2nd arg is required; 'max' = expire now, recompute on next request.
  for (const tag of valid) revalidateTag(tag, "max");
  return Response.json({ revalidated: valid });
}
