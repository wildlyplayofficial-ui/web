import { ImageResponse } from "next/og";
import { getServiceSupabase } from "@/lib/goalline/supabase";
import type { DailyCard, CardMatch } from "@/lib/goalline/types";
import { teamFlag } from "@/lib/flags";

/**
 * Daily Line share card image (1080x1080, square for social).
 * Usage: /api/og/daily-line?card=3 or /api/og/daily-line?card=3&side=over&status=won&points=150
 * Card number is required. User pick params are optional (for personalized shares).
 */

const C = {
  bg: "#0d1117",
  card: "#161b22",
  ink: "#e6edf3",
  muted: "#8b949e",
  line: "#30363d",
  brand: "#00e676",
  brandDim: "rgba(0, 230, 118, 0.15)",
  loss: "#f85149",
  lossDim: "rgba(248, 81, 73, 0.15)",
  over: "#00e676",
  under: "#42a5f5",
} as const;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cardNumber = parseInt(url.searchParams.get("card") ?? "", 10);
  if (isNaN(cardNumber)) {
    return new Response("Missing card number", { status: 400 });
  }

  // Optional user pick params (for personalized share)
  const userSide = url.searchParams.get("side") as "over" | "under" | null;
  const userStatus = url.searchParams.get("status") as "won" | "lost" | null;
  const userPoints = url.searchParams.get("points");

  const sb = getServiceSupabase();
  if (!sb) return new Response("DB not configured", { status: 500 });

  const { data: card } = await sb
    .from("gl_daily_cards")
    .select("*")
    .eq("card_number", cardNumber)
    .single();

  if (!card) return new Response("Card not found", { status: 404 });
  const c = card as DailyCard;

  // Fetch matches
  const { data: junctions } = await sb
    .from("gl_daily_card_matches")
    .select("match_id, sort_order")
    .eq("daily_card_id", c.id)
    .order("sort_order");

  let matches: CardMatch[] = [];
  if (junctions && junctions.length > 0) {
    const matchIds = junctions.map((j: { match_id: string }) => j.match_id);
    const { data: matchRows } = await sb
      .from("gl_matches")
      .select("id, external_match_id, home_team, away_team, kickoff_time_utc, status, home_score, away_score, valid_goals")
      .in("id", matchIds);
    if (matchRows) {
      matches = matchRows
        .map((m: Record<string, unknown>) => {
          const junction = junctions.find((j: { match_id: string }) => j.match_id === m.id);
          return { ...m, sort_order: junction?.sort_order ?? 0 } as CardMatch;
        })
        .sort((a, b) => a.sort_order - b.sort_order);
    }
  }

  const totalGoals = matches.reduce((sum, m) => sum + (m.valid_goals ?? 0), 0);
  const isSettled = c.status === "settled";
  const winningSide = c.settlement_result === "over" ? "OVER" : "UNDER";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.bg,
          color: C.ink,
          padding: "48px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>
            <span style={{ color: C.ink }}>Wildly</span>
            <span style={{ color: C.brand }}>Play</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: C.muted }}>
            Daily Line · Card #{c.card_number}
          </div>
        </div>

        {/* Date */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24, fontSize: 24, color: C.muted }}>
          {c.utc_date}
        </div>

        {/* Goal Line + Result */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 28,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, color: C.muted, letterSpacing: 2 }}>
            GOAL LINE
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>
            {c.goal_line}
          </div>

          {isSettled && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 36,
                fontWeight: 700,
                color: C.brand,
                backgroundColor: C.brandDim,
                border: `2px solid ${C.brand}`,
                borderRadius: 16,
                padding: "8px 32px",
                letterSpacing: 3,
              }}
            >
              {winningSide} WON
            </div>
          )}

          {isSettled && (
            <div style={{ display: "flex", fontSize: 28, color: C.muted }}>
              Total: {totalGoals} goals
            </div>
          )}
        </div>

        {/* Matches */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 28,
            padding: "0 24px",
          }}
        >
          {matches.slice(0, 4).map((m) => {
            const hf = teamFlag(m.home_team);
            const af = teamFlag(m.away_team);
            const showScore = m.status === "finished" || m.status === "live";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: C.card,
                  borderRadius: 12,
                  padding: "12px 20px",
                  border: `1px solid ${C.line}`,
                }}
              >
                <div style={{ display: "flex", fontSize: 20, fontWeight: 600 }}>
                  {hf && <span style={{ marginRight: 8 }}>{hf}</span>}
                  {m.home_team} vs {m.away_team}
                  {af && <span style={{ marginLeft: 8 }}>{af}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {showScore && (
                    <span style={{ fontSize: 22, fontWeight: 700 }}>
                      {m.home_score ?? 0}–{m.away_score ?? 0}
                    </span>
                  )}
                  {m.valid_goals !== null && m.valid_goals > 0 && (
                    <span style={{ fontSize: 16, color: C.brand }}>
                      ⚽ {m.valid_goals}
                    </span>
                  )}
                  {m.status === "finished" && (
                    <span style={{ fontSize: 14, color: C.muted }}>FT</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* User pick section (personalized) */}
        {userSide && userStatus && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 16,
              marginTop: 24,
              padding: "16px 24px",
              backgroundColor: userStatus === "won" ? C.brandDim : C.lossDim,
              border: `1px solid ${userStatus === "won" ? C.brand : C.loss}`,
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 22, color: C.muted }}>My pick:</span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: userSide === "over" ? C.over : C.under,
              }}
            >
              {userSide.toUpperCase()} {c.goal_line}
            </span>
            <span style={{ fontSize: 28, fontWeight: 700, color: userStatus === "won" ? C.brand : C.loss }}>
              {userStatus === "won" ? "✅ WON" : "❌ LOST"}
            </span>
            {userPoints && (
              <span style={{ fontSize: 20, color: C.ink }}>+{userPoints}pts</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 20,
            borderTop: `1px solid ${C.line}`,
            fontSize: 18,
            color: C.muted,
          }}
        >
          wildlyplay.com/daily-line · Free prediction game
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
