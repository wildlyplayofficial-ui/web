import type { FixtureDay } from "@/lib/standings-extra";

const BASE = "https://www.banhbong.net";

/** Số trận nhúng schema. Cả mùa 380 trận thì JSON-LD phình vô ích — Google chỉ
 *  cần các trận sắp đá. */
const GIOI_HAN = 60;

interface Props {
  days: FixtureDay[];
  competitionName: string;
  competitionUrl: string;
}

/**
 * SportsEvent đầy đủ cho từng trận sắp đá: hai đội, giờ, sân.
 *
 * Trận `provisional` chỉ ghi NGÀY, không ghi giờ. Lịch cả mùa lấy từ openfootball
 * có giờ mặc định (200/380 trận cùng 12:00 UTC) — đẩy giờ đó vào startDate là
 * bơm số bịa thẳng cho Google, đúng lỗi đã phải sửa ở phần hiển thị.
 */
export function FixturesJsonLd({ days, competitionName, competitionUrl }: Props) {
  const homNay = new Date().toISOString().slice(0, 10);
  const tran = days
    .filter((d) => d.date >= homNay)
    .flatMap((d) => d.matches)
    .filter((m) => !m.finished)
    .slice(0, GIOI_HAN);

  if (tran.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: competitionName,
    itemListElement: tran.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SportsEvent",
        name: `${m.homeName} vs ${m.awayName}`,
        startDate: m.provisional || !m.time ? m.date : `${m.date}T${m.time}:00Z`,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        sport: "Football",
        homeTeam: { "@type": "SportsTeam", name: m.homeName },
        awayTeam: { "@type": "SportsTeam", name: m.awayName },
        competitor: [
          { "@type": "SportsTeam", name: m.homeName },
          { "@type": "SportsTeam", name: m.awayName },
        ],
        ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
        superEvent: {
          "@type": "SportsOrganization",
          name: competitionName,
          url: `${BASE}${competitionUrl}`,
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
