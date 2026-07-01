/**
 * POST /api/admin/seed-guides
 * One-off endpoint to seed calculator guide articles.
 * Auth: SEED_GUIDES_TOKEN env var (set + remove after use).
 * DELETE THIS FILE AFTER USE.
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const token = process.env.SEED_GUIDES_TOKEN;
  if (!token) return NextResponse.json({ error: "Endpoint disabled" }, { status: 403 });
  const given = req.headers.get("x-seed-token");
  if (given !== token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = await req.json() as Array<{
    title: string;
    slug: string;
    lang: string;
    body_md: string;
    meta_description: string;
    target_keyword: string;
  }>;

  const rows = body.map((g) => ({
    title: g.title,
    slug: g.slug,
    lang: g.lang,
    type: "guide" as const,
    body_md: g.body_md,
    status: "published" as const,
    published_at: new Date().toISOString(),
    pick_ids: [],
    meta_description: g.meta_description,
    target_keyword: g.target_keyword,
  }));

  const { data, error } = await sb.from("posts").insert(rows).select("id, slug, lang");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data.length, posts: data });
}
