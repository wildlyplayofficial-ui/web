import clubBadges from "@/lib/data/club-badges.json";

/** Đội có trang hub /doi/[slug]. Nhãn `teams` trên bài (news_items/analysis_articles) dùng đúng slug này. */
export type TeamHub = {
  slug: string;
  name: string;
  crest: string | null;
  kind: "club" | "nation";
};

const CLUB: Record<string, string> = clubBadges;

export const TEAM_HUBS: TeamHub[] = [
  { slug: "man-united", name: "Manchester United", crest: CLUB["Manchester United"] ?? null, kind: "club" },
  { slug: "arsenal", name: "Arsenal", crest: CLUB["Arsenal"] ?? null, kind: "club" },
  { slug: "chelsea", name: "Chelsea", crest: CLUB["Chelsea"] ?? null, kind: "club" },
  { slug: "man-city", name: "Manchester City", crest: CLUB["Manchester City"] ?? null, kind: "club" },
  { slug: "vietnam", name: "Việt Nam", crest: "https://flagcdn.com/w160/vn.png", kind: "nation" },
];

const BY_SLUG: Record<string, TeamHub> = Object.fromEntries(TEAM_HUBS.map((t) => [t.slug, t]));

export function getTeamHub(slug: string): TeamHub | null {
  return BY_SLUG[slug] ?? null;
}
