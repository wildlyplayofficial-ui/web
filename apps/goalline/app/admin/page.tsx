import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { S } from "@/lib/strings";
import type { DailyCard } from "@/lib/types";
import { AdminCreateForm } from "./admin-create-form";
import { AdminCardRow } from "./admin-card-row";

export const metadata: Metadata = {
  title: S.ADMIN_TITLE,
};

export const dynamic = "force-dynamic";

async function getCards(): Promise<DailyCard[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("gl_daily_cards")
    .select("id, card_number, utc_date, goal_line, over_odds, under_odds, cutoff_time_utc, status, method_note, settlement_result, void_reason")
    .order("card_number", { ascending: false })
    .limit(20);

  return (data as DailyCard[]) ?? [];
}

export default async function AdminPage() {
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
              <AdminCardRow key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
