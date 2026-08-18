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
    responsibleBody: "banhbong.net is entertainment. We share perspectives \u2014 never financial advice. If gambling stops being fun, reach out.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Get in touch",
    contactBody: "Follow us or drop a message on any of these channels.",
  },
  vi: {
    title: "Về banhbong.net",
    metaTitle: "Về banhbong.net — Nhận định bóng đá do người tuyển chọn, thành tích công khai",
    metaDescription:
      "banhbong.net là trang phân tích bóng đá do con người tuyển chọn. Mỗi trận được nghiên cứu và lập luận; AI viết nhận định, lưu trữ công khai mọi dự đoán, minh bạch từ ngày đầu.",
    intro:
      "banhbong.net là trang nhận định bóng đá do con người thực hiện. Admin là người chọn trận và góc nhìn. AI vận hành mọi thứ còn lại: viết phân tích, xuất bản, tổng kết kết quả và lưu trữ công khai mọi nhận định, vĩnh viễn.",
    cards: [
      {
        heading: "Nhận định có lập luận, không đoán mò",
        body: "Mỗi nhận định đều được nghiên cứu và lập luận — không ngẫu nhiên, không cam kết chắc chắn. Chúng tôi chia sẻ góc nhìn, không phải lời tiên tri.",
      },
      {
        heading: "Mọi nhận định công khai vĩnh viễn",
        body: "Tỷ lệ tham chiếu được ghi lại ngay lúc đăng và không bao giờ chỉnh sửa. Đúng, trượt, hòa — toàn bộ thành tích luôn hiển thị, bắt đầu từ số 0.",
      },
      {
        heading: "Miễn phí, cho cộng đồng toàn cầu",
        body: "Không gói VIP, không thu phí, không quảng cáo trá hình. Người hâm mộ từ mọi múi giờ, gắn kết bởi tình yêu bóng đá.",
      },
    ],
    personas: [
      {
        name: "Admin",
        role: "Người thật chọn trận",
        description: "Một con người thật nghiên cứu mỗi trận, tìm góc nhìn và gửi nhận định. Admin là cổng con người — mọi nhận định bắt đầu từ quyết định của con người. Thành tích theo dõi riêng, minh bạch từ ngày đầu.",
      },
      {
        name: "The Scout",
        role: "AI vận hành · Độ tin cậy thấp hơn",
        description: "Persona do AI vận hành công khai, chạy phân tích riêng. The Scout có sổ theo dõi riêng, huy hiệu độ tin cậy thấp hơn, và công bố nguồn AI trên mọi nhận định. Không bao giờ trộn với thành tích của Admin.",
      },
    ],
    promiseTitle: "Cam kết",
    promises: [
      "Admin là người đứng ra lựa chọn trận đấu có cơ sở, góc nhìn để phân tích. Thành tích của Admin được theo dõi riêng, minh bạch từ ngày đầu.",
      "Huy hiệu tính đúng-một-nửa là ĐÚNG, sai-một-nửa là SAI — nhưng chỉ số đơn vị được/mất theo chấp châu Á thực tế luôn hiển thị cạnh thành tích, không tô hồng.",
      "Nhận định trượt chúng tôi cũng đăng. Chỉ mang tính tham khảo, giải trí — không phải lời khuyên tài chính.",
    ],
    methodTitle: "Cách chọn trận",
    methodIntro: "Mỗi nhận định trải qua năm bước trước khi được xuất bản.",
    methodSteps: [
      { title: "Nghiên cứu trước trận", body: "Bảng phong độ, lịch sử đối đầu, tình hình chấn thương, đội hình dự kiến — tất cả được kiểm tra trước khi xét bất kỳ chỉ số nào." },
      { title: "Đối chiếu tỷ lệ", body: "Chúng tôi so sánh tỷ lệ từ nhiều nguồn dữ liệu thị trường. Chỉ quan tâm những chỉ số mà giá lệch so với xác suất thực tế." },
      { title: "Kiểm tra lợi thế", body: "Nhận định chỉ được đăng khi chúng tôi kỳ vọng giá đóng cửa sẽ dịch chuyển theo hướng của mình — nghĩa là thị trường đồng ý với góc nhìn của chúng tôi." },
      { title: "Chuẩn hoá cách đo", body: "Mỗi nhận định tính một đơn vị quy ước để đo hiệu quả thống kê. Không nhân đôi, không gỡ, ghi chép mọi lần." },
      { title: "Phân tích bằng AI", body: "Bài phân tích trước trận và tổng kết sau trận được AI viết và xuất bản cùng mỗi nhận định — công khai nguồn AI." },
    ],
    trackTitle: "Thành tích",
    trackBody: "Mọi nhận định từ ngày đầu được lưu trữ công khai. Không chụp màn hình, không chọn lọc — toàn bộ sổ sách, cập nhật sau mỗi trận.",
    trackCta: "Xem toàn bộ thành tích \u2192",
    leaguesTitle: "Giải đấu theo dõi",
    leaguesIntro: "Chúng tôi theo dõi các giải lớn và các giải đấu quốc tế. Bảng xếp hạng, lịch thi đấu và nhận định có sẵn cho mỗi giải.",
    leaguesSeason: "Mùa giải",
    toolsTitle: "Công cụ miễn phí",
    toolsIntro: "Nâng cao phân tích của bạn với các công cụ thống kê này — không cần đăng ký.",
    // Bản VI ẩn de-vig + Kelly (công cụ đặt cược thuần) theo Route A — giữ công cụ
    // thống kê trung tính. EN/ES vẫn đủ 4 công cụ.
    tools: [
      { name: "Chuyển đổi tỷ lệ", emoji: "\ud83d\udd04", href: "/calculators/odds-converter" },
      { name: "Mô hình Poisson", emoji: "\ud83c\udfaf", href: "/calculators/poisson" },
    ],
    responsibleTitle: "Theo dõi có trách nhiệm",
    responsibleBody: "banhbong.net mang tính phân tích thể thao và giải trí. Chúng tôi chia sẻ góc nhìn — không phải lời mời hay hướng dẫn cá cược, không phải lời khuyên tài chính. Nếu việc theo dõi không còn lành mạnh, hãy tìm hỗ trợ.",
    helplines: [
      { name: "BeGambleAware", detail: "begambleaware.org (UK)" },
      { name: "NCPG", detail: "1-800-522-4700 (US)" },
      { name: "Gamblers Help", detail: "1800 858 858 (AU)" },
    ],
    contactTitle: "Liên hệ",
    contactBody: "Theo dõi hoặc nhắn tin trên các kênh sau.",
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
      {
        name: "The Scout",
        role: "AI \u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23 \u00b7 \u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32",
        description: "Persona \u0e17\u0e35\u0e48\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e42\u0e14\u0e22 AI \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22 \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e41\u0e22\u0e01\u0e2a\u0e48\u0e27\u0e19 The Scout \u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e41\u0e22\u0e01 \u0e1b\u0e49\u0e32\u0e22\u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32 \u0e41\u0e25\u0e30\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1c\u0e22 AI \u0e17\u0e38\u0e01\u0e17\u0e35\u0e40\u0e14\u0e47\u0e14 \u0e44\u0e21\u0e48\u0e1c\u0e2a\u0e21\u0e01\u0e31\u0e1a Admin",
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
