import { getServiceSupabase } from "@/lib/supabase-server";
import { revalidateTag } from "next/cache";

/**
 * DELETE /api/admin/delete-post?slug=analysis-tunisia-vs-japan-2026-06-21
 * Protected by REVALIDATE_SECRET header.
 */
export async function DELETE(request: Request): Promise<Response> {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return Response.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("slug", slug)
    .select("id, slug");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("posts", "max");

  return Response.json({ deleted: data });
}
