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
  intro: string;
  cards: ReadonlyArray<{ heading: string; body: string }>;
  personas: [Persona, Persona];
  promiseTitle: string;
  promises: readonly string[];
  methodTitle: string;
  methodIntro: string;
  methodSteps: readonly MethodStep[];
  trackTitle: string;
  trackBody: string;
  trackCta: string;
  leaguesTitle: string;
  leaguesIntro: string;
  leaguesSeason: string;
  toolsTitle: string;
  toolsIntro: string;
  tools: readonly Tool[];
  responsibleTitle: string;
  responsibleBody: string;
  helplines: readonly Helpline[];
  contactTitle: string;
  contactBody: string;
}

export const copy: Record<Lang, AboutCopy> = {
  en: {
    title: "About WildlyPlay",
    intro:
      "WildlyPlay is a curator-led football picks site. A human \u2014 The Curator \u2014 picks the matches and the angles. AI operates everything else: it writes the analysis, publishes, settles the result and archives every pick publicly, forever. Human picks, AI operates \u2014 disclosed on every single play.",
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
      {
        name: "The Scout",
        role: "AI-operated \u00b7 Lower confidence",
        description: "An openly AI-operated persona that runs its own analysis. The Scout carries a separate ledger, a lower-confidence badge, and full AI disclosure on every pick. Never blended with The Curator\u2019s record.",
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
    responsibleBody: "WildlyPlay is entertainment. We share perspectives \u2014 never financial advice. If gambling stops being fun, reach out.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Get in touch",
    contactBody: "Follow us or drop a message on any of these channels.",
  },
  vi: {
    title: "V\u1ec1 WildlyPlay",
    intro:
      "WildlyPlay l\u00e0 trang k\u00e8o b\u00f3ng \u0111\u00e1 do con ng\u01b0\u1eddi tuy\u1ec3n ch\u1ecdn. M\u1ed9t con ng\u01b0\u1eddi \u2014 The Curator \u2014 ch\u1ecdn tr\u1eadn v\u00e0 g\u00f3c nh\u00ecn. AI v\u1eadn h\u00e0nh m\u1ecdi th\u1ee9 c\u00f2n l\u1ea1i: vi\u1ebft ph\u00e2n t\u00edch, xu\u1ea5t b\u1ea3n, k\u1ebft s\u1ed5 v\u00e0 l\u01b0u tr\u1eef c\u00f4ng khai m\u1ecdi k\u00e8o, v\u0129nh vi\u1ec5n. Ng\u01b0\u1eddi ch\u1ecdn k\u00e8o, AI v\u1eadn h\u00e0nh \u2014 c\u00f4ng khai tr\u00ean t\u1eebng k\u00e8o.",
    cards: [
      {
        heading: "Tuy\u1ec3n ch\u1ecdn, kh\u00f4ng ph\u1ea3i d\u1ef1 \u0111o\u00e1n",
        body: "M\u1ed7i k\u00e8o \u0111\u1ec1u \u0111\u01b0\u1ee3c nghi\u00ean c\u1ee9u v\u00e0 l\u1eadp lu\u1eadn \u2014 kh\u00f4ng ng\u1eabu nhi\u00ean, kh\u00f4ng cam k\u1ebft ch\u1eafc th\u1eafng. Ch\u00fang t\u00f4i chia s\u1ebb g\u00f3c nh\u00ecn, kh\u00f4ng ph\u1ea3i l\u1eddi ti\u00ean tri.",
      },
      {
        heading: "M\u1ecdi k\u00e8o c\u00f4ng khai v\u0129nh vi\u1ec5n",
        body: "T\u1ef7 l\u1ec7 k\u00e8o \u0111\u01b0\u1ee3c ch\u1ed1t ngay l\u00fac \u0111\u0103ng v\u00e0 kh\u00f4ng bao gi\u1edd ch\u1ec9nh s\u1eeda. Th\u1eafng, thua, h\u00f2a k\u00e8o \u2014 to\u00e0n b\u1ed9 th\u00e0nh t\u00edch lu\u00f4n hi\u1ec3n th\u1ecb, b\u1eaft \u0111\u1ea7u t\u1eeb s\u1ed1 0.",
      },
      {
        heading: "Mi\u1ec5n ph\u00ed, cho c\u1ed9ng \u0111\u1ed3ng to\u00e0n c\u1ea7u",
        body: "Kh\u00f4ng g\u00f3i VIP, kh\u00f4ng thu ph\u00ed, kh\u00f4ng affiliate nh\u00e0 c\u00e1i. Ng\u01b0\u1eddi ch\u01a1i t\u1eeb m\u1ecdi m\u00fai gi\u1edd, g\u1eafn k\u1ebft b\u1edfi t\u00ecnh y\u00eau b\u00f3ng \u0111\u00e1.",
      },
    ],
    personas: [
      {
        name: "The Curator",
        role: "Ng\u01b0\u1eddi th\u1eadt ch\u1ecdn k\u00e8o",
        description: "M\u1ed9t con ng\u01b0\u1eddi th\u1eadt nghi\u00ean c\u1ee9u m\u1ed7i tr\u1eadn, t\u00ecm g\u00f3c nh\u00ecn v\u00e0 g\u1eedi k\u00e8o. The Curator l\u00e0 c\u1ed5ng con ng\u01b0\u1eddi \u2014 m\u1ecdi k\u00e8o b\u1eaft \u0111\u1ea7u t\u1eeb quy\u1ebft \u0111\u1ecbnh c\u1ee7a con ng\u01b0\u1eddi. Th\u00e0nh t\u00edch theo d\u00f5i ri\u00eang, minh b\u1ea1ch t\u1eeb ng\u00e0y \u0111\u1ea7u.",
      },
      {
        name: "The Scout",
        role: "AI v\u1eadn h\u00e0nh \u00b7 \u0110\u1ed9 tin c\u1eady th\u1ea5p h\u01a1n",
        description: "Persona do AI v\u1eadn h\u00e0nh c\u00f4ng khai, ch\u1ea1y ph\u00e2n t\u00edch ri\u00eang. The Scout c\u00f3 s\u1ed5 theo d\u00f5i ri\u00eang, huy hi\u1ec7u \u0111\u1ed9 tin c\u1eady th\u1ea5p h\u01a1n, v\u00e0 c\u00f4ng b\u1ed1 AI tr\u00ean m\u1ecdi k\u00e8o. Kh\u00f4ng bao gi\u1edd tr\u1ed9n v\u1edbi th\u00e0nh t\u00edch c\u1ee7a The Curator.",
      },
    ],
    promiseTitle: "Cam k\u1ebft",
    promises: [
      "Ch\u1ec9 m\u1ed9t c\u1ed5ng con ng\u01b0\u1eddi: The Curator g\u1eedi k\u00e8o. M\u1ecdi b\u01b0\u1edbc sau \u0111\u00f3 \u0111\u1ec1u t\u1ef1 \u0111\u1ed9ng v\u00e0 kh\u00f4ng th\u1ec3 can thi\u1ec7p.",
      "Huy hi\u1ec7u t\u00ednh th\u1eafng n\u1eeda l\u00e0 TH\u1eaeNG, thua n\u1eeda l\u00e0 THUA \u2014 nh\u01b0ng l\u00e3i/l\u1ed7 \u0111\u01a1n v\u1ecb theo k\u00e8o ch\u00e2u \u00c1 th\u1ef1c t\u1ebf lu\u00f4n hi\u1ec3n th\u1ecb c\u1ea1nh th\u00e0nh t\u00edch.",
      "Thua ch\u00fang t\u00f4i c\u0169ng \u0111\u0103ng. Ch\u1ec9 mang t\u00ednh gi\u1ea3i tr\u00ed \u2014 kh\u00f4ng ph\u1ea3i l\u1eddi khuy\u00ean t\u00e0i ch\u00ednh.",
    ],
    methodTitle: "C\u00e1ch ch\u1ecdn k\u00e8o",
    methodIntro: "M\u1ed7i k\u00e8o tr\u1ea3i qua n\u0103m b\u01b0\u1edbc tr\u01b0\u1edbc khi \u0111\u01b0\u1ee3c xu\u1ea5t b\u1ea3n.",
    methodSteps: [
      { title: "Nghi\u00ean c\u1ee9u tr\u01b0\u1edbc tr\u1eadn", body: "B\u1ea3ng phong \u0111\u1ed9, l\u1ecbch s\u1eed \u0111\u1ed1i \u0111\u1ea7u, t\u00ecnh h\u00ecnh ch\u1ea5n th\u01b0\u01a1ng, \u0111\u1ed9i h\u00ecnh d\u1ef1 ki\u1ebfn \u2014 t\u1ea5t c\u1ea3 \u0111\u01b0\u1ee3c ki\u1ec3m tra tr\u01b0\u1edbc khi x\u00e9t b\u1ea5t k\u1ef3 th\u1ecb tr\u01b0\u1eddng n\u00e0o." },
      { title: "R\u00e0 so\u00e1t t\u1ef7 l\u1ec7 k\u00e8o", body: "So s\u00e1nh t\u1ef7 l\u1ec7 t\u1eeb nhi\u1ec1u nh\u00e0 c\u00e1i. Ch\u1ec9 quan t\u00e2m nh\u1eefng th\u1ecb tr\u01b0\u1eddng m\u00e0 gi\u00e1 l\u1ec7ch so v\u1edbi x\u00e1c su\u1ea5t th\u1ef1c t\u1ebf." },
      { title: "Ki\u1ec3m tra l\u1ee3i th\u1ebf", body: "K\u00e8o ch\u1ec9 \u0111\u01b0\u1ee3c \u0111\u0103ng khi ch\u00fang t\u00f4i k\u1ef3 v\u1ecdng gi\u00e1 \u0111\u00f3ng c\u1eeda s\u1ebd d\u1ecbch chuy\u1ec3n theo h\u01b0\u1edbng c\u1ee7a m\u00ecnh \u2014 ngh\u0129a l\u00e0 th\u1ecb tr\u01b0\u1eddng \u0111\u1ed3ng \u00fd v\u1edbi g\u00f3c nh\u00ecn c\u1ee7a ch\u00fang t\u00f4i." },
      { title: "K\u00e8o ch\u00e2u \u00c1 c\u1ed1 \u0111\u1ecbnh", body: "Lu\u00f4n m\u1ed9t \u0111\u01a1n v\u1ecb m\u1ed7i k\u00e8o. Kh\u00f4ng g\u1ea5p \u0111\u00f4i, kh\u00f4ng g\u1ee1 thua. C\u01b0\u1ee3c ph\u1eb3ng, ghi ch\u00e9p m\u1ecdi l\u1ea7n." },
      { title: "Ph\u00e2n t\u00edch b\u1eb1ng AI", body: "B\u00e0i ph\u00e2n t\u00edch tr\u01b0\u1edbc tr\u1eadn v\u00e0 t\u1ed5ng k\u1ebft sau tr\u1eadn \u0111\u01b0\u1ee3c AI vi\u1ebft v\u00e0 xu\u1ea5t b\u1ea3n c\u00f9ng m\u1ed7i k\u00e8o \u2014 c\u00f4ng khai ngu\u1ed3n AI." },
    ],
    trackTitle: "Th\u00e0nh t\u00edch",
    trackBody: "M\u1ecdi k\u00e8o t\u1eeb ng\u00e0y \u0111\u1ea7u \u0111\u01b0\u1ee3c l\u01b0u tr\u1eef c\u00f4ng khai. Kh\u00f4ng ch\u1ee5p m\u00e0n h\u00ecnh, kh\u00f4ng ch\u1ecdn l\u1ecdc \u2014 to\u00e0n b\u1ed9 s\u1ed5 s\u00e1ch, c\u1eadp nh\u1eadt sau m\u1ed7i tr\u1eadn.",
    trackCta: "Xem to\u00e0n b\u1ed9 th\u00e0nh t\u00edch \u2192",
    leaguesTitle: "Gi\u1ea3i \u0111\u1ea5u theo d\u00f5i",
    leaguesIntro: "Ch\u00fang t\u00f4i theo d\u00f5i c\u00e1c gi\u1ea3i l\u1edbn v\u00e0 c\u00e1c gi\u1ea3i \u0111\u1ea5u qu\u1ed1c t\u1ebf. B\u1ea3ng x\u1ebfp h\u1ea1ng, l\u1ecbch thi \u0111\u1ea5u v\u00e0 k\u00e8o c\u00f3 s\u1eb5n cho m\u1ed7i gi\u1ea3i.",
    leaguesSeason: "M\u00f9a gi\u1ea3i",
    toolsTitle: "C\u00f4ng c\u1ee5 mi\u1ec5n ph\u00ed",
    toolsIntro: "N\u00e2ng cao ph\u00e2n t\u00edch c\u1ee7a b\u1ea1n v\u1edbi c\u00e1c m\u00e1y t\u00ednh n\u00e0y \u2014 kh\u00f4ng c\u1ea7n \u0111\u0103ng k\u00fd.",
    tools: [
      { name: "T\u00ednh de-vig", emoji: "\u2696\ufe0f", href: "/calculators/de-vig" },
      { name: "Ti\u00eau chu\u1ea9n Kelly", emoji: "\ud83d\udcca", href: "/calculators/kelly" },
      { name: "Chuy\u1ec3n \u0111\u1ed5i t\u1ef7 l\u1ec7", emoji: "\ud83d\udd04", href: "/calculators/odds-converter" },
      { name: "M\u00f4 h\u00ecnh Poisson", emoji: "\ud83c\udfaf", href: "/calculators/poisson" },
    ],
    responsibleTitle: "Ch\u01a1i c\u00f3 tr\u00e1ch nhi\u1ec7m",
    responsibleBody: "WildlyPlay mang t\u00ednh gi\u1ea3i tr\u00ed. Ch\u00fang t\u00f4i chia s\u1ebb g\u00f3c nh\u00ecn \u2014 kh\u00f4ng ph\u1ea3i l\u1eddi khuy\u00ean t\u00e0i ch\u00ednh. N\u1ebfu c\u00e1 c\u01b0\u1ee3c kh\u00f4ng c\u00f2n vui, h\u00e3y t\u00ecm h\u1ed7 tr\u1ee3.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Li\u00ean h\u1ec7",
    contactBody: "Theo d\u00f5i ho\u1eb7c nh\u1eafn tin tr\u00ean c\u00e1c k\u00eanh sau.",
  },
  th: {
    title: "\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a WildlyPlay",
    intro:
      "WildlyPlay \u0e04\u0e37\u0e2d\u0e40\u0e27\u0e47\u0e1a\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25\u0e17\u0e35\u0e48\u0e04\u0e31\u0e14\u0e42\u0e14\u0e22\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c \u0e04\u0e19\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e04\u0e19 \u2014 The Curator \u2014 \u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e41\u0e25\u0e30\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e2a\u0e48\u0e27\u0e19 AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e17\u0e38\u0e01\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e17\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e37\u0e2d: \u0e40\u0e02\u0e35\u0e22\u0e19\u0e1a\u0e17\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c \u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48 \u0e15\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e1c\u0e25 \u0e41\u0e25\u0e30\u0e40\u0e01\u0e47\u0e1a\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e44\u0e27\u0e49\u0e15\u0e48\u0e2d\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e30\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c\u0e40\u0e25\u0e37\u0e2d\u0e01 AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23 \u2014 \u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22\u0e44\u0e27\u0e49\u0e43\u0e19\u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14",
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
        name: "The Curator",
        role: "\u0e04\u0e31\u0e14\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e42\u0e14\u0e22\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c",
        description: "\u0e04\u0e19\u0e08\u0e23\u0e34\u0e07\u0e17\u0e35\u0e48\u0e04\u0e49\u0e19\u0e04\u0e27\u0e49\u0e32\u0e17\u0e38\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c \u0e2b\u0e32\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u0e41\u0e25\u0e30\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 The Curator \u0e04\u0e37\u0e2d\u0e14\u0e48\u0e32\u0e19\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c \u2014 \u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e40\u0e23\u0e34\u0e48\u0e21\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e15\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e43\u0e08\u0e02\u0e2d\u0e07\u0e04\u0e19 \u0e2a\u0e16\u0e34\u0e15\u0e34\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e41\u0e22\u0e01 \u0e42\u0e1b\u0e23\u0e48\u0e07\u0e43\u0e2a\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e27\u0e31\u0e19\u0e41\u0e23\u0e01",
      },
      {
        name: "The Scout",
        role: "AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23 \u00b7 \u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32",
        description: "Persona \u0e17\u0e35\u0e48\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e42\u0e14\u0e22 AI \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22 \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e41\u0e22\u0e01\u0e2a\u0e48\u0e27\u0e19 The Scout \u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e41\u0e22\u0e01 \u0e1b\u0e49\u0e32\u0e22\u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32 \u0e41\u0e25\u0e30\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22 AI \u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e44\u0e21\u0e48\u0e1c\u0e2a\u0e21\u0e01\u0e31\u0e1a The Curator",
      },
    ],
    promiseTitle: "\u0e04\u0e33\u0e21\u0e31\u0e48\u0e19\u0e2a\u0e31\u0e0d\u0e0d\u0e32",
    promises: [
      "\u0e21\u0e35\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e14\u0e48\u0e32\u0e19\u0e40\u0e14\u0e35\u0e22\u0e27: The Curator \u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e17\u0e38\u0e01\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e08\u0e32\u0e01\u0e19\u0e31\u0e49\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e30\u0e41\u0e17\u0e23\u0e01\u0e41\u0e0b\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49",
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
    responsibleBody: "WildlyPlay \u0e40\u0e1b\u0e47\u0e19\u0e04\u0e27\u0e32\u0e21\u0e1a\u0e31\u0e19\u0e40\u0e17\u0e34\u0e07 \u0e40\u0e23\u0e32\u0e41\u0e1a\u0e48\u0e07\u0e1b\u0e31\u0e19\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07 \u2014 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19 \u0e2b\u0e32\u0e01\u0e01\u0e32\u0e23\u0e1e\u0e19\u0e31\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e19\u0e38\u0e01\u0e2d\u0e35\u0e01\u0e15\u0e48\u0e2d\u0e44\u0e1b \u0e42\u0e1b\u0e23\u0e14\u0e02\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d",
    contactBody: "\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e2b\u0e23\u0e37\u0e2d\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e1c\u0e48\u0e32\u0e19\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07\u0e40\u0e2b\u0e25\u0e48\u0e32\u0e19\u0e35\u0e49",
  },
  es: {
    title: "Acerca de WildlyPlay",
    intro:
      "WildlyPlay es un sitio de picks de f\u00fatbol dirigido por un curador. Un humano \u2014 The Curator \u2014 elige los partidos y los \u00e1ngulos. La IA opera todo lo dem\u00e1s: escribe el an\u00e1lisis, publica, liquida el resultado y archiva cada pick p\u00fablicamente, para siempre. Picks humanos, operaci\u00f3n por IA \u2014 declarado en cada jugada.",
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
      {
        name: "The Scout",
        role: "Operado por IA \u00b7 Menor confianza",
        description: "Un personaje operado abiertamente por IA con su propio an\u00e1lisis. The Scout tiene un historial separado, insignia de menor confianza y divulgaci\u00f3n completa de IA en cada pick. Nunca mezclado con el historial de The Curator.",
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
    responsibleBody: "WildlyPlay es entretenimiento. Compartimos perspectivas \u2014 nunca asesor\u00eda financiera. Si el juego deja de ser divertido, busca ayuda.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Cont\u00e1ctanos",
    contactBody: "S\u00edguenos o env\u00eda un mensaje en cualquiera de estos canales.",
  },
};
