/**
 * Proxies team logos from odds-api.io, keeping the API key server-side.
 * Validates that `id` is numeric and caches for 24 hours.
 */

import { goiOdds } from "@/lib/odds-key";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;


  // Participant IDs are positive integers.
  if (!/^\d{1,20}$/.test(id)) {
    return new Response(null, { status: 400 });
  }

  try {
    const res = await goiOdds(`participants/${id}/logo`, { cache: "no-store" });
    if (!res) return new Response(null, { status: 503 });

    if (!res.ok) {
      return new Response(null, { status: 404 });
    }

    const contentType = res.headers.get("content-type") ?? "image/png";
    const body = await res.arrayBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
