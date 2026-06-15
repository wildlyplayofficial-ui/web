/**
 * Lightweight i18n — EN, VI, TH and ES.
 * Shared UI strings live here; long-form page copy stays local to each page.
 * Language is carried via the `?lang=xx` query param (EN is the default).
 */

export type Lang = "en" | "vi" | "th" | "es";

export const LANGS: readonly Lang[] = ["en", "vi", "th", "es"] as const;

export function resolveLang(value: string | string[] | undefined): Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value)
    ? (value as Lang)
    : "en";
}

/** Append `?lang=xx` to an internal href when needed. */
export function withLang(href: string, lang: Lang): string {
  if (lang === "en") return href;
  return href.includes("?") ? `${href}&lang=${lang}` : `${href}?lang=${lang}`;
}

export interface Dict {
  nav: {
    board: string;
    archive: string;
    stats: string;
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
    formTitle: string;
    last30: string;
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
  pick: {
    disclosure: string;
    odds: string;
    stake: string;
    finalScore: string;
    viewPlay: string;
    curator: string;
    halfWin: string;
    halfLoss: string;
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
}

const en: Dict = {
  nav: {
    board: "Daily Board",
    archive: "Archive",
    stats: "Stats",
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
    formTitle: "Recent form",
    last30: "Last 30 days",
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
    viewPlay: "View play",
    curator: "The Curator",
    halfWin: "half-win",
    halfLoss: "half-loss",
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
};

const vi: Dict = {
  nav: {
    board: "Bảng Kèo",
    archive: "Lưu Trữ",
    stats: "Thống Kê",
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
    formTitle: "Phong độ gần đây",
    last30: "30 ngày qua",
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
    subtitle: "Recap và ghi chú trận đấu, tự động xuất bản sau mỗi kèo.",
    empty: "Chưa có bài viết.",
    backToNews: "Quay lại Tin Tức",
  },
  pick: {
    disclosure: "Người chọn kèo, AI vận hành. Con người chọn kèo này; AI viết, đăng và kết sổ.",
    odds: "Odds lúc đăng",
    stake: "Mức cược",
    finalScore: "FT",
    viewPlay: "Xem chi tiết kèo",
    curator: "The Curator",
    halfWin: "thắng nửa",
    halfLoss: "thua nửa",
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
};

const th: Dict = {
  nav: {
    board: "บอร์ดประจำวัน",
    archive: "คลังทีเด็ด",
    stats: "สถิติ",
    news: "ข่าวสาร",
    about: "เกี่ยวกับเรา",
    donate: "สนับสนุน",
    responsiblePlay: "เล่นอย่างมีความรับผิดชอบ",
    forum: "ฟอรั่ม",
  },
  tagline: "ทีเด็ดคัดมากับมือ เพื่อคอบอลทั่วโลก",
  footerDisclaimer: "เพื่อความบันเทิงเท่านั้น โปรดเล่นอย่างมีความรับผิดชอบ",
  board: {
    title: "บอร์ดประจำวัน",
    subtitle: "หนึ่งแมตช์ หนึ่งมุมมอง เฉพาะวันที่เห็นความได้เปรียบจริงเท่านั้น",
    formTitle: "ฟอร์มล่าสุด",
    last30: "30 วันที่ผ่านมา",
    emptyTitle: "วันนี้ไม่มีทีเด็ด",
    emptyBody:
      "The Curator จะเล่นเฉพาะเมื่อเห็นความได้เปรียบจริงเท่านั้น ไม่มีทีเด็ดยัดเยียด ไม่มีของแถม — กลับมาดูใหม่พรุ่งนี้ หรือติดตาม Telegram เพื่อรอทีเด็ดถัดไป",
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
    subtitle: "สรุปผลและบันทึกแมตช์ เผยแพร่อัตโนมัติหลังจบทุกทีเด็ด",
    empty: "ยังไม่มีบทความ",
    backToNews: "กลับไปหน้าข่าวสาร",
  },
  pick: {
    disclosure: "คนเลือก AI ดำเนินการ — มนุษย์เป็นผู้เลือกทีเด็ดนี้ ส่วน AI เขียน เผยแพร่ และตัดสินผล",
    odds: "ราคาตอนเผยแพร่",
    stake: "เดิมพัน",
    finalScore: "FT",
    viewPlay: "ดูรายละเอียดทีเด็ด",
    curator: "The Curator",
    halfWin: "ชนะครึ่ง",
    halfLoss: "แพ้ครึ่ง",
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
};

const es: Dict = {
  nav: {
    board: "Pizarra Diaria",
    archive: "Archivo",
    stats: "Estadísticas",
    news: "Noticias",
    about: "Acerca de",
    donate: "Apoyar",
    responsiblePlay: "Juego Responsable",
    forum: "Foro",
  },
  tagline: "Jugadas seleccionadas a mano para la afición global",
  footerDisclaimer: "Solo entretenimiento. Juega con responsabilidad.",
  board: {
    title: "Pizarra Diaria",
    subtitle: "Un partido. Una lectura. Solo cuando de verdad hay ventaja.",
    formTitle: "Racha reciente",
    last30: "Últimos 30 días",
    emptyTitle: "Hoy no hay jugada.",
    emptyBody:
      "The Curator solo juega cuando hay una ventaja real. Sin picks forzados, sin relleno — vuelve mañana o sigue el Telegram para la próxima jugada.",
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
    subtitle: "Resúmenes y notas de partido, publicados automáticamente después de cada jugada.",
    empty: "Aún no hay publicaciones.",
    backToNews: "Volver a Noticias",
  },
  pick: {
    disclosure:
      "Elegida por un humano, operada por IA. Un humano eligió esta jugada; la IA la escribió, la publicó y la liquida.",
    odds: "Cuota al publicar",
    stake: "Apuesta",
    finalScore: "FT",
    viewPlay: "Ver el pick",
    curator: "The Curator",
    halfWin: "media ganancia",
    halfLoss: "media pérdida",
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
};

const dictionaries: Record<Lang, Dict> = { en, vi, th, es };

export function getDict(lang: Lang): Dict {
  return dictionaries[lang];
}
