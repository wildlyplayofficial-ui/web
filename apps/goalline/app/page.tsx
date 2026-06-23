import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { S } from "@/lib/strings";
import type {
  DailyCard,
  CardMatch,
  UserPick,
  CardViewState,
} from "@/lib/types";
import { CardOpenUnpicked, CardOpenPicked } from "./components/card-open";
import { CardLive, CardSettled, CardVoided } from "./components/card-result";

export const revalidate = 60;

// ── Data fetching ──────────────────────────────────────────────────────────

interface CardData {
  card: DailyCard | null;
  matches: CardMatch[];
  pick: UserPick | null;
  communitySplit: { over: number; under: number } | null;
}

async function getTodayCardData(): Promise<CardData> {
  const supabase = getSupabase();
  if (!supabase) return { card: null, matches: [], pick: null, communitySplit: null };

  const today = new Date().toISOString().slice(0, 10);
  const { data: card } = await supabase
    .from("gl_daily_cards")
    .select("*")
    .eq("utc_date", today)
    .in("status", ["open", "locked", "live", "settled", "voided"])
    .order("card_number", { ascending: false })
    .limit(1)
    .single();

  if (!card) return { card: null, matches: [], pick: null, communitySplit: null };

  // Fetch linked matches via junction
  const { data: junctions } = await supabase
    .from("gl_daily_card_matches")
    .select("match_id, sort_order")
    .eq("daily_card_id", card.id)
    .order("sort_order");

  let matches: CardMatch[] = [];
  if (junctions && junctions.length > 0) {
    const matchIds = junctions.map((j: { match_id: string }) => j.match_id);
    const { data: matchRows } = await supabase
      .from("gl_matches")
      .select("id, external_match_id, home_team, away_team, kickoff_time_utc, status, home_score, away_score, valid_goals")
      .in("id", matchIds);

    if (matchRows) {
      matches = matchRows.map((m: Record<string, unknown>) => {
        const junction = junctions.find((j: { match_id: string }) => j.match_id === m.id);
        return { ...m, sort_order: junction?.sort_order ?? 0 } as CardMatch;
      });
    }
  }

  // Try to get user's pick (from cookie device-id)
  let pick: UserPick | null = null;
  const cookieStore = await cookies();
  const deviceId = cookieStore.get("gl_device_id")?.value;
  if (deviceId) {
    const { data: pickRow } = await supabase
      .from("gl_picks")
      .select("id, side, odds_locked, stake_points, status, net_profit, participation_bonus, points_added")
      .eq("daily_card_id", card.id)
      .eq("user_id", deviceId)
      .single();

    if (pickRow) pick = pickRow as UserPick;
  }

  // Community split — only after user has picked (spec §10)
  let communitySplit: { over: number; under: number } | null = null;
  if (pick) {
    const { count: overCount } = await supabase
      .from("gl_picks")
      .select("id", { count: "exact", head: true })
      .eq("daily_card_id", card.id)
      .eq("side", "over");

    const { count: underCount } = await supabase
      .from("gl_picks")
      .select("id", { count: "exact", head: true })
      .eq("daily_card_id", card.id)
      .eq("side", "under");

    const total = (overCount ?? 0) + (underCount ?? 0);
    if (total > 0) {
      communitySplit = {
        over: Math.round(((overCount ?? 0) / total) * 100),
        under: Math.round(((underCount ?? 0) / total) * 100),
      };
    }
  }

  return { card: card as DailyCard, matches, pick, communitySplit };
}

// ── State machine ──────────────────────────────────────────────────────────

function deriveViewState(
  card: DailyCard | null,
  pick: UserPick | null,
): CardViewState {
  if (!card) return "no_card";
  switch (card.status) {
    case "open":
      return pick ? "open_picked" : "open_unpicked";
    case "locked":
      return "locked";
    case "live":
      return "live";
    case "settled":
      return "settled";
    case "voided":
      return "voided";
    default:
      return "no_card";
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function TodaysCardPage() {
  const { card, matches, pick, communitySplit } = await getTodayCardData();
  const viewState = deriveViewState(card, pick);

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      {/* Card header */}
      {card && (
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            {S.CARD_LABEL} #{card.card_number} &middot; {card.utc_date}
          </p>
        </header>
      )}

      {/* State machine render */}
      {viewState === "no_card" && <NoCard />}
      {viewState === "open_unpicked" && card && (
        <CardOpenUnpicked card={card} matches={matches} />
      )}
      {viewState === "open_picked" && card && pick && (
        <CardOpenPicked
          card={card}
          matches={matches}
          pick={pick}
          communitySplit={communitySplit}
        />
      )}
      {viewState === "locked" && card && (
        <CardOpenPicked
          card={card}
          matches={matches}
          pick={pick ?? { id: "", side: "over", odds_locked: 0, stake_points: 0, status: "locked", net_profit: null, participation_bonus: null, points_added: null }}
          communitySplit={communitySplit}
        />
      )}
      {viewState === "live" && card && (
        <CardLive card={card} matches={matches} pick={pick} />
      )}
      {viewState === "settled" && card && (
        <CardSettled card={card} matches={matches} pick={pick} />
      )}
      {viewState === "voided" && card && <CardVoided card={card} />}
    </div>
  );
}

function NoCard() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink">
          {S.NO_CARD_TITLE}
        </h1>
        <p className="mt-3 text-muted">{S.NO_CARD_BODY}</p>
      </div>
    </div>
  );
}
