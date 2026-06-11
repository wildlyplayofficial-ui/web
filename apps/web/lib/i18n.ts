/**
 * Lightweight i18n — EN + VI only at launch (decision #5).
 * Shared UI strings live here; long-form page copy stays local to each page.
 * Language is carried via the `?lang=vi` query param (EN is the default).
 */

export type Lang = "en" | "vi";

export const LANGS: readonly Lang[] = ["en", "vi"] as const;

export function resolveLang(value: string | string[] | undefined): Lang {
  return value === "vi" ? "vi" : "en";
}

/** Append `?lang=vi` to an internal href when needed. */
export function withLang(href: string, lang: Lang): string {
  if (lang === "en") return href;
  return href.includes("?") ? `${href}&lang=vi` : `${href}?lang=vi`;
}

export interface Dict {
  nav: {
    board: string;
    archive: string;
    news: string;
    about: string;
    donate: string;
    responsiblePlay: string;
    forum: string;
  };
  tagline: string;
  footerDisclaimer: string;
  board: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyBody: string;
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
  news: {
    title: string;
    subtitle: string;
    empty: string;
    backToNews: string;
  };
  pick: {
    disclosure: string;
    odds: string;
    stake: string;
    finalScore: string;
    curator: string;
    halfWin: string;
    halfLoss: string;
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
}

const en: Dict = {
  nav: {
    board: "Daily Board",
    archive: "Archive",
    news: "Newsroom",
    about: "About",
    donate: "Donate",
    responsiblePlay: "Responsible Play",
    forum: "Forum",
  },
  tagline: "Handpicked plays for the global crowd",
  footerDisclaimer: "Entertainment only. Play responsibly.",
  board: {
    title: "Daily Board",
    subtitle: "One match. One take. Every day there's an edge.",
    emptyTitle: "No play today.",
    emptyBody:
      "The Curator only plays when there's an edge. No forced picks, no filler — check back tomorrow or follow Telegram for the next play.",
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
  news: {
    title: "Newsroom",
    subtitle: "Recaps and match notes, published automatically after every play.",
    empty: "No posts yet.",
    backToNews: "Back to Newsroom",
  },
  pick: {
    disclosure: "Human-picked, AI-operated. A human chose this play; AI wrote, published and settles it.",
    odds: "Odds at publish",
    stake: "Stake",
    finalScore: "FT",
    curator: "The Curator",
    halfWin: "half-win",
    halfLoss: "half-loss",
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
};

const vi: Dict = {
  nav: {
    board: "Bảng Kèo",
    archive: "Lưu Trữ",
    news: "Tin Tức",
    about: "Giới Thiệu",
    donate: "Ủng Hộ",
    responsiblePlay: "Chơi Có Trách Nhiệm",
    forum: "Diễn Đàn",
  },
  tagline: "Kèo tuyển chọn cho cộng đồng toàn cầu",
  footerDisclaimer: "Chỉ mang tính giải trí. Chơi có trách nhiệm.",
  board: {
    title: "Bảng Kèo Hôm Nay",
    subtitle: "Một trận. Một góc nhìn. Chỉ khi thật sự có lợi thế.",
    emptyTitle: "Hôm nay không có kèo.",
    emptyBody:
      "The Curator chỉ chơi khi thấy lợi thế thật sự. Không kèo gượng ép, không câu kéo — quay lại ngày mai hoặc theo dõi Telegram để nhận kèo tiếp theo.",
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
  news: {
    title: "Tin Tức",
    subtitle: "Recap và ghi chú trận đấu, tự động xuất bản sau mỗi kèo.",
    empty: "Chưa có bài viết.",
    backToNews: "Quay lại Tin Tức",
  },
  pick: {
    disclosure: "Người chọn kèo, AI vận hành. Con người chọn kèo này; AI viết, đăng và kết sổ.",
    odds: "Odds lúc đăng",
    stake: "Mức cược",
    finalScore: "FT",
    curator: "The Curator",
    halfWin: "thắng nửa",
    halfLoss: "thua nửa",
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
};

const dictionaries: Record<Lang, Dict> = { en, vi };

export function getDict(lang: Lang): Dict {
  return dictionaries[lang];
}
