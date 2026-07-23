import { ImageResponse } from "next/og";
import { teamBadge } from "@/lib/team-badges";
import { teamColor, BRAND_GREEN } from "@/lib/team-palette";
import { INK, MUTED, PANEL, LINE, SITE } from "./_share-card";

/**
 * Desk-variant OG share card (1200x630) for AI-authored analysis articles.
 * Reuses the vibrant team-colored layout language of _share-card but stays
 * strictly on the Desk side of the picks firewall: kind badge (PREVIEW / RECAP /
 * ROUNDUP), "WildlyPlay Desk (AI)" byline, and NO track record, CLV, persona
 * or betting-lean copy anywhere on the card.
 */

/** 2-3 letter monogram for teams without a crest/flag asset. */
function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function DeskTeamColumn({ name }: { name: string }) {
  const badge = teamBadge(name);
  const src = badge?.startsWith("/") ? `${SITE}${badge}` : badge;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 320 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={88} height={88} style={{ objectFit: "contain" }} alt="" />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: "rgba(255,255,255,0.18)",
            border: "2px solid rgba(255,255,255,0.55)",
            fontSize: 30,
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          {initials(name)}
        </div>
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

export type DeskCardProps = {
  home: string | null;
  away: string | null;
  badgeLabel: string;
  /** Article title — panel subhead when teams are known, header hero otherwise. */
  headline: string;
  league: string | null;
  /** en-GB formatted publish date, e.g. "23 Jul 2026". */
  dateLine: string;
};

export function renderDeskCard(props: DeskCardProps): ImageResponse {
  const { home, away, badgeLabel, headline, league, dateLine } = props;
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
        {/* ── Vibrant header (team colors, or brand band for roundups) ── */}
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
            {/* top: logo + kind badge */}
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
                  backgroundColor: BRAND_GREEN,
                  borderRadius: 8,
                  padding: "7px 18px",
                }}
              >
                {badgeLabel}
              </div>
            </div>

            {/* hero: crests + names, or the title when no matchup */}
            {hasTeams ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                <DeskTeamColumn name={home as string} />
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
                <DeskTeamColumn name={away as string} />
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
            {hasTeams ? (
              <div style={{ display: "flex", marginTop: 14, fontSize: 34, fontWeight: 800, color: INK, lineHeight: 1.2 }}>
                {headline}
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
              {`WildlyPlay Desk (AI) \u00b7 ${dateLine}`}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: MUTED }}>
              {league ?? "AI-authored coverage"}
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
