import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/goalline/supabase";
import { S } from "@/lib/goalline/strings";
import type { DailyCard, CardMatch } from "@/lib/goalline/types";
import { AdminCreateForm } from "./admin-create-form";
import { AdminCardRow } from "./admin-card-row";

export const metadata: Metadata = {
  title: S.ADMIN_TITLE,
};

export const dynamic = "force-dynamic";

interface AdminCard extends DailyCard {
  matches: CardMatch[];
}

async function getCards(): Promise<AdminCard[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("gl_daily_cards")
    .select("id, card_number, utc_date, goal_line, over_odds, under_odds, cutoff_time_utc, status, method_note, settlement_result, void_reason")
    .order("card_number", { ascending: false })
    .limit(20);

  const cards = (data as DailyCard[]) ?? [];

  const result: AdminCard[] = [];
  for (const card of cards) {
    const { data: junctions } = await supabase
      .from("gl_daily_card_matches")
      .select("match_id, sort_order")
      .eq("daily_card_id", card.id)
      .order("sort_order", { ascending: true });

    if (!junctions?.length) {
      result.push({ ...card, matches: [] });
      continue;
    }

    const matchIds = (junctions as { match_id: string; sort_order: number }[]).map((j) => j.match_id);
    const { data: matches } = await supabase
      .from("gl_matches")
      .select("id, external_match_id, home_team, away_team, kickoff_time_utc, status, home_score, away_score, valid_goals")
      .in("id", matchIds);

    const sortMap = new Map((junctions as { match_id: string; sort_order: number }[]).map((j) => [j.match_id, j.sort_order]));
    const sorted = ((matches ?? []) as CardMatch[])
      .map((m) => ({ ...m, sort_order: sortMap.get(m.id) ?? 0 }))
      .sort((a, b) => a.sort_order - b.sort_order);

    result.push({ ...card, matches: sorted });
  }

  return result;
}

export default async function AdminPage() {
  await requireAdmin();
  const cards = await getCards();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        {S.ADMIN_TITLE}
      </h1>

      {/* Create card form */}
      <section className="mt-6">
        <h2 className="text-lg font-bold text-ink">{S.CREATE_CARD}</h2>
        <AdminCreateForm />
      </section>

      {/* Existing cards list */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">{S.EXISTING_CARDS}</h2>
        {cards.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No cards yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {cards.map((card) => (
              <AdminCardRow key={card.id} card={card} matches={card.matches} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
