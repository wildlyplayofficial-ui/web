import type { Lang } from "@/lib/i18n";

interface Persona {
  name: string;
  role: string;
  description: string;
}

interface MethodStep {
  title: string;
  body: string;
}

interface Tool {
  name: string;
  emoji: string;
  href: string;
}

interface Helpline {
  name: string;
  detail: string;
}

export interface AboutCopy {
  title: string;
  /** SEO <title> — có từ khoá, khác `title` (là H1 trên trang). */
  metaTitle: string;
  /** Meta description viết đủ ý 150-160 ký tự — KHÔNG cắt `intro`. */
  metaDescription: string;
  intro: string;
  cardsTitle?: string;
  /** `href`: thẻ bấm được sang trang tương ứng (bản VI 11/11). */
  cards: ReadonlyArray<{ heading: string; body: string; href?: string }>;
  promiseTitle: string;
  promises: readonly string[];
  methodTitle: string;
  methodIntro: string;
  methodSteps: readonly MethodStep[];
  leaguesTitle: string;
  leaguesIntro: string;
  leaguesSeason: string;
  contactTitle: string;
  contactBody: string;
  // Trang /about soạn lại 11/11/2026 (Peter): bỏ thẻ Chú Tám, mục thành tích, công cụ, đường dây
  // hỗ trợ. Các trường dưới KHÔNG còn hiện; giữ tuỳ chọn để bản en/th/es (đều 301 về VI) khỏi sửa.
  personas?: [Persona];
  trackTitle?: string;
  trackBody?: string;
  trackCta?: string;
  toolsTitle?: string;
  toolsIntro?: string;
  tools?: readonly Tool[];
  responsibleTitle?: string;
  responsibleBody?: string;
  helplines?: readonly Helpline[];
}

export const copy: Record<Lang, AboutCopy> = {
  en: {
    title: "About banhbong.net",
    metaTitle: "About banhbong.net — Curator-Led Football Picks, Public Track Record",
    metaDescription:
      "banhbong.net is a curator-led football picks site. A human picks every match; AI writes the analysis, settles results, and archives every pick publicly, forever.",
    intro:
      "banhbong.net is a curator-led football picks site. A human \u2014 The Curator \u2014 picks the matches and the angles. AI operates everything else: it writes the analysis, publishes, settles the result and archives every pick publicly, forever. Human picks, AI operates \u2014 disclosed on every single play.",
    cards: [
      {
        heading: "Curated, not predicted",
        body: "Every pick is researched and reasoned \u2014 never random, never guaranteed. We share perspectives, not predictions.",
      },
      {
        heading: "Every pick, public forever",
        body: "Odds are snapshotted the moment a pick is published and never edited. Wins, losses, pushes \u2014 the full record stays up, starting from zero.",
      },
      {
        heading: "Free, for the global crowd",
        body: "No VIP tiers, no paywalls, no bookmaker affiliates. Players from every timezone, united by the love of the beautiful game.",
      },
    ],
    personas: [
      {
        name: "The Curator",
        role: "Human-picked",
        description: "A real person who researches every match, finds the angle, and submits the pick. The Curator is the human gate \u2014 every play starts with a human decision. Record tracked separately, transparent from day one.",
      },
    ],
    promiseTitle: "The promise",
    promises: [
      "One human gate: The Curator submits the pick. Everything downstream is automated and tamper-proof.",
      "Half-wins count as WON and half-losses as LOST on the badge \u2014 but the real Asian-handicap units P/L is always shown next to the record.",
      "We post our losses too. Entertainment only \u2014 never financial advice.",
    ],
    methodTitle: "How picks are made",
    methodIntro: "Every pick follows a five-step process before it goes live.",
    methodSteps: [
      { title: "Pre-match research", body: "Form tables, head-to-head records, injury reports, confirmed lineups \u2014 all checked before a market is even considered." },
      { title: "Market scan", body: "Compare odds across multiple bookmakers. We only look at markets where the price looks off relative to the true probability." },
      { title: "Edge check", body: "A pick only goes live when we expect the closing line to move in our direction \u2014 meaning the market agrees with us after sharper money arrives." },
      { title: "Asian handicap sizing", body: "Always one unit per pick. Never doubling down, never chasing losses. Flat staking, documented every time." },
      { title: "AI-generated analysis", body: "An automated preview and recap is published alongside every pick \u2014 giving context to the reasoning, written by AI, disclosed as such." },
    ],
    trackTitle: "Track record",
    trackBody: "Every pick since day one is archived publicly. No screenshots, no cherry-picking \u2014 the full ledger, updated after every match settles.",
    trackCta: "View full track record \u2192",
    leaguesTitle: "Leagues we cover",
    leaguesIntro: "We follow major leagues and tournaments around the world. Standings, fixtures, and picks are available for each.",
    leaguesSeason: "Season",
    toolsTitle: "Free tools",
    toolsIntro: "Sharpen your own analysis with these calculators \u2014 no signup required.",
    tools: [
      { name: "De-vig calculator", emoji: "\u2696\ufe0f", href: "/calculators/de-vig" },
      { name: "Kelly criterion", emoji: "\ud83d\udcca", href: "/calculators/kelly" },
      { name: "Odds converter", emoji: "\ud83d\udd04", href: "/calculators/odds-converter" },
      { name: "Poisson model", emoji: "\ud83c\udfaf", href: "/calculators/poisson" },
    ],
    responsibleTitle: "Responsible play",
    responsibleBody: "banhbong.net is entertainment. We share perspectives \u2014 never financial advice. If gambling stops being fun, reach out.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Get in touch",
    contactBody: "Follow us or drop a message on any of these channels.",
  },
  // Bản VI soạn lại 11/11/2026 (Peter): trang nói về DỰ ĐOÁN + đội ngũ chuyên gia, không còn
  // xoay quanh Chú Tám. Không bịa số năm, nơi làm, giải thưởng hay tỷ lệ trúng.
  vi: {
    title: "Về banhbong.net",
    metaTitle: "Về banhbong.net — Dự đoán bóng đá mỗi ngày",
    metaDescription:
      "banhbong.net dự đoán bóng đá mỗi ngày theo giờ Việt Nam: chốt tỷ số kèm tỷ lệ 1X2, Over/Under, phong độ, đối đầu và bảng xếp hạng, do chuyên gia từng giải ký tên.",
    intro:
      "banhbong.net là trang dự đoán bóng đá theo giờ Việt Nam. Mỗi ngày chúng tôi chốt tỷ số các trận đáng chú ý, kèm tỷ lệ 1X2, Over/Under, phong độ gần đây, lịch sử đối đầu và bảng xếp hạng. Mỗi trận do chuyên gia phụ trách giải đó ký tên.",
    cardsTitle: "banhbong.net có gì",
    cards: [
      {
        heading: "Dự đoán mỗi ngày",
        body: "Tỷ số dự đoán từng trận theo ngày, kèm tỷ lệ 1X2, Over/Under, cả hai đội ghi bàn và phong độ 5 trận gần nhất.",
        href: "/du-doan",
      },
      {
        heading: "Kết quả",
        body: "Tỷ số thật của các trận đã dự đoán, đặt cạnh tỷ số đã chốt trước trận để bạn tự đối chiếu.",
        href: "/ket-qua",
      },
      {
        heading: "Bảng xếp hạng & lịch thi đấu",
        body: "Bảng xếp hạng, lịch đấu và kết quả theo từng giải đang theo dõi.",
        href: "/competitions",
      },
    ],
    methodTitle: "Cách chúng tôi dự đoán",
    methodIntro: "Trận nào cũng đi qua bốn bước giống nhau.",
    methodSteps: [
      { title: "Gom số liệu", body: "Phong độ 10 trận gần nhất của hai đội, lịch sử đối đầu, vị trí trên bảng xếp hạng và tỷ lệ thị trường của trận." },
      { title: "Chuyên gia phụ trách giải đọc trận", body: "Người theo dõi giải đó xem số liệu cùng bối cảnh trận: lịch thi đấu dày hay thưa, đội nào cần điểm hơn, đá sân nhà hay sân khách." },
      { title: "Chốt tỷ số trước giờ bóng lăn", body: "Tỷ số dự đoán được chốt và đăng trước giờ đá. Trận đã bắt đầu thì dự đoán không được sửa nữa." },
      { title: "Cập nhật kết quả", body: "Sáng hôm sau, tỷ số thật được cập nhật ở trang Kết quả, đặt cạnh tỷ số đã dự đoán." },
    ],
    promiseTitle: "Cam kết",
    promises: [
      "Tỷ số được chốt trước giờ đá và giữ nguyên sau trận.",
      "Dự đoán để tham khảo, không bảo đảm kết quả trận đấu.",
      "Giờ thi đấu trên trang là giờ Việt Nam (GMT+7).",
    ],
    leaguesTitle: "Giải đấu theo dõi",
    leaguesIntro: "Bảng xếp hạng và lịch thi đấu của các giải đang có trang riêng.",
    leaguesSeason: "Mùa giải",
    contactTitle: "Liên hệ",
    contactBody: "Theo dõi hoặc nhắn tin cho chúng tôi trên các kênh sau.",
  },
  th: {
    title: "\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a banhbong.net",
    // TH gi\u1ecdng ph\u00e2n t\u00edch (Route A). \u26a0\ufe0f C\u1ea6N native Thai review tr\u01b0\u1edbc production.
    metaTitle: "\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a banhbong.net \u2014 \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25\u0e42\u0e14\u0e22\u0e19\u0e31\u0e01\u0e04\u0e31\u0e14\u0e40\u0e25\u0e37\u0e2d\u0e01 \u0e2a\u0e16\u0e34\u0e15\u0e34\u0e42\u0e1b\u0e23\u0e48\u0e07\u0e43\u0e2a",
    metaDescription:
      "banhbong.net \u0e04\u0e37\u0e2d\u0e40\u0e27\u0e47\u0e1a\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25\u0e17\u0e35\u0e48\u0e04\u0e31\u0e14\u0e42\u0e14\u0e22\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c \u0e17\u0e38\u0e01\u0e01\u0e32\u0e23\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e1c\u0e48\u0e32\u0e19\u0e01\u0e32\u0e23\u0e28\u0e36\u0e01\u0e29\u0e32 AI \u0e40\u0e02\u0e35\u0e22\u0e19\u0e1a\u0e17\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c \u0e40\u0e01\u0e47\u0e1a\u0e17\u0e38\u0e01\u0e01\u0e32\u0e23\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e44\u0e27\u0e49\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e30\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b",
    intro:
      "banhbong.net \u0e04\u0e37\u0e2d\u0e40\u0e27\u0e47\u0e1a\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25\u0e17\u0e35\u0e48\u0e04\u0e31\u0e14\u0e42\u0e14\u0e22\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c \u0e04\u0e19\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e04\u0e19 \u2014 Admin \u2014 \u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e41\u0e25\u0e30\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e2a\u0e48\u0e27\u0e19 AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e17\u0e38\u0e01\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e17\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e37\u0e2d: \u0e40\u0e02\u0e35\u0e22\u0e19\u0e1a\u0e17\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c \u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48 \u0e15\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e1c\u0e25 \u0e41\u0e25\u0e30\u0e40\u0e01\u0e47\u0e1a\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e44\u0e27\u0e49\u0e15\u0e48\u0e2d\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e30\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c\u0e40\u0e25\u0e37\u0e2d\u0e01 AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23 \u2014 \u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e44\u0e27\u0e49\u0e43\u0e19\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14",
    cards: [
      {
        heading: "\u0e04\u0e31\u0e14\u0e2a\u0e23\u0e23 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e17\u0e33\u0e19\u0e32\u0e22",
        body: "\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1c\u0e48\u0e32\u0e19\u0e01\u0e32\u0e23\u0e04\u0e49\u0e19\u0e04\u0e27\u0e49\u0e32\u0e41\u0e25\u0e30\u0e21\u0e35\u0e40\u0e2b\u0e15\u0e38\u0e1c\u0e25\u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a \u2014 \u0e44\u0e21\u0e48\u0e2a\u0e38\u0e48\u0e21 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e01\u0e32\u0e23\u0e31\u0e19\u0e15\u0e35 \u0e40\u0e23\u0e32\u0e41\u0e1a\u0e48\u0e07\u0e1b\u0e31\u0e19\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e1e\u0e22\u0e32\u0e01\u0e23\u0e13\u0e4c",
      },
      {
        heading: "\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b",
        body: "\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07\u0e16\u0e39\u0e01\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e17\u0e31\u0e19\u0e17\u0e35\u0e17\u0e35\u0e48\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e41\u0e25\u0e30\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e41\u0e01\u0e49\u0e44\u0e02 \u0e0a\u0e19\u0e30 \u0e41\u0e1e\u0e49 \u0e04\u0e37\u0e19\u0e17\u0e38\u0e19 \u2014 \u0e2a\u0e16\u0e34\u0e15\u0e34\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e41\u0e2a\u0e14\u0e07\u0e44\u0e27\u0e49\u0e40\u0e2a\u0e21\u0e2d \u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e08\u0e32\u0e01\u0e28\u0e39\u0e19\u0e22\u0e4c",
      },
      {
        heading: "\u0e1f\u0e23\u0e35 \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e04\u0e2d\u0e1a\u0e2d\u0e25\u0e17\u0e31\u0e48\u0e27\u0e42\u0e25\u0e01",
        body: "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e30\u0e14\u0e31\u0e1a VIP \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e33\u0e41\u0e1e\u0e07\u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e1e\u0e31\u0e19\u0e18\u0e21\u0e34\u0e15\u0e23\u0e40\u0e08\u0e49\u0e32\u0e21\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e41\u0e17\u0e07 \u0e1c\u0e39\u0e49\u0e40\u0e25\u0e48\u0e19\u0e08\u0e32\u0e01\u0e17\u0e38\u0e01\u0e44\u0e17\u0e21\u0e4c\u0e42\u0e0b\u0e19 \u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e01\u0e31\u0e19\u0e14\u0e49\u0e27\u0e22\u0e04\u0e27\u0e32\u0e21\u0e23\u0e31\u0e01\u0e43\u0e19\u0e40\u0e01\u0e21\u0e25\u0e39\u0e01\u0e2b\u0e19\u0e31\u0e07",
      },
    ],
    personas: [
      {
        name: "Admin",
        role: "\u0e04\u0e31\u0e14\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e42\u0e14\u0e22\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c",
        description: "\u0e04\u0e19\u0e08\u0e23\u0e34\u0e07\u0e17\u0e35\u0e48\u0e04\u0e49\u0e19\u0e04\u0e27\u0e49\u0e32\u0e17\u0e38\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c \u0e2b\u0e32\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e41\u0e25\u0e30\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 Admin \u0e04\u0e37\u0e2d\u0e14\u0e48\u0e32\u0e19\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c \u2014 \u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e40\u0e23\u0e34\u0e48\u0e21\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e15\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e43\u0e08\u0e02\u0e2d\u0e07\u0e04\u0e19 \u0e2a\u0e16\u0e34\u0e15\u0e34\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e41\u0e22\u0e01 \u0e42\u0e1b\u0e23\u0e48\u0e07\u0e43\u0e2a\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e27\u0e31\u0e19\u0e41\u0e23\u0e01",
      },
    ],
    promiseTitle: "\u0e04\u0e33\u0e21\u0e31\u0e48\u0e19\u0e2a\u0e31\u0e0d\u0e0d\u0e32",
    promises: [
      "\u0e21\u0e35\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e14\u0e48\u0e32\u0e19\u0e40\u0e14\u0e35\u0e22\u0e27: Admin \u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e17\u0e38\u0e01\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e08\u0e32\u0e01\u0e19\u0e31\u0e49\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e30\u0e41\u0e17\u0e23\u0e01\u0e41\u0e0b\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49",
      "\u0e1b\u0e49\u0e32\u0e22\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e19\u0e31\u0e1a\u0e0a\u0e19\u0e30\u0e04\u0e23\u0e36\u0e48\u0e07\u0e40\u0e1b\u0e47\u0e19 \u0e0a\u0e19\u0e30 \u0e41\u0e25\u0e30\u0e41\u0e1e\u0e49\u0e04\u0e23\u0e36\u0e48\u0e07\u0e40\u0e1b\u0e47\u0e19 \u0e41\u0e1e\u0e49 \u2014 \u0e41\u0e15\u0e48\u0e01\u0e33\u0e44\u0e23/\u0e02\u0e32\u0e14\u0e17\u0e38\u0e19\u0e22\u0e39\u0e19\u0e34\u0e15\u0e15\u0e32\u0e21\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07\u0e1a\u0e2d\u0e25\u0e40\u0e2d\u0e40\u0e0a\u0e35\u0e22\u0e08\u0e23\u0e34\u0e07\u0e08\u0e30\u0e41\u0e2a\u0e14\u0e07\u0e04\u0e39\u0e48\u0e01\u0e31\u0e1a\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e40\u0e2a\u0e21\u0e2d",
      "\u0e41\u0e1e\u0e49\u0e40\u0e23\u0e32\u0e01\u0e47\u0e25\u0e07\u0e43\u0e2b\u0e49\u0e14\u0e39 \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e1a\u0e31\u0e19\u0e40\u0e17\u0e34\u0e07\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 \u2014 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19",
    ],
    methodTitle: "\u0e27\u0e34\u0e18\u0e35\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14",
    methodIntro: "\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1c\u0e48\u0e32\u0e19\u0e01\u0e23\u0e30\u0e1a\u0e27\u0e19\u0e01\u0e32\u0e23\u0e2b\u0e49\u0e32\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48",
    methodSteps: [
      { title: "\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e01\u0e48\u0e2d\u0e19\u0e41\u0e21\u0e15\u0e0a\u0e4c", body: "\u0e15\u0e32\u0e23\u0e32\u0e07\u0e1f\u0e2d\u0e23\u0e4c\u0e21 \u0e2a\u0e16\u0e34\u0e15\u0e34\u0e1e\u0e1a\u0e01\u0e31\u0e19 \u0e23\u0e32\u0e22\u0e07\u0e32\u0e19\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e1a\u0e32\u0e14\u0e40\u0e08\u0e47\u0e1a \u0e41\u0e25\u0e30\u0e15\u0e31\u0e27\u0e08\u0e23\u0e34\u0e07\u0e17\u0e35\u0e48\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19 \u2014 \u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e01\u0e48\u0e2d\u0e19\u0e1e\u0e34\u0e08\u0e32\u0e23\u0e13\u0e32\u0e15\u0e25\u0e32\u0e14" },
      { title: "\u0e2a\u0e41\u0e01\u0e19\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07", body: "\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e23\u0e32\u0e04\u0e32\u0e08\u0e32\u0e01\u0e2b\u0e25\u0e32\u0e22\u0e40\u0e08\u0e49\u0e32\u0e21\u0e37\u0e2d \u0e2a\u0e19\u0e43\u0e08\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e15\u0e25\u0e32\u0e14\u0e17\u0e35\u0e48\u0e23\u0e32\u0e04\u0e32\u0e14\u0e39\u0e1c\u0e34\u0e14\u0e44\u0e1b\u0e08\u0e32\u0e01\u0e04\u0e27\u0e32\u0e21\u0e19\u0e48\u0e32\u0e08\u0e30\u0e40\u0e1b\u0e47\u0e19\u0e08\u0e23\u0e34\u0e07" },
      { title: "\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e04\u0e27\u0e32\u0e21\u0e44\u0e14\u0e49\u0e40\u0e1b\u0e23\u0e35\u0e22\u0e1a", body: "\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e04\u0e32\u0e14\u0e27\u0e48\u0e32\u0e23\u0e32\u0e04\u0e32\u0e1b\u0e34\u0e14\u0e08\u0e30\u0e40\u0e04\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e1b\u0e43\u0e19\u0e17\u0e34\u0e28\u0e17\u0e32\u0e07\u0e02\u0e2d\u0e07\u0e40\u0e23\u0e32 \u2014 \u0e2b\u0e21\u0e32\u0e22\u0e04\u0e27\u0e32\u0e21\u0e27\u0e48\u0e32\u0e15\u0e25\u0e32\u0e14\u0e40\u0e2b\u0e47\u0e19\u0e14\u0e49\u0e27\u0e22" },
      { title: "\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07\u0e1a\u0e2d\u0e25\u0e40\u0e2d\u0e40\u0e0a\u0e35\u0e22\u0e04\u0e07\u0e17\u0e35\u0e48", body: "\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e22\u0e39\u0e19\u0e34\u0e15\u0e15\u0e48\u0e2d\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e40\u0e2a\u0e21\u0e2d \u0e44\u0e21\u0e48\u0e17\u0e1a \u0e44\u0e21\u0e48\u0e44\u0e25\u0e48\u0e15\u0e32\u0e21 \u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19\u0e04\u0e07\u0e17\u0e35\u0e48 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e17\u0e38\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07" },
      { title: "\u0e1a\u0e17\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e42\u0e14\u0e22 AI", body: "\u0e1a\u0e17\u0e1e\u0e23\u0e35\u0e27\u0e34\u0e27\u0e41\u0e25\u0e30\u0e2a\u0e23\u0e38\u0e1b\u0e2b\u0e25\u0e31\u0e07\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e16\u0e39\u0e01\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48\u0e04\u0e39\u0e48\u0e01\u0e31\u0e1a\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u2014 \u0e40\u0e02\u0e35\u0e22\u0e19\u0e42\u0e14\u0e22 AI \u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e0a\u0e31\u0e14\u0e40\u0e08\u0e19" },
    ],
    trackTitle: "\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14",
    trackBody: "\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e27\u0e31\u0e19\u0e41\u0e23\u0e01\u0e16\u0e39\u0e01\u0e40\u0e01\u0e47\u0e1a\u0e44\u0e27\u0e49\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e04\u0e31\u0e14\u0e40\u0e25\u0e37\u0e2d\u0e01 \u2014 \u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 \u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2b\u0e25\u0e31\u0e07\u0e17\u0e38\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c",
    trackCta: "\u0e14\u0e39\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 \u2192",
    leaguesTitle: "\u0e25\u0e35\u0e01\u0e17\u0e35\u0e48\u0e40\u0e23\u0e32\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21",
    leaguesIntro: "\u0e40\u0e23\u0e32\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e25\u0e35\u0e01\u0e2b\u0e25\u0e31\u0e01\u0e41\u0e25\u0e30\u0e17\u0e31\u0e27\u0e23\u0e4c\u0e19\u0e32\u0e40\u0e21\u0e19\u0e15\u0e4c\u0e17\u0e31\u0e48\u0e27\u0e42\u0e25\u0e01 \u0e15\u0e32\u0e23\u0e32\u0e07\u0e04\u0e30\u0e41\u0e19\u0e19 \u0e42\u0e1b\u0e23\u0e41\u0e01\u0e23\u0e21 \u0e41\u0e25\u0e30\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e43\u0e2b\u0e49\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e41\u0e15\u0e48\u0e25\u0e30\u0e25\u0e35\u0e01",
    leaguesSeason: "\u0e24\u0e14\u0e39\u0e01\u0e32\u0e25",
    toolsTitle: "\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e21\u0e37\u0e2d\u0e1f\u0e23\u0e35",
    toolsIntro: "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1b\u0e23\u0e30\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e20\u0e32\u0e1e\u0e01\u0e32\u0e23\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e14\u0e49\u0e27\u0e22\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e04\u0e33\u0e19\u0e27\u0e13\u0e40\u0e2b\u0e25\u0e48\u0e32\u0e19\u0e35\u0e49 \u2014 \u0e44\u0e21\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e2a\u0e21\u0e31\u0e04\u0e23",
    tools: [
      { name: "\u0e15\u0e31\u0e27\u0e04\u0e33\u0e19\u0e27\u0e13 De-vig", emoji: "\u2696\ufe0f", href: "/calculators/de-vig" },
      { name: "\u0e40\u0e01\u0e13\u0e11\u0e4c Kelly", emoji: "\ud83d\udcca", href: "/calculators/kelly" },
      { name: "\u0e41\u0e1b\u0e25\u0e07\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e2d\u0e23\u0e2d\u0e07", emoji: "\ud83d\udd04", href: "/calculators/odds-converter" },
      { name: "\u0e42\u0e21\u0e40\u0e14\u0e25 Poisson", emoji: "\ud83c\udfaf", href: "/calculators/poisson" },
    ],
    responsibleTitle: "\u0e40\u0e25\u0e48\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a",
    responsibleBody: "banhbong.net \u0e40\u0e1b\u0e47\u0e19\u0e04\u0e27\u0e32\u0e21\u0e1a\u0e31\u0e19\u0e40\u0e17\u0e34\u0e07 \u0e40\u0e23\u0e32\u0e41\u0e1a\u0e48\u0e07\u0e1b\u0e31\u0e19\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u2014 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19 \u0e2b\u0e32\u0e01\u0e01\u0e32\u0e23\u0e1e\u0e19\u0e31\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e19\u0e38\u0e01\u0e2d\u0e35\u0e01\u0e15\u0e48\u0e2d\u0e44\u0e1b \u0e42\u0e1b\u0e23\u0e14\u0e02\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d",
    contactBody: "\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e2b\u0e23\u0e37\u0e2d\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e1c\u0e48\u0e32\u0e19\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07\u0e40\u0e2b\u0e25\u0e48\u0e32\u0e19\u0e35\u0e49",
  },
  es: {
    title: "Acerca de banhbong.net",
    metaTitle: "Acerca de banhbong.net — Picks de fútbol de un curador, historial público",
    metaDescription:
      "banhbong.net es un sitio de picks de fútbol dirigido por un curador. Un humano elige cada partido; la IA escribe el análisis, liquida resultados y archiva cada pick públicamente, para siempre.",
    intro:
      "banhbong.net es un sitio de picks de f\u00fatbol dirigido por un curador. Un humano \u2014 The Curator \u2014 elige los partidos y los \u00e1ngulos. La IA opera todo lo dem\u00e1s: escribe el an\u00e1lisis, publica, liquida el resultado y archiva cada pick p\u00fablicamente, para siempre. Picks humanos, operaci\u00f3n por IA \u2014 declarado en cada jugada.",
    cards: [
      {
        heading: "Curado, no predicho",
        body: "Cada pick se investiga y se razona \u2014 nunca al azar, nunca garantizado. Compartimos perspectivas, no predicciones.",
      },
      {
        heading: "Cada pick, p\u00fablico para siempre",
        body: "Las cuotas se capturan en el momento en que se publica un pick y nunca se editan. Ganadas, perdidas, push \u2014 el historial completo queda a la vista, empezando desde cero.",
      },
      {
        heading: "Gratis, para la afici\u00f3n global",
        body: "Sin niveles VIP, sin muros de pago, sin afiliados de casas de apuestas. Jugadores de todas las zonas horarias, unidos por el amor al f\u00fatbol.",
      },
    ],
    personas: [
      {
        name: "The Curator",
        role: "Seleccionado por un humano",
        description: "Una persona real que investiga cada partido, encuentra el \u00e1ngulo y env\u00eda el pick. The Curator es la puerta humana \u2014 cada jugada comienza con una decisi\u00f3n humana. Historial separado, transparente desde el d\u00eda uno.",
      },
    ],
    promiseTitle: "La promesa",
    promises: [
      "Una sola puerta humana: The Curator env\u00eda el pick. Todo lo que sigue es automatizado y a prueba de manipulaci\u00f3n.",
      "Las medias ganancias cuentan como GANADA y las medias p\u00e9rdidas como PERDIDA en la insignia \u2014 pero el G/P real en unidades del h\u00e1ndicap asi\u00e1tico siempre se muestra junto al balance.",
      "Tambi\u00e9n publicamos nuestras p\u00e9rdidas. Solo entretenimiento \u2014 nunca asesor\u00eda financiera.",
    ],
    methodTitle: "C\u00f3mo se eligen los picks",
    methodIntro: "Cada pick pasa por un proceso de cinco pasos antes de publicarse.",
    methodSteps: [
      { title: "Investigaci\u00f3n pre-partido", body: "Tablas de forma, historial de enfrentamientos, reportes de lesiones, alineaciones confirmadas \u2014 todo se revisa antes de considerar cualquier mercado." },
      { title: "Escaneo de mercado", body: "Comparamos cuotas en m\u00faltiples casas de apuestas. Solo nos interesan mercados donde el precio parece desviado de la probabilidad real." },
      { title: "Verificaci\u00f3n de ventaja", body: "Un pick solo se publica cuando esperamos que la l\u00ednea de cierre se mueva a nuestro favor \u2014 es decir, el mercado termina d\u00e1ndonos la raz\u00f3n." },
      { title: "Apuesta fija en h\u00e1ndicap asi\u00e1tico", body: "Siempre una unidad por pick. Sin doblar, sin perseguir p\u00e9rdidas. Apuesta plana, documentada cada vez." },
      { title: "An\u00e1lisis generado por IA", body: "Una vista previa y un resumen automatizados se publican junto a cada pick \u2014 dando contexto al razonamiento, escrito por IA y declarado como tal." },
    ],
    trackTitle: "Historial",
    trackBody: "Cada pick desde el primer d\u00eda est\u00e1 archivado p\u00fablicamente. Sin capturas de pantalla, sin selecci\u00f3n \u2014 el libro completo, actualizado despu\u00e9s de cada partido.",
    trackCta: "Ver historial completo \u2192",
    leaguesTitle: "Ligas que cubrimos",
    leaguesIntro: "Seguimos las principales ligas y torneos del mundo. Clasificaciones, calendario y picks disponibles para cada una.",
    leaguesSeason: "Temporada",
    toolsTitle: "Herramientas gratuitas",
    toolsIntro: "Mejora tu propio an\u00e1lisis con estas calculadoras \u2014 sin necesidad de registro.",
    tools: [
      { name: "Calculadora de-vig", emoji: "\u2696\ufe0f", href: "/calculators/de-vig" },
      { name: "Criterio de Kelly", emoji: "\ud83d\udcca", href: "/calculators/kelly" },
      { name: "Conversor de cuotas", emoji: "\ud83d\udd04", href: "/calculators/odds-converter" },
      { name: "Modelo Poisson", emoji: "\ud83c\udfaf", href: "/calculators/poisson" },
    ],
    responsibleTitle: "Juego responsable",
    responsibleBody: "banhbong.net es entretenimiento. Compartimos perspectivas \u2014 nunca asesor\u00eda financiera. Si el juego deja de ser divertido, busca ayuda.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Cont\u00e1ctanos",
    contactBody: "S\u00edguenos o env\u00eda un mensaje en cualquiera de estos canales.",
  },
};
