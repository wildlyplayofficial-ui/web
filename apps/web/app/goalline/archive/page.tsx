import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/goalline/supabase";
import { getDailyLineDict } from "@/lib/goalline/strings";
import { resolveLang, withLang } from "@/lib/i18n";
import type { DailyCard } from "@/lib/goalline/types";

export const metadata: Metadata = {
  title: "Archive",
};

export const revalidate = 300;

type ArchiveCard = Pick<
  DailyCard,
  "card_number" | "utc_date" | "goal_line" | "status" | "settlement_result"
>;

async function getArchiveCards(): Promise<ArchiveCard[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("gl_daily_cards")
    .select("card_number, utc_date, goal_line, status, settlement_result")
    .in("status", ["open", "locked", "live", "settled", "voided"])
    .order("card_number", { ascending: false });

  return (data as ArchiveCard[]) ?? [];
}

function StatusBadge({ status }: { status: DailyCard["status"] }) {
  switch (status) {
    case "open":
      return (
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
          Open
        </span>
      );
    case "locked":
      return (
        <span className="rounded-full bg-line px-2 py-0.5 text-xs font-semibold text-muted">
          Locked
        </span>
      );
    case "live":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Live
        </span>
      );
    case "settled":
      return (
        <span className="rounded-full bg-over/10 px-2 py-0.5 text-xs font-semibold text-over">
          Settled
        </span>
      );
    case "voided":
      return (
        <span className="rounded-full bg-loss/10 px-2 py-0.5 text-xs font-semibold text-loss">
          Voided
        </span>
      );
    default:
      return null;
  }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ArchivePage({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const S = getDailyLineDict(lang);
  const cards = await getArchiveCards();

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">{S.NAV_ARCHIVE}</h1>
      <p className="mt-1 text-sm text-muted">{S.BRAND}</p>

      {cards.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted">{S.NO_CARD_TITLE}</p>
      )}

      {cards.length > 0 && (
        <ul className="mt-6 space-y-3">
          {cards.map((card) => (
            <li key={card.card_number}>
              <Link
                href={withLang(`/daily-line/card/${card.card_number}`, lang)}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-4 transition hover:border-brand"
              >
                <div>
                  <p className="text-xs text-muted">
                    {S.CARD_LABEL} #{card.card_number} · {card.utc_date}
                  </p>
                  <p className="mt-1 font-display font-bold text-ink">
                    {S.GOAL_LINE_LABEL}: {card.goal_line}
                  </p>
                  {card.status === "settled" && card.settlement_result && (
                    <p className="mt-0.5 text-xs text-muted">
                      Result:{" "}
                      <span className="font-semibold text-ink capitalize">
                        {card.settlement_result}
                      </span>
                    </p>
                  )}
                </div>
                <StatusBadge status={card.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
