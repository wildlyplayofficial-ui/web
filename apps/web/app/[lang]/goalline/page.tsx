import { cookies } from "next/headers";
import { TrackPageView } from "@/components/track-event";
import { getSupabase } from "@/lib/goalline/supabase";
import { getDailyLineDict } from "@/lib/goalline/strings";
import { resolveLang } from "@/lib/i18n";
import type {
  DailyCard,
  CardMatch,
  UserPick,
  CardViewState,
} from "@/lib/goalline/types";
import { Suspense, lazy } from "react";
import { CardOpenUnpicked, CardOpenPicked } from "./components/card-open";
import { CardLive, CardSettled, CardVoided } from "./components/card-result";
import { LiveScoreSync } from "./components/live-score-sync";
import { StickyTracker } from "./components/sticky-tracker";

import { HowItWorks } from "./components/how-it-works"; // above-fold — eager load
import { buildFAQPage } from "@/lib/jsonld";

// Lazy-load below-fold client components
const EngagementBar = lazy(() => import("./components/engagement-bar").then((m) => ({ default: m.EngagementBar })));
const PickToast = lazy(() => import("./components/pick-toast").then((m) => ({ default: m.PickToast })));

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

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  // Show card up to 24h early. Prefer OPEN card (pickable) over locked/settled.
  // If Card #1 locked and Card #2 open → show Card #2.
  const { data: openCard } = await supabase
    .from("gl_daily_cards")
    .select("*")
    .in("utc_date", [today, tomorrow])
    .eq("status", "open")
    .order("utc_date", { ascending: true })
    .limit(1)
    .single();

  const card = openCard ?? (await supabase
    .from("gl_daily_cards")
    .select("*")
    .in("utc_date", [today, tomorrow])
    .in("status", ["locked", "live", "settled", "voided"])
    .order("utc_date", { ascending: false })
    .limit(1)
    .single()).data;

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

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TodaysCardPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const S = getDailyLineDict(lang);
  const { card, matches, pick, communitySplit } = await getTodayCardData();
  const viewState = deriveViewState(card, pick);

  const totalGoals = matches.reduce((sum, m) => sum + (m.valid_goals ?? 0), 0);

  return (
    <div className="mx-auto max-w-lg px-5 py-8 overflow-x-hidden">
      <TrackPageView event="daily_line_view" />
      {/* FAQ schema — static hardcoded content only (safe, no user input) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFAQPage([
            { question: "What is the Daily Line?", answer: "A daily Over/Under prediction game on aggregate football goals. Pick Over or Under the combined goal line, compete on the leaderboard, and climb the streak counter. Free to play, entertainment only." },
            { question: "How does it work?", answer: "Each day, 3 World Cup matches are combined with a goal line (e.g. 7.5). You pick Over or Under before the cutoff time. If total goals exceed the line, Over wins. Otherwise, Under wins." },
            { question: "Is it free?", answer: "Yes, completely free. You stake 100 virtual points per card. No real money, no deposits, no purchases. Entertainment only." },
          ])),
        }}
      />
      {card && <StickyTracker totalGoals={totalGoals} goalLine={card.goal_line} status={card.status} />}

      {/* Card header */}
      {card && (
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            {S.CARD_LABEL} #{card.card_number} · Today
          </p>
          <h1 className="font-display text-2xl font-bold text-ink mt-1">
            {new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date(card.utc_date + "T00:00:00Z"))}
          </h1>
        </header>
      )}

      {/* Live toast (lazy) */}
      {card && <Suspense fallback={null}><PickToast cardId={card.id} /></Suspense>}

      {/* Onboarding (eager — above fold) */}
      <HowItWorks lang={lang} />

      {/* Engagement (lazy) */}
      {card && <Suspense fallback={<div className="mb-4 h-5" />}><EngagementBar cardId={card.id} lang={lang} /></Suspense>}

      {/* State machine render — LiveScoreSync wraps live-relevant states for real-time scores */}
      {viewState === "no_card" && <NoCard dict={S} />}
      {viewState === "open_unpicked" && card && (
        <CardOpenUnpicked card={card} matches={matches} lang={lang} />
      )}
      {viewState === "open_picked" && card && pick && (
        <LiveScoreSync matches={matches}>
          <CardOpenPicked card={card} matches={matches} pick={pick} communitySplit={communitySplit} lang={lang} />
        </LiveScoreSync>
      )}
      {viewState === "locked" && card && (
        <LiveScoreSync matches={matches}>
          <CardOpenPicked
            card={card}
            matches={matches}
            pick={pick ?? { id: "", side: "over", odds_locked: 0, stake_points: 0, status: "locked", net_profit: null, participation_bonus: null, points_added: null }}
            communitySplit={communitySplit}
            lang={lang}
          />
        </LiveScoreSync>
      )}
      {viewState === "live" && card && (
        <LiveScoreSync matches={matches}>
          <CardLive card={card} matches={matches} pick={pick} lang={lang} />
        </LiveScoreSync>
      )}
      {viewState === "settled" && card && (
        <CardSettled card={card} matches={matches} pick={pick} lang={lang} />
      )}
      {viewState === "voided" && card && <CardVoided card={card} lang={lang} />}
    </div>
  );
}

function NoCard({ dict }: { dict: { NO_CARD_TITLE: string; NO_CARD_BODY: string } }) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink">
          {dict.NO_CARD_TITLE}
        </h1>
        <p className="mt-3 text-muted">{dict.NO_CARD_BODY}</p>
      </div>
    </div>
  );
}
