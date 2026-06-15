import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { mockVoteCounts } from "@/lib/mock";
import { getServiceSupabase } from "@/lib/supabase-server";
import type { VoteCounts, VoteKind } from "@/lib/types";

/**
 * Crowd poll votes (decision #5, 11/6). All writes go through this server route
 * with the service role — pick_votes has no public insert policy, matching the
 * existing "writes are service-role only" convention in supabase/schema.sql.
 * Voter identity: anonymous uuid in an httpOnly `wp_voter` cookie (1 year).
 */

const KINDS: readonly VoteKind[] = ["follow", "fade", "skip"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ONE_YEAR_S = 60 * 60 * 24 * 365;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { pick_id, vote } = (body ?? {}) as { pick_id?: unknown; vote?: unknown };
  if (
    typeof pick_id !== "string" ||
    !UUID_RE.test(pick_id) ||
    !(KINDS as readonly unknown[]).includes(vote)
  ) {
    return Response.json(
      { error: "pick_id (uuid) and vote (follow|fade|skip) are required" },
      { status: 400 },
    );
  }
  const kind = vote as VoteKind;

  const cookieStore = await cookies();
  let voterId = cookieStore.get("wp_voter")?.value;
  if (!voterId || !UUID_RE.test(voterId)) voterId = randomUUID();
  cookieStore.set("wp_voter", voterId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_S,
    secure: process.env.NODE_ENV === "production",
  });

  const supabase = getServiceSupabase();
  if (!supabase) {
    // Mock mode (Supabase not configured): acknowledge without persistence so
    // local dev works — counts are the stable fakes plus this vote.
    const counts = mockVoteCounts(pick_id);
    counts[kind] += 1;
    return Response.json({ ok: true, mock: true, counts });
  }

  // Votes are only valid on published (not yet settled) picks.
  const { data: pick, error: pickError } = await supabase
    .from("picks")
    .select("status")
    .eq("id", pick_id)
    .maybeSingle();
  if (pickError) return Response.json({ error: pickError.message }, { status: 500 });
  if (!pick) return Response.json({ error: "pick not found" }, { status: 404 });
  if (pick.status !== "published") {
    return Response.json({ error: "voting is closed for this pick" }, { status: 409 });
  }

  // Upsert so a voter can change their mind (unique (pick_id, voter_id)).
  const { error: upsertError } = await supabase
    .from("pick_votes")
    .upsert({ pick_id, vote: kind, voter_id: voterId }, { onConflict: "pick_id,voter_id" });
  if (upsertError) return Response.json({ error: upsertError.message }, { status: 500 });

  const { data: rows, error: countError } = await supabase
    .from("pick_votes")
    .select("vote")
    .eq("pick_id", pick_id);
  if (countError) return Response.json({ error: countError.message }, { status: 500 });
  const counts: VoteCounts = { follow: 0, fade: 0, skip: 0 };
  for (const row of (rows ?? []) as { vote: VoteKind }[]) counts[row.vote] += 1;
  return Response.json({ ok: true, counts });
}
