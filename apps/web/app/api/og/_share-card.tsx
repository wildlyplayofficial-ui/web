import { ImageResponse } from "next/og";
import type { Author, Pick, TrackRecord } from "@/lib/types";
import { teamColor, BRAND_GREEN } from "@/lib/team-palette";

const LOSS = "#e5484d";
const SCOUT_TEAL = "#5f9c99";

/** Persona accent: Scout teal vs Curator green. */
export function accentFor(author: Author): string {
  return author === "scout" ? SCOUT_TEAL : BRAND_GREEN;
}

/** CLV (closing-line value) — proprietary anchor number. Only when the close is
 *  known (settled picks); never fabricated for upcoming picks. */
function clvMetric(pick: Pick): Metric | null {
  if (pick.odds_close == null || pick.odds_close <= 0) return null;
  const pct = (pick.odds_publish / pick.odds_close - 1) * 100;
  return { label: "CLV", value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
}

/** Status badge + info line + metric derived from a real pick record. */
export function pickFields(
  pick: Pick,
  accent: string,
): { status: { label: string; color: string }; infoLine: string; metric: Metric | null } {
  if (pick.status === "won" || pick.status === "lost" || pick.status === "push") {
    const color = pick.status === "won" ? BRAND_GREEN : pick.status === "lost" ? LOSS : MUTED;
    const pl = pick.units_pl !== null ? ` \u00b7 ${pick.units_pl > 0 ? "+" : ""}${pick.units_pl}u` : "";
    return {
      status: { label: pick.status.toUpperCase(), color },
      infoLine: `FT ${pick.home_score}\u2013${pick.away_score}${pl}`,
      metric: clvMetric(pick),
    };
  }
  return {
    status: { label: "OUR PICK", color: accent },
    infoLine: `${pick.selection} @ ${pick.odds_publish} \u00b7 ${pick.stake_units}u`,
    metric: clvMetric(pick),
  };
}

/**
 * Shared vibrant OG share card (1200x630) for news + match pages.
 * Nick 09/07: kill the dark template — cards are colored by the two teams
 * (nation flag colors / club crest colors), premium "The Athletic" matchday
 * tone. Layout is fixed; only the header colors change per fixture.
 */

const INK = "#0d1117";
const MUTED = "#5b6572";
const PANEL = "#f4f6f8";
const LINE = "#e2e6ea";

export type Metric = { label: string; value: string };

export type ShareCardProps = {
  /** Team display names (exact feed names) — null when unknown (no linked pick). */
  home: string | null;
  away: string | null;
  homeBadge: string | null;
  awayBadge: string | null;
  league: string | null;
  status: { label: string; color: string };
  /** Used as the hero only when teams are unknown (e.g. an article with no pick). */
  headline: string;
  /** Article title shown in the body when teams are known but there is no pick. */
  subhead?: string | null;
  /** Primary info line: the pick, the result, or the coverage state. */
  infoLine: string | null;
  /** Proprietary anchor number (CLV / board edge) — omitted when data can't support it. */
  metric: Metric | null;
  record: TrackRecord;
  author: Author;
};

function recordLine(author: Author, r: TrackRecord): string {
  const who = author === "scout" ? "Scout" : "Curator";
  const pl = r.units_pl > 0 ? `+${r.units_pl}u` : `${r.units_pl}u`;
  return `${who} record ${r.wins}-${r.losses}-${r.pushes} \u00b7 ${pl}`;
}

function TeamColumn({ name, badge }: { name: string; badge: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 320 }}>
      {badge ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={badge} width={88} height={88} style={{ objectFit: "contain" }} alt="" />
      ) : (
        <div style={{ display: "flex", width: 88, height: 88 }} />
      )}
      <div
        style={{
          display: "flex",
          marginTop: 12,
          fontSize: 30,
          fontWeight: 800,
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {name}
      </div>
    </div>
  );
}

export function renderShareCard(props: ShareCardProps): ImageResponse {
  const { home, away, homeBadge, awayBadge, league, status, headline, subhead, infoLine, metric, record, author } = props;
  const hasTeams = Boolean(home && away);
  const homeColor = teamColor(home ?? "");
  const awayColor = teamColor(away ?? "");
  const headerGradient = hasTeams
    ? `linear-gradient(120deg, ${homeColor} 0%, ${homeColor} 42%, ${awayColor} 58%, ${awayColor} 100%)`
    : `linear-gradient(120deg, ${BRAND_GREEN} 0%, #009e42 100%)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PANEL,
          color: INK,
        }}
      >
        {/* ── Vibrant team-colored header ── */}
        <div style={{ position: "relative", display: "flex", width: "100%", height: 288 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              backgroundImage: headerGradient,
            }}
          />
          {/* Scrim so white text always clears WCAG contrast over any team color */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              backgroundColor: "rgba(9,13,20,0.32)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              padding: "30px 56px",
              justifyContent: "space-between",
            }}
          >
            {/* top: logo + status */}
            <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#ffffff" }}>
                <span>Wildly</span>
                <span style={{ color: BRAND_GREEN }}>Play</span>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 19,
                  fontWeight: 800,
                  letterSpacing: 3,
                  color: "#ffffff",
                  backgroundColor: status.color,
                  borderRadius: 8,
                  padding: "7px 18px",
                }}
              >
                {status.label}
              </div>
            </div>

            {/* hero: crests + names, or headline when no teams */}
            {hasTeams ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                <TeamColumn name={home as string} badge={homeBadge} />
                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: 3,
                    color: "rgba(255,255,255,0.85)",
                    margin: "0 12px",
                  }}
                >
                  VS
                </div>
                <TeamColumn name={away as string} badge={awayBadge} />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: headline.length > 60 ? 40 : 48,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.15,
                  paddingRight: 24,
                }}
              >
                {headline}
              </div>
            )}
          </div>
        </div>

        {/* ── Light info panel ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "26px 56px 30px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {league ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                {league}
              </div>
            ) : null}
            {subhead ? (
              <div style={{ display: "flex", marginTop: 14, fontSize: 34, fontWeight: 800, color: INK, lineHeight: 1.2 }}>
                {subhead}
              </div>
            ) : null}
            {infoLine ? (
              <div style={{ display: "flex", marginTop: 12, fontSize: 40, fontWeight: 800, color: INK }}>
                {infoLine}
              </div>
            ) : null}
            {metric ? (
              <div style={{ display: "flex", marginTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: `2px solid ${BRAND_GREEN}`,
                    borderRadius: 10,
                    padding: "8px 18px",
                    fontSize: 24,
                    fontWeight: 800,
                    color: INK,
                  }}
                >
                  <span style={{ color: MUTED, fontWeight: 700, marginRight: 10 }}>{metric.label}</span>
                  <span>{metric.value}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${LINE}`,
              paddingTop: 18,
            }}
          >
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: INK }}>
              {recordLine(author, record)}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: MUTED }}>
              {author === "scout" ? "The Scout \u00b7 AI-picked, not a real person" : "The Curator \u00b7 Human-picked"}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
