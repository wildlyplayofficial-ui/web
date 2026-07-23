/**
 * Lightweight i18n — EN, VI, TH and ES.
 * Shared UI strings live here; long-form page copy stays local to each page.
 * Language is carried via path prefix: /vi/, /th/, /es/. EN = default (no prefix).
 */

export type Lang = "en" | "vi" | "th" | "es";

export const LANGS: readonly Lang[] = ["en", "vi", "th", "es"] as const;

export function resolveLang(value: string | string[] | undefined): Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value)
    ? (value as Lang)
    : "en";
}

/** Prefix an internal href with `/${lang}/` when needed. EN = no prefix. */
export function withLang(href: string, lang: Lang): string {
  if (lang === "en") return href;
  const clean = href.startsWith("/") ? href : `/${href}`;
  return `/${lang}${clean}`;
}

const BASE = "https://www.wildlyplay.com";

/** Build hreflang alternates + self-canonical for a page path. */
export function buildAlternates(path: string, currentLang: Lang = "en"): {
  canonical: string;
  languages: Record<string, string>;
} {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  const selfUrl = currentLang === "en" ? `${BASE}${clean || "/"}` : `${BASE}/${currentLang}${clean}`;
  return {
    canonical: selfUrl,
    languages: {
      "en": `${BASE}${clean || "/"}`,
      "vi": `${BASE}/vi${clean}`,
      "th": `${BASE}/th${clean}`,
      "es": `${BASE}/es${clean}`,
      "x-default": `${BASE}${clean || "/"}`,
    },
  };
}

export interface Dict {
  nav: {
    board: string;
    dailyLine: string;
    archive: string;
    stats: string;
    matches: string;
    allMatches: string;
    standings: string;
    news: string;
    about: string;
    donate: string;
    responsiblePlay: string;
    forum: string;
    guides: string;
    transparency: string;
    calculators: string;
    todaysPick: string;
    trackRecord: string;
    analysis: string;
    learn: string;
  };
  tagline: string;
  footerDisclaimer: string;
  board: {
    title: string;
    subtitle: string;
    seoDescription: string;
    formTitle: string;
    last30: string;
    emptyTitle: string;
    emptyBody: string;
    picksLabel: string;
    noPlaysLabel: string;
    watchingLabel: string;
    noPlaysTitle: string;
    noPlaysBody: string;
    resultsTitle: string;
    watchingTitle: string;
    trackRecordCta: string;
    asOf: string;
  };
  home: {
    seoDescription: string;
    latestAnalysis: string;
    viewBoard: string;
    trustCurator: string;
    trustScout: string;
  };
  archive: {
    title: string;
    subtitle: string;
    record: string;
    unitsPl: string;
    settledPlays: string;
    allMonths: string;
    empty: string;
    unitsNote: string;
  };
  stats: {
    title: string;
    subtitle: string;
    byLeague: string;
    byMarket: string;
    league: string;
    market: string;
    settled: string;
    roi: string;
    avgClv: string;
    chartTitle: string;
  };
  news: {
    title: string;
    subtitle: string;
    empty: string;
    backToNews: string;
  };
  analysis: {
    title: string;
    subtitle: string;
    seoDescription: string;
    empty: string;
    backTo: string;
  };
  guides: {
    title: string;
    subtitle: string;
    seoDescription: string;
    empty: string;
    backToGuides: string;
  };
  transparency: {
    title: string;
    subtitle: string;
    empty: string;
    backToReports: string;
  };
  calculators: {
    title: string;
    subtitle: string;
    deVig: string;
    deVigDesc: string;
    oddsConverter: string;
    oddsConverterDesc: string;
    kelly: string;
    kellyDesc: string;
    deVigCta: string;
    oddsConverterCta: string;
    kellyCta: string;
  };
  pick: {
    disclosure: string;
    disclosureScout: string;
    odds: string;
    stake: string;
    finalScore: string;
    viewPlay: string;
    curator: string;
    scoutLabel: string;
    halfWin: string;
    halfLoss: string;
    confidence: string;
    confLow: string;
    confMedium: string;
    confHigh: string;
    postedAt: string;
  };
  play: {
    backToBoard: string;
    pickedAt: string;
    market: string;
    line: string;
    result: string;
    rawOutcome: string;
    thesis: string;
    closing: string;
    clvNote: string;
    readRecap: string;
    sources: string;
  };
  outcome: {
    win: string;
    half_win: string;
    push: string;
    half_loss: string;
    loss: string;
    void: string;
  };
  poll: {
    title: string;
    follow: string;
    fade: string;
    skip: string;
  };
  matches: {
    title: string;
    allMatches: string;
    matchesSubtitle: string;
    empty: string;
    kicksOff: string;
    live: string;
    finished: string;
  };
  share: {
    title: string;
    copy: string;
    copied: string;
    more: string;
  };
  crowd: {
    title: string;
    followersWon: string; // "{units}" is replaced with the per-1u P/L
    followersLost: string;
  };
  badge: {
    upcoming: string;
    live: string;
    won: string;
    lost: string;
    push: string;
    void: string;
  };
  forum: {
    title: string;
    comingSoon: string;
    body: string;
  };
  donate: {
    copy: string;
    copied: string;
  };
  events: {
    title: string;
    goal: string;
    yellowCard: string;
    redCard: string;
    substitution: string;
  };
  scout: {
    heading: string;
    badge: string;
    noPlay: string;
    disclosure: string;
  };
  watching: {
    title: string;
    titlePast: string;
    note: string;
    titleScout: string;
    titlePastScout: string;
    noteScout: string;
    disclosureScout: string;
    /** Req 2: state-accurate footer for watching/no-play cards (no "chose this play"). */
    disclosureWatching: string;
    /** Req 3: badge text for watching/presence cards. */
    badge: string;
  };
  match: {
    backToMatches: string;
    curatorWatch: string;
    curatorPick: string;
    scoutWatch: string;
    scoutPick: string;
    articles: string;
    noContent: string;
    readArticle: string;
    readReview: string;
    viewMatch: string;
  };
  standings: {
    title: string;
    subtitle: string;
    group: string;
    team: string;
    mp: string;
    w: string;
    d: string;
    l: string;
    gf: string;
    ga: string;
    gd: string;
    pts: string;
    form: string;
    empty: string;
    knockout: string;
    knockoutFinished: string;
    seasonNote: string;
    titleFor: string;
    descriptionFor: string;
    schedule: string;
  };
}

const en: Dict = {
  nav: {
    board: "Daily Board",
    dailyLine: "Daily Line",
    archive: "Archive",
    stats: "Stats",
    matches: "Matches",
    allMatches: "Our Matches",
    standings: "Standings",
    news: "News",
    about: "About",
    donate: "Donate",
    responsiblePlay: "Responsible Play",
    forum: "Forum",
    guides: "Guides",
    transparency: "Transparency",
    calculators: "Calculators",
    todaysPick: "Today's Pick",
    trackRecord: "Track Record",
    analysis: "Analysis",
    learn: "Learn",
  },
  tagline: "Free Football Picks, Analysis & Betting Guides",
  footerDisclaimer: "Entertainment only. Play responsibly.",
  board: {
    title: "Daily Board",
    subtitle: "One match. One take. Only when there's an edge.",
    seoDescription: "Free daily football picks with a public track record — every win and loss posted forever. The Curator only plays when there's a real edge. Follow today's picks, no-plays and watchlist across Premier League, La Liga, Serie A and more.",
    formTitle: "Recent form",
    last30: "Last 30 days",
    emptyTitle: "No play today.",
    emptyBody:
      "The Curator only plays when there's an edge. No forced picks, no filler — check back tomorrow or follow Telegram for the next play.",
    picksLabel: "Picks",
    noPlaysLabel: "No-plays",
    watchingLabel: "Watching",
    noPlaysTitle: "No-plays today",
    noPlaysBody: "Evaluated and passed — no edge, no play.",
    resultsTitle: "Today's results",
    watchingTitle: "Watching",
    trackRecordCta: "Full track record",
    asOf: "as of",
  },
  home: {
    seoDescription: "Free daily football picks by a human curator. Every play public forever — wins and losses. Match analysis, odds tools and betting guides across Premier League, La Liga, Serie A, Bundesliga and more.",
    latestAnalysis: "Latest analysis",
    viewBoard: "View the Daily Board",
    trustCurator: "The Curator — real human, hand-picked plays",
    trustScout: "The Scout — openly AI, separate ledger, lower confidence",
  },
  archive: {
    title: "Play Archive",
    subtitle: "Every pick, public forever. We post our losses too.",
    record: "Record",
    unitsPl: "Units P/L",
    settledPlays: "settled plays",
    allMonths: "All months",
    empty: "No settled plays yet. The track record starts at zero — watch it build here.",
    unitsNote:
      "Badges count half-wins as WON and half-losses as LOST. Units P/L keeps the real Asian-handicap math.",
  },
  stats: {
    title: "Stats",
    subtitle: "The full track record, cut by league, market and time. Losses included.",
    byLeague: "By league",
    byMarket: "By market",
    league: "League",
    market: "Market",
    settled: "Settled",
    roi: "ROI",
    avgClv: "Avg CLV",
    chartTitle: "Cumulative units P/L",
  },
  news: {
    title: "News",
    subtitle: "Transfers, match news and updates from the leagues we cover.",
    empty: "No posts yet.",
    backToNews: "Back to News",
  },
  analysis: {
    title: "Analysis",
    subtitle: "Recaps and match notes, published automatically after every play.",
    seoDescription: "Free football match recaps, previews and betting analysis published after every play. Honest breakdowns of what worked, what didn't, and why — open to everyone, no paywall.",
    empty: "No posts yet.",
    backTo: "Back to Analysis",
  },
  guides: {
    title: "Guides",
    subtitle: "Evergreen guides on how we think about betting — calibration, discipline, and honest analysis.",
    seoDescription: "Free betting guides covering bankroll management, Asian handicap, Kelly criterion, closing line value and more. Educational resources to sharpen your edge — written by humans, no paywall.",
    empty: "No guides yet.",
    backToGuides: "Back to Guides",
  },
  transparency: {
    title: "Transparency",
    subtitle: "Our full track record — every pick, every month, wins and losses. No cherry-picked screenshots.",
    empty: "No reports yet.",
    backToReports: "Back to Transparency",
  },
  calculators: {
    title: "Calculators",
    subtitle: "Free betting math tools — de-vig lines, convert odds formats, and size your stakes with Kelly.",
    deVig: "De-Vig Calculator",
    deVigDesc: "Remove the bookmaker margin to find true odds. Supports multiplicative, additive, Shin, and power methods.",
    oddsConverter: "Odds Converter",
    oddsConverterDesc: "Convert between Decimal, Fractional, American, Malay, Hong Kong, Indonesian, and Implied Probability.",
    kelly: "Kelly Criterion",
    kellyDesc: "Calculate optimal stake size based on your edge. Fractional Kelly default for safer bankroll management.",
    deVigCta: "Learn the theory behind de-vigging",
    oddsConverterCta: "Learn all 7 odds formats in depth",
    kellyCta: "Learn the theory behind Kelly Criterion",
  },
  pick: {
    disclosure: "Human-picked, AI-operated. A human chose this play; AI wrote, published and settles it.",
    disclosureScout: "AI-picked, AI-written — Scout is an experimental AI persona, not a real person.",
    odds: "Odds at publish",
    stake: "Stake",
    finalScore: "FT",
    viewPlay: "View play",
    curator: "The Curator",
    scoutLabel: "The Scout",
    halfWin: "half-win",
    halfLoss: "half-loss",
    confidence: "Confidence",
    confLow: "Low",
    confMedium: "Medium",
    confHigh: "High",
    postedAt: "Posted",
  },
  play: {
    backToBoard: "Back to the Board",
    pickedAt: "Picked in-play at",
    market: "Market",
    line: "Line",
    result: "Result",
    rawOutcome: "Raw AH outcome",
    thesis: "The thesis",
    closing: "Closing",
    clvNote: "CLV = closing line value — positive means the pick beat the market.",
    readRecap: "Read the match recap",
    sources: "Sources",
  },
  outcome: {
    win: "Win",
    half_win: "Half-win",
    push: "Push",
    half_loss: "Half-loss",
    loss: "Loss",
    void: "Void",
  },
  poll: {
    title: "Your call on this play:",
    follow: "Follow",
    fade: "Fade",
    skip: "Skip",
  },
  matches: {
    title: "Today's Matches",
    allMatches: "Our Matches",
    matchesSubtitle: "Every match we've covered — picks, analysis and watchlists.",
    empty: "No matches today",
    kicksOff: "Kicks off in",
    live: "LIVE",
    finished: "FT",
  },
  share: {
    title: "Share this play:",
    copy: "Copy link",
    copied: "Copied!",
    more: "More…",
  },
  crowd: {
    title: "Crowd vs Curator",
    followersWon: "Followers won ({units} per 1u)",
    followersLost: "Followers lost",
  },
  badge: {
    upcoming: "UPCOMING",
    live: "LIVE",
    won: "WON",
    lost: "LOST",
    push: "PUSH",
    void: "VOID",
  },
  forum: {
    title: "Forum",
    comingSoon: "Coming soon",
    body: "The WildlyPlay forum opens once the crowd is big enough. Until then, the conversation lives on Telegram.",
  },
  donate: {
    copy: "Copy address",
    copied: "Copied!",
  },
  events: {
    title: "Match Events",
    goal: "Goal",
    yellowCard: "Yellow Card",
    redCard: "Red Card",
    substitution: "Sub",
  },
  scout: {
    heading: "Alternative Picks \u00b7 The Scout",
    badge: "Lower Confidence",
    noPlay: "The Scout \u2014 no Alt play today.",
    disclosure: "The Scout \u2014 a fictional, AI-operated WildlyPlay persona \u00b7 lower confidence \u00b7 separate ledger",
  },
  watching: {
    title: "The Curator is watching",
    titlePast: "The Curator was watching",
    note: "Curator note",
    titleScout: "The Scout is watching",
    titlePastScout: "The Scout was watching",
    noteScout: "Scout note",
    disclosureScout: "AI-picked, AI-written — Scout is an experimental AI persona, not a real person.",
    disclosureWatching: "AI-written coverage. No play taken \u2014 we\u2019re watching this match, not betting it.",
    badge: "WATCHING \u00b7 NOT A PICK",
  },
  match: {
    backToMatches: "Back",
    curatorWatch: "Curator's Watch",
    curatorPick: "Curator's Pick",
    scoutWatch: "Scout's Watch",
    scoutPick: "Scout's Pick",
    articles: "Match Articles",
    noContent: "No content for this match yet.",
    readArticle: "Read article",
    readReview: "Read full review",
    viewMatch: "View match",
  },
  standings: {
    title: "Competitions",
    subtitle: "Standings, fixtures and predictions by league.",
    group: "Group",
    team: "Team",
    mp: "MP",
    w: "W",
    d: "D",
    l: "L",
    gf: "GF",
    ga: "GA",
    gd: "GD",
    pts: "Pts",
    form: "Form",
    empty: "Standings data is not available yet. Check back once the group stage begins.",
    knockout: "Knockout Stage",
    knockoutFinished: "Completed Rounds",
    seasonNote: "{season} season",
    titleFor: "{name} Standings",
    descriptionFor: "{name} {season} standings, fixtures, form guide and match predictions. Updated live.",
    schedule: "Schedule",
  },
};

const vi: Dict = {
  nav: {
    board: "Bảng Kèo",
    dailyLine: "Daily Line",
    archive: "Lưu Trữ",
    stats: "Thống Kê",
    matches: "Trận Đấu",
    allMatches: "Trận Của Chúng Ta",
    standings: "BXH",
    news: "Tin Tức",
    about: "Giới Thiệu",
    donate: "Ủng Hộ",
    responsiblePlay: "Chơi Có Trách Nhiệm",
    forum: "Diễn Đàn",
    guides: "Hướng Dẫn",
    transparency: "Minh Bạch",
    calculators: "Công Cụ",
    todaysPick: "Kèo Hôm Nay",
    trackRecord: "Thành Tích",
    analysis: "Phân Tích",
    learn: "Học Hỏi",
  },
  tagline: "Kèo Bóng Đá Miễn Phí, Phân Tích & Hướng Dẫn Cá Cược",
  footerDisclaimer: "Chỉ mang tính giải trí. Chơi có trách nhiệm.",
  board: {
    title: "Bảng Kèo Hôm Nay",
    subtitle: "Một trận. Một góc nhìn. Chỉ khi thật sự có lợi thế.",
    seoDescription: "Kèo bóng đá miễn phí hằng ngày với thành tích công khai — mọi kèo thắng lẫn thua đều đăng vĩnh viễn. The Curator chỉ xuống kèo khi có lợi thế thật sự. Theo dõi kèo hôm nay, trận bỏ qua và danh sách theo dõi trên Premier League, La Liga, Serie A và nhiều giải khác.",
    formTitle: "Phong độ gần đây",
    last30: "30 ngày qua",
    emptyTitle: "Hôm nay không có kèo.",
    emptyBody:
      "The Curator chỉ chơi khi thấy lợi thế thật sự. Không kèo gượng ép, không câu kéo — quay lại ngày mai hoặc theo dõi Telegram để nhận kèo tiếp theo.",
    picksLabel: "Kèo chọn",
    noPlaysLabel: "Bỏ qua",
    watchingLabel: "Đang theo dõi",
    noPlaysTitle: "Trận bỏ qua hôm nay",
    noPlaysBody: "Đã phân tích nhưng không xuống kèo — không có lợi thế thì không chơi.",
    resultsTitle: "Kết quả hôm nay",
    watchingTitle: "Đang theo dõi",
    trackRecordCta: "Xem toàn bộ thành tích",
    asOf: "tính đến",
  },
  home: {
    seoDescription: "Kèo bóng đá miễn phí mỗi ngày do người thật chọn. Mọi kèo công khai vĩnh viễn — thắng lẫn thua. Phân tích trận đấu, công cụ tỷ lệ cược và hướng dẫn cho Premier League, La Liga, Serie A, Bundesliga và nhiều giải khác.",
    latestAnalysis: "Phân tích mới nhất",
    viewBoard: "Xem Bảng Kèo Hôm Nay",
    trustCurator: "The Curator — người thật, tự tay chọn kèo",
    trustScout: "The Scout — công khai là AI, sổ theo dõi riêng, độ tin cậy thấp hơn",
  },
  archive: {
    title: "Lưu Trữ Kèo",
    subtitle: "Mọi kèo đều công khai vĩnh viễn. Thua chúng tôi cũng đăng.",
    record: "Thành tích",
    unitsPl: "Lãi/Lỗ (unit)",
    settledPlays: "kèo đã kết sổ",
    allMonths: "Tất cả các tháng",
    empty: "Chưa có kèo nào kết sổ. Thành tích bắt đầu từ con số 0 — theo dõi tại đây.",
    unitsNote:
      "Huy hiệu tính thắng nửa là THẮNG, thua nửa là THUA. Lãi/Lỗ unit giữ nguyên cách tính kèo châu Á thực tế.",
  },
  stats: {
    title: "Thống Kê",
    subtitle: "Toàn bộ thành tích, bóc tách theo giải đấu, loại kèo và thời gian. Tính cả kèo thua.",
    byLeague: "Theo giải đấu",
    byMarket: "Theo loại kèo",
    league: "Giải đấu",
    market: "Loại kèo",
    settled: "Đã kết sổ",
    roi: "ROI",
    avgClv: "CLV trung bình",
    chartTitle: "Lãi/Lỗ unit tích lũy",
  },
  news: {
    title: "Tin Tức",
    subtitle: "Chuyển nhượng, tin trận đấu và cập nhật từ các giải chúng tôi theo dõi.",
    empty: "Chưa có bài viết.",
    backToNews: "Quay lại Tin Tức",
  },
  analysis: {
    title: "Phân Tích",
    subtitle: "Recap và ghi chú trận đấu, tự động xuất bản sau mỗi kèo.",
    seoDescription: "Recap trận đấu, nhận định trước trận và phân tích cá cược bóng đá miễn phí, xuất bản sau mỗi kèo. Phân tích trung thực — điều gì đúng, điều gì sai và tại sao — mở cho tất cả, không tính phí.",
    empty: "Chưa có bài viết.",
    backTo: "Quay lại Phân Tích",
  },
  guides: {
    title: "Hướng Dẫn",
    subtitle: "Các bài hướng dẫn chuyên sâu về tư duy cá cược — hiệu chuẩn, kỷ luật và phân tích trung thực.",
    seoDescription: "Hướng dẫn cá cược miễn phí về quản lý vốn, kèo châu Á, tiêu chí Kelly, giá trị đường đóng kèo và nhiều hơn nữa. Tài liệu giáo dục giúp nâng cao lợi thế — viết bởi người thật, không tính phí.",
    empty: "Chưa có bài hướng dẫn.",
    backToGuides: "Quay lại Hướng Dẫn",
  },
  transparency: {
    title: "Minh Bạch",
    subtitle: "Toàn bộ lịch sử kèo — mọi pick, mọi tháng, thắng lẫn thua. Không chọn lọc ảnh chụp màn hình.",
    empty: "Chưa có báo cáo.",
    backToReports: "Quay lại Minh Bạch",
  },
  calculators: {
    title: "Công Cụ Tính",
    subtitle: "Công cụ toán cá cược miễn phí — loại margin nhà cái, chuyển đổi tỷ lệ cược, và tính mức đặt Kelly.",
    deVig: "Loại Margin (De-Vig)",
    deVigDesc: "Loại bỏ margin nhà cái để tìm tỷ lệ thực. Hỗ trợ phương pháp nhân, cộng, Shin, và lũy thừa.",
    oddsConverter: "Chuyển Đổi Cược",
    oddsConverterDesc: "Chuyển đổi giữa Thập phân, Phân số, Mỹ, Malay, Hồng Kông, Indonesia và Xác suất ngầm định.",
    kelly: "Tiêu Chí Kelly",
    kellyDesc: "Tính mức đặt tối ưu dựa trên lợi thế. Mặc định Kelly phân số cho quản lý vốn an toàn.",
    deVigCta: "Tìm hiểu lý thuyết đằng sau de-vigging",
    oddsConverterCta: "Tìm hiểu chi tiết 7 định dạng cược",
    kellyCta: "Tìm hiểu lý thuyết đằng sau Kelly Criterion",
  },
  pick: {
    disclosure: "Người chọn kèo, AI vận hành. Con người chọn kèo này; AI viết, đăng và kết sổ.",
    disclosureScout: "AI chọn kèo, AI viết bài — Scout là nhân vật AI thử nghiệm, không phải người thật.",
    odds: "Odds lúc đăng",
    stake: "Mức cược",
    finalScore: "FT",
    viewPlay: "Xem chi tiết kèo",
    curator: "The Curator",
    scoutLabel: "The Scout",
    halfWin: "thắng nửa",
    halfLoss: "thua nửa",
    confidence: "Độ tự tin",
    confLow: "Thấp",
    confMedium: "Trung bình",
    confHigh: "Cao",
    postedAt: "Đăng lúc",
  },
  play: {
    backToBoard: "Quay lại Bảng Kèo",
    pickedAt: "Vào kèo khi tỉ số",
    market: "Loại kèo",
    line: "Mốc kèo",
    result: "Kết quả",
    rawOutcome: "Kết quả kèo gốc",
    thesis: "Nhận định",
    closing: "Odds đóng kèo",
    clvNote: "CLV = giá trị so với odds đóng kèo — dương nghĩa là kèo thắng được thị trường.",
    readRecap: "Đọc bài nhìn lại trận đấu",
    sources: "Nguồn tham khảo",
  },
  outcome: {
    win: "Thắng",
    half_win: "Thắng nửa",
    push: "Hòa kèo",
    half_loss: "Thua nửa",
    loss: "Thua",
    void: "Hủy",
  },
  poll: {
    title: "Bạn nghĩ sao về kèo này?",
    follow: "Theo kèo",
    fade: "Ngược kèo",
    skip: "Bỏ qua",
  },
  matches: {
    title: "Trận Đấu Hôm Nay",
    allMatches: "Trận Của Chúng Ta",
    matchesSubtitle: "Mọi trận đấu chúng tôi đã phân tích — kèo, nhận định và theo dõi.",
    empty: "Hôm nay không có trận",
    kicksOff: "Còn",
    live: "ĐANG ĐÁ",
    finished: "KT",
  },
  share: {
    title: "Chia sẻ kèo này:",
    copy: "Sao chép link",
    copied: "Đã sao chép!",
    more: "Khác…",
  },
  crowd: {
    title: "Cộng đồng vs The Curator",
    followersWon: "Người theo kèo thắng ({units} mỗi 1u)",
    followersLost: "Người theo kèo thua",
  },
  badge: {
    upcoming: "SẮP ĐÁ",
    live: "LIVE",
    won: "THẮNG",
    lost: "THUA",
    push: "HÒA KÈO",
    void: "HỦY",
  },
  forum: {
    title: "Diễn Đàn",
    comingSoon: "Sắp ra mắt",
    body: "Diễn đàn WildlyPlay sẽ mở khi cộng đồng đủ lớn. Hiện tại, mọi thảo luận diễn ra trên Telegram.",
  },
  donate: {
    copy: "Sao chép địa chỉ",
    copied: "Đã sao chép!",
  },
  events: {
    title: "Diễn biến trận",
    goal: "Bàn thắng",
    yellowCard: "Thẻ vàng",
    redCard: "Thẻ đỏ",
    substitution: "Thay người",
  },
  scout: {
    heading: "K\u00e8o Ph\u1ee5 \u00b7 The Scout",
    badge: "\u0110\u1ed9 tin th\u1ea5p h\u01a1n",
    noPlay: "The Scout \u2014 kh\u00f4ng c\u00f3 k\u00e8o ph\u1ee5 h\u00f4m nay.",
    disclosure: "The Scout \u2014 nh\u00e2n v\u1eadt gi\u1ea3 t\u01b0\u1edfng, AI-operated, c\u1ee7a WildlyPlay \u00b7 \u0111\u1ed9 tin th\u1ea5p h\u01a1n \u00b7 s\u1ed5 ri\u00eang",
  },
  watching: {
    title: "Curator \u0111ang theo d\u00f5i",
    titlePast: "Curator \u0111\u00e3 theo d\u00f5i",
    note: "Ghi ch\u00fa t\u1eeb Curator",
    titleScout: "Scout \u0111ang theo d\u00f5i",
    titlePastScout: "Scout \u0111\u00e3 theo d\u00f5i",
    noteScout: "Ghi ch\u00fa t\u1eeb Scout",
    disclosureScout: "AI ch\u1ecdn k\u00e8o, AI vi\u1ebft b\u00e0i \u2014 Scout l\u00e0 nh\u00e2n v\u1eadt AI th\u1eed nghi\u1ec7m, kh\u00f4ng ph\u1ea3i ng\u01b0\u1eddi th\u1eadt.",
    disclosureWatching: "B\u00e0i vi\u1ebft b\u1edfi AI. Kh\u00f4ng xu\u1ed1ng k\u00e8o \u2014 ch\u00fang t\u00f4i theo d\u00f5i tr\u1eadn n\u00e0y, kh\u00f4ng \u0111\u1eb7t c\u01b0\u1ee3c.",
    badge: "THEO D\u00d5I \u00b7 KH\u00d4NG PH\u1ea2I PICK",
  },
  match: {
    backToMatches: "Quay l\u1ea1i",
    curatorWatch: "Curator \u0111ang theo d\u00f5i",
    curatorPick: "K\u00e8o c\u1ee7a Curator",
    scoutWatch: "Scout \u0111ang theo d\u00f5i",
    scoutPick: "K\u00e8o c\u1ee7a Scout",
    articles: "B\u00e0i vi\u1ebft v\u1ec1 tr\u1eadn",
    noContent: "Ch\u01b0a c\u00f3 n\u1ed9i dung cho tr\u1eadn n\u00e0y.",
    readArticle: "\u0110\u1ecdc b\u00e0i",
    readReview: "\u0110\u1ecdc \u0111\u00e1nh gi\u00e1 \u0111\u1ea7y \u0111\u1ee7",
    viewMatch: "Xem tr\u1eadn \u0111\u1ea5u",
  },
  standings: {
    title: "Các Giải Đấu",
    subtitle: "Bảng xếp hạng, lịch thi đấu và dự đoán theo giải.",
    group: "B\u1ea3ng",
    team: "\u0110\u1ed9i",
    mp: "TR",
    w: "T",
    d: "H",
    l: "B",
    gf: "BT",
    ga: "BB",
    gd: "HS",
    pts: "\u0110",
    form: "Phong \u0111\u1ed9",
    empty: "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u b\u1ea3ng x\u1ebfp h\u1ea1ng. Quay l\u1ea1i khi v\u00f2ng b\u1ea3ng b\u1eaft \u0111\u1ea7u.",
    knockout: "V\u00f2ng Lo\u1ea1i Tr\u1ef1c Ti\u1ebfp",
    knockoutFinished: "C\u00e1c v\u00f2ng \u0111\u00e3 k\u1ebft th\u00fac",
    seasonNote: "M\u00f9a {season}",
    titleFor: "B\u1ea3ng x\u1ebfp h\u1ea1ng {name}",
    descriptionFor: "B\u1ea3ng x\u1ebfp h\u1ea1ng, l\u1ecbch thi \u0111\u1ea5u, phong \u0111\u1ed9 v\u00e0 d\u1ef1 \u0111o\u00e1n {name} {season}. C\u1eadp nh\u1eadt tr\u1ef1c ti\u1ebfp.",
    schedule: "L\u1ecbch thi \u0111\u1ea5u",
  },
};

const th: Dict = {
  nav: {
    board: "บอร์ดประจำวัน",
    dailyLine: "Daily Line",
    archive: "คลังทีเด็ด",
    stats: "สถิติ",
    matches: "แมตช์",
    allMatches: "แมตช์ของเรา",
    standings: "ตารางคะแนน",
    news: "ข่าวสาร",
    about: "เกี่ยวกับเรา",
    donate: "สนับสนุน",
    responsiblePlay: "เล่นอย่างมีความรับผิดชอบ",
    forum: "ฟอรั่ม",
    guides: "คู่มือ",
    transparency: "ความโปร่งใส",
    calculators: "เครื่องคิดเลข",
    todaysPick: "ทีเด็ดวันนี้",
    trackRecord: "สถิติผลงาน",
    analysis: "บทวิเคราะห์",
    learn: "เรียนรู้",
  },
  tagline: "ทีเด็ดบอลฟรี บทวิเคราะห์ & คู่มือเดิมพัน",
  footerDisclaimer: "เพื่อความบันเทิงเท่านั้น โปรดเล่นอย่างมีความรับผิดชอบ",
  board: {
    title: "บอร์ดประจำวัน",
    subtitle: "หนึ่งแมตช์ หนึ่งมุมมอง เฉพาะวันที่เห็นความได้เปรียบจริงเท่านั้น",
    seoDescription: "ทีเด็ดบอลฟรีรายวันพร้อมสถิติสาธารณะ — ทุกชนะและแพ้โพสต์ถาวร The Curator เล่นเฉพาะเมื่อมีความได้เปรียบจริงเท่านั้น ติดตามทีเด็ดวันนี้ แมตช์ที่ไม่เล่น และรายการจับตาใน Premier League, La Liga, Serie A และอีกมากมาย",
    formTitle: "ฟอร์มล่าสุด",
    last30: "30 วันที่ผ่านมา",
    emptyTitle: "วันนี้ไม่มีทีเด็ด",
    emptyBody:
      "The Curator จะเล่นเฉพาะเมื่อเห็นความได้เปรียบจริงเท่านั้น ไม่มีทีเด็ดยัดเยียด ไม่มีของแถม — กลับมาดูใหม่พรุ่งนี้ หรือติดตาม Telegram เพื่อรอทีเด็ดถัดไป",
    picksLabel: "ทีเด็ด",
    noPlaysLabel: "ไม่เล่น",
    watchingLabel: "กำลังจับตา",
    noPlaysTitle: "แมตช์ที่ไม่เล่นวันนี้",
    noPlaysBody: "วิเคราะห์แล้วแต่ไม่เล่น — ไม่มีความได้เปรียบ ก็ไม่เดิมพัน",
    resultsTitle: "ผลวันนี้",
    watchingTitle: "กำลังจับตา",
    trackRecordCta: "ดูสถิติผลงานทั้งหมด",
    asOf: "ณ วันที่",
  },
  home: {
    seoDescription: "ทีเด็ดบอลฟรีรายวันโดยคิวเรเตอร์มนุษย์ ทุกทีเด็ดเปิดเผยต่อสาธารณะตลอดไป ทั้งชนะและแพ้ วิเคราะห์แมตช์ เครื่องมืออัตราต่อรอง และคู่มือสำหรับพรีเมียร์ลีก ลาลีกา เซเรียอา บุนเดสลีกา และอีกมากมาย",
    latestAnalysis: "บทวิเคราะห์ล่าสุด",
    viewBoard: "ดูบอร์ดประจำวัน",
    trustCurator: "The Curator — คนจริง เลือกทีเด็ดด้วยมือ",
    trustScout: "The Scout — เป็น AI อย่างเปิดเผย บัญชีแยก ความมั่นใจต่ำกว่า",
  },
  archive: {
    title: "คลังทีเด็ด",
    subtitle: "ทุกทีเด็ดเปิดเผยต่อสาธารณะตลอดไป แพ้เราก็ลงให้ดู",
    record: "สถิติ",
    unitsPl: "กำไร/ขาดทุน (ยูนิต)",
    settledPlays: "รายการที่ตัดสินแล้ว",
    allMonths: "ทุกเดือน",
    empty: "ยังไม่มีรายการที่ตัดสิน สถิติเริ่มต้นจากศูนย์ — ติดตามการเติบโตได้ที่นี่",
    unitsNote:
      "ป้ายสถานะนับชนะครึ่งเป็น ชนะ และแพ้ครึ่งเป็น แพ้ ส่วนกำไร/ขาดทุนยูนิตคิดตามราคาต่อรองบอลเอเชียจริง",
  },
  stats: {
    title: "สถิติ",
    subtitle: "สถิติทั้งหมด แยกตามลีก รูปแบบเดิมพัน และช่วงเวลา แพ้ก็นับรวมด้วย",
    byLeague: "แยกตามลีก",
    byMarket: "แยกตามรูปแบบเดิมพัน",
    league: "ลีก",
    market: "รูปแบบเดิมพัน",
    settled: "ตัดสินแล้ว",
    roi: "ROI",
    avgClv: "CLV เฉลี่ย",
    chartTitle: "กำไร/ขาดทุนสะสม (ยูนิต)",
  },
  news: {
    title: "ข่าวสาร",
    subtitle: "ข่าวย้ายทีม ข่าวแมตช์ และอัปเดตจากลีกที่เราติดตาม",
    empty: "ยังไม่มีบทความ",
    backToNews: "กลับไปหน้าข่าวสาร",
  },
  analysis: {
    title: "บทวิเคราะห์",
    subtitle: "สรุปผลและบันทึกแมตช์ เผยแพร่อัตโนมัติหลังจบทุกทีเด็ด",
    seoDescription: "สรุปผลแมตช์ฟุตบอล พรีวิวก่อนเกม และบทวิเคราะห์เดิมพันฟรี เผยแพร่หลังจบทุกทีเด็ด วิเคราะห์ตรงไปตรงมา — อะไรเวิร์ก อะไรไม่เวิร์ก และเพราะอะไร — เปิดให้ทุกคน ไม่มีค่าใช้จ่าย",
    empty: "ยังไม่มีบทความ",
    backTo: "กลับไปหน้าบทวิเคราะห์",
  },
  guides: {
    title: "คู่มือ",
    subtitle: "คู่มือเชิงลึกเกี่ยวกับแนวคิดการเดิมพัน — การสอบเทียบ วินัย และการวิเคราะห์ตรงไปตรงมา",
    seoDescription: "คู่มือเดิมพันฟรีครอบคลุมการจัดการเงินทุน บอลเอเชีย เกณฑ์ Kelly มูลค่าราคาปิด และอื่นๆ สื่อการเรียนรู้เพื่อเพิ่มความได้เปรียบ — เขียนโดยคน ไม่มีค่าใช้จ่าย",
    empty: "ยังไม่มีคู่มือ",
    backToGuides: "กลับไปหน้าคู่มือ",
  },
  transparency: {
    title: "ความโปร่งใส",
    subtitle: "ประวัติผลงานทั้งหมด — ทุกทีเด็ด ทุกเดือน ทั้งชนะและแพ้ ไม่มีการเลือกเฉพาะภาพหน้าจอที่ดูดี",
    empty: "ยังไม่มีรายงาน",
    backToReports: "กลับไปหน้าความโปร่งใส",
  },
  calculators: {
    title: "เครื่องคิดเลข",
    subtitle: "เครื่องมือคำนวณเดิมพันฟรี — ลบมาร์จิ้น แปลงรูปแบบอัตราต่อรอง และกำหนดขนาดเดิมพันด้วย Kelly",
    deVig: "คำนวณลบมาร์จิ้น",
    deVigDesc: "ลบมาร์จิ้นของเจ้ามือเพื่อหาอัตราต่อรองจริง รองรับวิธีคูณ บวก Shin และกำลัง",
    oddsConverter: "แปลงอัตราต่อรอง",
    oddsConverterDesc: "แปลงระหว่าง ทศนิยม เศษส่วน อเมริกัน มาเลย์ ฮ่องกง อินโดนีเซีย และความน่าจะเป็นโดยนัย",
    kelly: "เกณฑ์ Kelly",
    kellyDesc: "คำนวณขนาดเดิมพันที่เหมาะสมตามความได้เปรียบ ค่าเริ่มต้น Kelly เศษส่วนเพื่อจัดการเงินทุนอย่างปลอดภัย",
    deVigCta: "เรียนรู้ทฤษฎี de-vigging เชิงลึก",
    oddsConverterCta: "เรียนรู้รูปแบบอัตราต่อรองทั้ง 7 แบบ",
    kellyCta: "เรียนรู้ทฤษฎี Kelly Criterion เชิงลึก",
  },
  pick: {
    disclosure: "คนเลือก AI ดำเนินการ — มนุษย์เป็นผู้เลือกทีเด็ดนี้ ส่วน AI เขียน เผยแพร่ และตัดสินผล",
    disclosureScout: "AI เลือกเดิมพัน เขียนโดย AI — Scout เป็นตัวละคร AI ทดลอง ไม่ใช่บุคคลจริง",
    odds: "ราคาตอนเผยแพร่",
    stake: "เดิมพัน",
    finalScore: "FT",
    viewPlay: "ดูรายละเอียดทีเด็ด",
    curator: "The Curator",
    scoutLabel: "The Scout",
    halfWin: "ชนะครึ่ง",
    halfLoss: "แพ้ครึ่ง",
    confidence: "ความมั่นใจ",
    confLow: "ต่ำ",
    confMedium: "ปานกลาง",
    confHigh: "สูง",
    postedAt: "เผยแพร่เมื่อ",
  },
  play: {
    backToBoard: "กลับไปหน้าบอร์ด",
    pickedAt: "เลือกตอนสกอร์",
    market: "รูปแบบเดิมพัน",
    line: "ราคาต่อรอง",
    result: "ผลลัพธ์",
    rawOutcome: "ผล AH ตามจริง",
    thesis: "บทวิเคราะห์",
    closing: "ราคาปิด",
    clvNote: "CLV = มูลค่าเทียบราคาปิด — ค่าบวกหมายถึงทีเด็ดชนะตลาด",
    readRecap: "อ่านสรุปผลการแข่งขัน",
    sources: "แหล่งข้อมูล",
  },
  outcome: {
    win: "ชนะ",
    half_win: "ชนะครึ่ง",
    push: "คืนทุน",
    half_loss: "แพ้ครึ่ง",
    loss: "แพ้",
    void: "โมฆะ",
  },
  poll: {
    title: "คุณว่าไงกับทีเด็ดนี้?",
    follow: "ตาม",
    fade: "สวน",
    skip: "ข้าม",
  },
  matches: {
    title: "แมตช์วันนี้",
    allMatches: "แมตช์ของเรา",
    matchesSubtitle: "ทุกแมตช์ที่เราวิเคราะห์ — ทีเด็ด บทวิเคราะห์ และรายการจับตา",
    empty: "วันนี้ไม่มีแมตช์",
    kicksOff: "เริ่มใน",
    live: "สด",
    finished: "จบ",
  },
  share: {
    title: "แชร์ทีเด็ดนี้:",
    copy: "คัดลอกลิงก์",
    copied: "คัดลอกแล้ว!",
    more: "อื่นๆ…",
  },
  crowd: {
    title: "คอมมูนิตี้ vs The Curator",
    followersWon: "คนที่ตามชนะ ({units} ต่อ 1u)",
    followersLost: "คนที่ตามแพ้",
  },
  badge: {
    upcoming: "รอแข่ง",
    live: "LIVE",
    won: "ชนะ",
    lost: "แพ้",
    push: "คืนทุน",
    void: "โมฆะ",
  },
  forum: {
    title: "ฟอรั่ม",
    comingSoon: "เร็วๆ นี้",
    body: "ฟอรั่ม WildlyPlay จะเปิดเมื่อคอมมูนิตี้ใหญ่พอ ตอนนี้พูดคุยกันได้ที่ Telegram",
  },
  donate: {
    copy: "คัดลอกที่อยู่",
    copied: "คัดลอกแล้ว!",
  },
  events: {
    title: "เหตุการณ์",
    goal: "ประตู",
    yellowCard: "ใบเหลือง",
    redCard: "ใบแดง",
    substitution: "เปลี่ยนตัว",
  },
  scout: {
    heading: "\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e2a\u0e33\u0e23\u0e2d\u0e07 \u00b7 The Scout",
    badge: "\u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32",
    noPlay: "The Scout \u2014 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49",
    disclosure: "The Scout \u2014 \u0e15\u0e31\u0e27\u0e25\u0e30\u0e04\u0e23\u0e2a\u0e21\u0e21\u0e15\u0e34 \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e42\u0e14\u0e22 AI \u0e02\u0e2d\u0e07 WildlyPlay \u00b7 \u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32 \u00b7 \u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e41\u0e22\u0e01",
  },
  watching: {
    title: "\u0e20\u0e31\u0e13\u0e11\u0e32\u0e23\u0e31\u0e01\u0e29\u0e4c\u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e31\u0e1a\u0e15\u0e32",
    titlePast: "\u0e20\u0e31\u0e13\u0e11\u0e32\u0e23\u0e31\u0e01\u0e29\u0e4c\u0e08\u0e31\u0e1a\u0e15\u0e32\u0e41\u0e25\u0e49\u0e27",
    note: "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e08\u0e32\u0e01 Curator",
    titleScout: "Scout \u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e31\u0e1a\u0e15\u0e32",
    titlePastScout: "Scout \u0e08\u0e31\u0e1a\u0e15\u0e32\u0e41\u0e25\u0e49\u0e27",
    noteScout: "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e08\u0e32\u0e01 Scout",
    disclosureScout: "AI \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19 \u0e40\u0e02\u0e35\u0e22\u0e19\u0e42\u0e14\u0e22 AI \u2014 Scout \u0e40\u0e1b\u0e47\u0e19\u0e15\u0e31\u0e27\u0e25\u0e30\u0e04\u0e23 AI \u0e17\u0e14\u0e25\u0e2d\u0e07 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e1a\u0e38\u0e04\u0e04\u0e25\u0e08\u0e23\u0e34\u0e07",
    disclosureWatching: "\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e40\u0e02\u0e35\u0e22\u0e19\u0e42\u0e14\u0e22 AI \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19 \u2014 \u0e40\u0e23\u0e32\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e19\u0e35\u0e49 \u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19",
    badge: "\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21 \u00b7 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e01\u0e32\u0e23\u0e40\u0e25\u0e37\u0e2d\u0e01",
  },
  match: {
    backToMatches: "\u0e01\u0e25\u0e31\u0e1a",
    curatorWatch: "Curator \u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e31\u0e1a\u0e15\u0e32",
    curatorPick: "\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e02\u0e2d\u0e07 Curator",
    scoutWatch: "Scout \u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e31\u0e1a\u0e15\u0e32",
    scoutPick: "\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14\u0e02\u0e2d\u0e07 Scout",
    articles: "\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e41\u0e21\u0e15\u0e0a\u0e4c",
    noContent: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e19\u0e35\u0e49",
    readArticle: "\u0e2d\u0e48\u0e32\u0e19\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21",
    readReview: "\u0e2d\u0e48\u0e32\u0e19\u0e23\u0e35\u0e27\u0e34\u0e27\u0e09\u0e1a\u0e31\u0e1a\u0e40\u0e15\u0e47\u0e21",
    viewMatch: "\u0e14\u0e39\u0e41\u0e21\u0e15\u0e0a\u0e4c",
  },
  standings: {
    title: "การแข่งขัน",
    subtitle: "ตารางคะแนน ตารางการแข่งขัน และการวิเคราะห์แยกตามลีก",
    group: "\u0e01\u0e25\u0e38\u0e48\u0e21",
    team: "\u0e17\u0e35\u0e21",
    mp: "\u0e40\u0e25\u0e48\u0e19",
    w: "\u0e0a\u0e19\u0e30",
    d: "\u0e40\u0e2a\u0e21\u0e2d",
    l: "\u0e41\u0e1e\u0e49",
    gf: "\u0e44\u0e14\u0e49",
    ga: "\u0e40\u0e2a\u0e35\u0e22",
    gd: "+/-",
    pts: "\u0e04\u0e30\u0e41\u0e19\u0e19",
    form: "\u0e1f\u0e2d\u0e23\u0e4c\u0e21",
    empty: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e15\u0e32\u0e23\u0e32\u0e07\u0e04\u0e30\u0e41\u0e19\u0e19 \u0e01\u0e25\u0e31\u0e1a\u0e21\u0e32\u0e14\u0e39\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e23\u0e2d\u0e1a\u0e41\u0e1a\u0e48\u0e07\u0e01\u0e25\u0e38\u0e48\u0e21\u0e40\u0e23\u0e34\u0e48\u0e21",
    knockout: "\u0e23\u0e2d\u0e1a\u0e19\u0e47\u0e2d\u0e04\u0e2d\u0e32\u0e2d\u0e15",
    knockoutFinished: "\u0e23\u0e2d\u0e1a\u0e17\u0e35\u0e48\u0e08\u0e1a\u0e41\u0e25\u0e49\u0e27",
    seasonNote: "\u0e24\u0e14\u0e39\u0e01\u0e32\u0e25 {season}",
    titleFor: "\u0e15\u0e32\u0e23\u0e32\u0e07\u0e04\u0e30\u0e41\u0e19\u0e19 {name}",
    descriptionFor: "\u0e15\u0e32\u0e23\u0e32\u0e07\u0e04\u0e30\u0e41\u0e19\u0e19 \u0e42\u0e1b\u0e23\u0e41\u0e01\u0e23\u0e21 \u0e1f\u0e2d\u0e23\u0e4c\u0e21 \u0e41\u0e25\u0e30\u0e17\u0e33\u0e19\u0e32\u0e22 {name} {season} \u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e41\u0e1a\u0e1a\u0e40\u0e23\u0e35\u0e22\u0e25\u0e44\u0e17\u0e21\u0e4c",
    schedule: "\u0e42\u0e1b\u0e23\u0e41\u0e01\u0e23\u0e21\u0e01\u0e32\u0e23\u0e41\u0e02\u0e48\u0e07\u0e02\u0e31\u0e19",
  },
};

const es: Dict = {
  nav: {
    board: "Pizarra Diaria",
    dailyLine: "Daily Line",
    archive: "Archivo",
    stats: "Estadísticas",
    matches: "Partidos",
    allMatches: "Nuestros Partidos",
    standings: "Clasificaci\u00f3n",
    news: "Noticias",
    about: "Acerca de",
    donate: "Apoyar",
    responsiblePlay: "Juego Responsable",
    forum: "Foro",
    guides: "Guías",
    transparency: "Transparencia",
    calculators: "Calculadoras",
    todaysPick: "Pick de Hoy",
    trackRecord: "Historial",
    analysis: "Análisis",
    learn: "Aprender",
  },
  tagline: "Picks de Fútbol Gratis, Análisis & Guías de Apuestas",
  footerDisclaimer: "Solo entretenimiento. Juega con responsabilidad.",
  board: {
    title: "Pizarra Diaria",
    subtitle: "Un partido. Una lectura. Solo cuando de verdad hay ventaja.",
    seoDescription: "Pronósticos de fútbol gratuitos diarios con historial público — cada acierto y fallo publicado para siempre. The Curator solo juega cuando hay una ventaja real. Sigue los picks de hoy, los descartados y la lista de seguimiento en Premier League, La Liga, Serie A y más.",
    formTitle: "Racha reciente",
    last30: "Últimos 30 días",
    emptyTitle: "Hoy no hay jugada.",
    emptyBody:
      "The Curator solo juega cuando hay una ventaja real. Sin picks forzados, sin relleno — vuelve mañana o sigue el Telegram para la próxima jugada.",
    picksLabel: "Picks",
    noPlaysLabel: "Descartados",
    watchingLabel: "En seguimiento",
    noPlaysTitle: "Partidos descartados hoy",
    noPlaysBody: "Analizados y descartados — sin ventaja, no hay jugada.",
    resultsTitle: "Resultados de hoy",
    watchingTitle: "En seguimiento",
    trackRecordCta: "Historial completo",
    asOf: "al",
  },
  home: {
    seoDescription: "Pronósticos de fútbol gratuitos diarios por un curador humano. Cada jugada pública para siempre — aciertos y fallos. Análisis de partidos, herramientas de cuotas y guías para Premier League, La Liga, Serie A, Bundesliga y más.",
    latestAnalysis: "Análisis recientes",
    viewBoard: "Ver la Pizarra Diaria",
    trustCurator: "The Curator — humano real, jugadas seleccionadas a mano",
    trustScout: "The Scout — abiertamente IA, historial separado, menor confianza",
  },
  archive: {
    title: "Archivo de Jugadas",
    subtitle: "Cada pick, público para siempre. También publicamos nuestras pérdidas.",
    record: "Balance",
    unitsPl: "G/P en unidades",
    settledPlays: "jugadas liquidadas",
    allMonths: "Todos los meses",
    empty: "Aún no hay jugadas liquidadas. El historial empieza desde cero — míralo crecer aquí.",
    unitsNote:
      "Las insignias cuentan las medias ganancias como GANADA y las medias pérdidas como PERDIDA. El G/P en unidades conserva la matemática real del hándicap asiático.",
  },
  stats: {
    title: "Estadísticas",
    subtitle: "El historial completo, desglosado por liga, mercado y tiempo. Pérdidas incluidas.",
    byLeague: "Por liga",
    byMarket: "Por mercado",
    league: "Liga",
    market: "Mercado",
    settled: "Liquidadas",
    roi: "ROI",
    avgClv: "CLV medio",
    chartTitle: "G/P acumulado en unidades",
  },
  news: {
    title: "Noticias",
    subtitle: "Fichajes, noticias de partidos y novedades de las ligas que cubrimos.",
    empty: "Aún no hay publicaciones.",
    backToNews: "Volver a Noticias",
  },
  analysis: {
    title: "Análisis",
    subtitle: "Resúmenes y notas de partido, publicados automáticamente después de cada jugada.",
    seoDescription: "Resúmenes de partidos de fútbol, previas y análisis de apuestas gratuitos publicados después de cada jugada. Análisis honesto — qué funcionó, qué no y por qué — abierto a todos, sin muro de pago.",
    empty: "Aún no hay publicaciones.",
    backTo: "Volver a Análisis",
  },
  guides: {
    title: "Guías",
    subtitle: "Guías atemporales sobre cómo pensamos las apuestas — calibración, disciplina y análisis honesto.",
    seoDescription: "Guías de apuestas gratuitas sobre gestión de bankroll, hándicap asiático, criterio Kelly, valor de línea de cierre y más. Recursos educativos para afilar tu ventaja — escritos por humanos, sin muro de pago.",
    empty: "Aún no hay guías.",
    backToGuides: "Volver a Guías",
  },
  transparency: {
    title: "Transparencia",
    subtitle: "Nuestro historial completo — cada pronóstico, cada mes, aciertos y fallos. Sin capturas escogidas.",
    empty: "Aún no hay informes.",
    backToReports: "Volver a Transparencia",
  },
  calculators: {
    title: "Calculadoras",
    subtitle: "Herramientas matemáticas de apuestas gratis — elimina el margen, convierte formatos de cuotas y dimensiona con Kelly.",
    deVig: "Calculadora De-Vig",
    deVigDesc: "Elimina el margen de la casa de apuestas para encontrar las cuotas reales. Soporta métodos multiplicativo, aditivo, Shin y potencia.",
    oddsConverter: "Conversor de Cuotas",
    oddsConverterDesc: "Convierte entre Decimal, Fraccionario, Americano, Malayo, Hong Kong, Indonesio y Probabilidad Implícita.",
    kelly: "Criterio Kelly",
    kellyDesc: "Calcula el tamaño óptimo de apuesta según tu ventaja. Kelly fraccionario por defecto para gestión segura de bankroll.",
    deVigCta: "Aprende la teoría detrás del de-vigging",
    oddsConverterCta: "Aprende los 7 formatos de cuotas en detalle",
    kellyCta: "Aprende la teoría detrás del Kelly Criterion",
  },
  pick: {
    disclosure:
      "Elegida por un humano, operada por IA. Un humano eligió esta jugada; la IA la escribió, la publicó y la liquida.",
    disclosureScout:
      "Elegido por IA, escrito por IA — Scout es un personaje de IA experimental, no una persona real.",
    odds: "Cuota al publicar",
    stake: "Apuesta",
    finalScore: "FT",
    viewPlay: "Ver el pick",
    curator: "The Curator",
    scoutLabel: "The Scout",
    halfWin: "media ganancia",
    halfLoss: "media pérdida",
    confidence: "Confianza",
    confLow: "Baja",
    confMedium: "Media",
    confHigh: "Alta",
    postedAt: "Publicado",
  },
  play: {
    backToBoard: "Volver a la Pizarra",
    pickedAt: "Pick en vivo con marcador",
    market: "Mercado",
    line: "Línea",
    result: "Resultado",
    rawOutcome: "Resultado AH real",
    thesis: "La tesis",
    closing: "Cuota al cierre",
    clvNote: "CLV = valor de la línea de cierre — positivo significa que el pick le ganó al mercado.",
    readRecap: "Leer el resumen del partido",
    sources: "Fuentes",
  },
  outcome: {
    win: "Ganada",
    half_win: "Media ganancia",
    push: "Push",
    half_loss: "Media pérdida",
    loss: "Perdida",
    void: "Anulada",
  },
  poll: {
    title: "Tu decisión en esta jugada:",
    follow: "Seguir",
    fade: "Ir en contra",
    skip: "Pasar",
  },
  matches: {
    title: "Partidos de Hoy",
    allMatches: "Nuestros Partidos",
    matchesSubtitle: "Cada partido que hemos cubierto — picks, an\u00e1lisis y seguimiento.",
    empty: "No hay partidos hoy",
    kicksOff: "Empieza en",
    live: "EN VIVO",
    finished: "FIN",
  },
  share: {
    title: "Comparte este pick:",
    copy: "Copiar enlace",
    copied: "¡Copiado!",
    more: "Más…",
  },
  crowd: {
    title: "La afición vs The Curator",
    followersWon: "Los seguidores ganaron ({units} por 1u)",
    followersLost: "Los seguidores perdieron",
  },
  badge: {
    upcoming: "PRÓXIMA",
    live: "EN VIVO",
    won: "GANADA",
    lost: "PERDIDA",
    push: "PUSH",
    void: "ANULADA",
  },
  forum: {
    title: "Foro",
    comingSoon: "Muy pronto",
    body: "El foro de WildlyPlay abrirá cuando la comunidad sea lo bastante grande. Hasta entonces, la conversación vive en Telegram.",
  },
  donate: {
    copy: "Copiar dirección",
    copied: "¡Copiado!",
  },
  events: {
    title: "Eventos",
    goal: "Gol",
    yellowCard: "Tarjeta amarilla",
    redCard: "Tarjeta roja",
    substitution: "Cambio",
  },
  scout: {
    heading: "Picks Alternativos \u00b7 The Scout",
    badge: "Menor Confianza",
    noPlay: "The Scout \u2014 sin pick alternativo hoy.",
    disclosure: "The Scout \u2014 personaje ficticio, operado por IA, de WildlyPlay \u00b7 menor confianza \u00b7 registro separado",
  },
  watching: {
    title: "El Curator est\u00e1 observando",
    titlePast: "El Curator estuvo observando",
    note: "Nota del Curator",
    titleScout: "El Scout est\u00e1 observando",
    titlePastScout: "El Scout estuvo observando",
    noteScout: "Nota del Scout",
    disclosureScout: "Elegido por IA, escrito por IA \u2014 Scout es un personaje de IA experimental, no una persona real.",
    disclosureWatching: "Cobertura escrita por IA. No se ha tomado ninguna apuesta \u2014 seguimos este partido, no apostamos.",
    badge: "EN SEGUIMIENTO \u00b7 NO ES UNA APUESTA",
  },
  match: {
    backToMatches: "Volver",
    curatorWatch: "El Curator observa",
    curatorPick: "Pick del Curator",
    scoutWatch: "El Scout observa",
    scoutPick: "Pick del Scout",
    articles: "Art\u00edculos del partido",
    noContent: "A\u00fan no hay contenido para este partido.",
    readArticle: "Leer art\u00edculo",
    readReview: "Leer rese\u00f1a completa",
    viewMatch: "Ver partido",
  },
  standings: {
    title: "Competiciones",
    subtitle: "Clasificaciones, calendarios y predicciones por liga.",
    group: "Grupo",
    team: "Equipo",
    mp: "PJ",
    w: "G",
    d: "E",
    l: "P",
    gf: "GF",
    ga: "GC",
    gd: "DG",
    pts: "Pts",
    form: "Forma",
    empty: "Los datos de clasificaci\u00f3n a\u00fan no est\u00e1n disponibles. Vuelve cuando comience la fase de grupos.",
    knockout: "Fase Eliminatoria",
    knockoutFinished: "Rondas finalizadas",
    seasonNote: "Temporada {season}",
    titleFor: "Clasificaci\u00f3n de {name}",
    descriptionFor: "Clasificaci\u00f3n, calendario, forma y predicciones de {name} {season}. Actualizado en vivo.",
    schedule: "Calendario",
  },
};

const dictionaries: Record<Lang, Dict> = { en, vi, th, es };

export function getDict(lang: Lang): Dict {
  return dictionaries[lang];
}
