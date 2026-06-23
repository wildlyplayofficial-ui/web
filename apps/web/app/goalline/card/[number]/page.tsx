import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceSupabase } from "@/lib/goalline/supabase";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { DailyCard, CardMatch } from "@/lib/goalline/types";
import { resolveLang } from "@/lib/i18n";
import { CardInsights } from "@/app/goalline/components/card-insights";
import { EngagementBar } from "@/app/goalline/components/engagement-bar";
import { GoalDots } from "@/app/goalline/components/goal-dots";
import { MatchList } from "@/app/goalline/components/match-list";
import { PickToast } from "@/app/goalline/components/pick-toast";
import { StickyTracker } from "@/app/goalline/components/sticky-tracker";

export const revalidate = 60;

// ── Data fetching ──────────────────────────────────────────────────────────

interface CardDetailData {
  card: DailyCard;
  matches: CardMatch[];
}

async function getCardByNumber(number: number): Promise<CardDetailData | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;

  const { data: card } = await sb
    .from("gl_daily_cards")
    .select("*")
    .eq("card_number", number)
    .single();

  if (!card || card.status === "draft" || card.status === "scheduled") return null;

  const { data: junctions } = await sb
    .from("gl_daily_card_matches")
    .select("match_id, sort_order")
    .eq("daily_card_id", card.id)
    .order("sort_order");

  let matches: CardMatch[] = [];
  if (junctions && junctions.length > 0) {
    const matchIds = junctions.map((j: { match_id: string }) => j.match_id);
    const { data: matchRows } = await sb
      .from("gl_matches")
      .select(
        "id, external_match_id, home_team, away_team, kickoff_time_utc, status, home_score, away_score, valid_goals",
      )
      .in("id", matchIds);

    if (matchRows) {
      matches = matchRows.map((m: Record<string, unknown>) => {
        const junction = junctions.find(
          (j: { match_id: string }) => j.match_id === m.id,
        );
        return { ...m, sort_order: junction?.sort_order ?? 0 } as CardMatch;
      });
    }
  }

  return { card: card as DailyCard, matches };
}

// ── Page ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CardDetailPage({ params, searchParams }: PageProps) {
  const [{ number: numberStr }, sp] = await Promise.all([params, searchParams]);
  const lang = resolveLang(sp.lang);
  const S = getDailyLineDict(lang);
  const cardNumber = parseInt(numberStr, 10);

  if (isNaN(cardNumber)) notFound();

  const data = await getCardByNumber(cardNumber);
  if (!data) notFound();

  const { card, matches } = data;

  const totalGoals = matches.reduce(
    (sum, m) => sum + (m.valid_goals ?? 0),
    0,
  );
  const isSettled = card.status === "settled";
  const showScores = card.status === "live" || isSettled;

  return (
    <div className="mx-auto max-w-lg px-5 py-8 overflow-x-hidden">
      <StickyTracker totalGoals={totalGoals} goalLine={card.goal_line} status={card.status} />

      {/* Back link */}
      <Link
        href="/daily-line"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
      >
        ← {S.BRAND}
      </Link>

      <PickToast cardId={card.id} />

      {/* Card header */}
      <header className="mt-4 mb-4 text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.CARD_LABEL} #{card.card_number} · Today
        </p>
        <h1 className="font-display text-2xl font-bold text-ink mt-1">
          {new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(card.utc_date + "T00:00:00Z"))}
        </h1>
      </header>

      {/* Goal line + odds */}
      <div className="rounded-card border border-line bg-card p-4 shadow-card mb-6">
        <div className="text-center mb-4">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            {S.GOAL_LINE_LABEL}
          </p>
          <p className="font-display text-5xl font-bold text-ink mt-1">
            {card.goal_line}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-center">
          <div>
            <p className="text-xs text-muted">{S.OVER}</p>
            <p className="font-display text-lg font-bold tabular-nums text-over">{card.over_odds.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{S.UNDER}</p>
            <p className="font-display text-lg font-bold tabular-nums text-under">{card.under_odds.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-line-muted pt-3 flex items-center justify-between text-xs text-muted">
          <span>Status</span>
          <CardStatusBadge status={card.status} />
        </div>
      </div>

      {/* Engagement + Insights */}
      <EngagementBar cardId={card.id} />
      <div className="mb-4">
        <CardInsights goalLine={card.goal_line} matches={matches} />
      </div>

      {/* Matches */}
      <div className="mb-6">
        <h2 className="text-xs font-medium tracking-wider text-muted uppercase mb-3">
          Matches
        </h2>
        <MatchList matches={matches} showScores={showScores} />
        {showScores && (
          <div className="mt-3">
            <GoalDots matches={matches} />
          </div>
        )}
      </div>

      {/* Settlement result (settled cards only) */}
      {isSettled && (
        <div className="rounded-card border border-line bg-card p-4 shadow-card mb-6">
          <p className="text-xs font-medium tracking-wider text-muted uppercase mb-3">
            {S.RESULT_TITLE}
          </p>
          <div className="text-center">
            <p className="text-xs text-muted">{S.TOTAL_VS_LINE}</p>
            <p className="font-display text-4xl font-bold tabular-nums text-ink mt-1">
              {totalGoals}{" "}
              <span className="text-muted">vs</span>{" "}
              {card.goal_line}
            </p>
          </div>
          {card.settlement_result && (
            <p className="mt-3 text-sm text-center text-muted">
              {S.WINNING_SIDE_LABEL}:{" "}
              <span className="font-display font-bold text-brand">
                {card.settlement_result === "over" ? S.OVER : S.UNDER}
              </span>
            </p>
          )}
        </div>
      )}

      {/* User's pick — client component reads device_id */}
      <UserPickSection cardId={card.id} card={card} />
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function CardStatusBadge({ status }: { status: DailyCard["status"] }) {
  const base = "rounded-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider";
  switch (status) {
    case "open":
      return <span className={`${base} bg-brand-dim text-brand`}>Open</span>;
    case "locked":
      return <span className={`${base} bg-warning-dim text-warning`}>Locked</span>;
    case "live":
      return (
        <span className={`${base} bg-brand-dim text-brand inline-flex items-center gap-1`}>
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Live
        </span>
      );
    case "settled":
      return <span className={`${base} bg-card-hover text-muted`}>Settled</span>;
    case "voided":
      return <span className={`${base} bg-loss-dim text-loss`}>Voided</span>;
    default:
      return <span className={`${base} bg-card-hover text-muted`}>{status}</span>;
  }
}

// ── User pick section (client island) ─────────────────────────────────────

// Import at bottom to avoid polluting server component with "use client"
import { UserPickSection } from "./user-pick-section";
