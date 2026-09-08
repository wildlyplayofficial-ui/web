/** Kênh phát sóng theo giải, cho khối "Xem trận này ở đâu" trên trang /match.
 *
 *  VÌ SAO CÓ FILE NÀY: đo 9/9/2026, 0/187 trang /match nêu được kênh phát sóng — trong khi
 *  đó đúng là cột mà đối thủ hơn mình (đo 30/8), và là câu người Việt gõ khi tra một trận
 *  ("MU Arsenal xem kênh nào", "trực tiếp ở đâu").
 *
 *  Số liệu KHÔNG BỊA: lấy từ chính mấy bài "xem giải X ở đâu" banhbong đã đăng, mở từng bài
 *  ra đọc chứ không suy từ đường dẫn.
 */

export interface KenhGiai {
  /** Tên kênh hiển thị cho người đọc. */
  kenh: string;
  /** Đường dẫn bài hướng dẫn xem giải đó (đã đăng, nằm trong /analysis). */
  bai: string;
  /** Chữ hiển thị cho đường dẫn. */
  tenBai: string;
  /** Chữ NGẮN cho nút link — dài quá thì rớt hàng, mũi tên dính chữ, nhìn luộm thuộm
   *  (soi tận mắt 9/9 ở cỡ điện thoại 430px). */
  linkChu: string;
}

/** Khớp theo TIỀN TỐ tên giải. `MatchData.league` là chuỗi hiển thị dạng
 *  "Premier League 2026-27" nên phải bỏ phần mùa giải khi so. */
const BANG: ReadonlyArray<readonly [string, KenhGiai]> = [
  ["Premier League", { kenh: "FPT Play", bai: "xem-ngoai-hang-anh-2026-27-o-dau-fpt-play-thay-k-plus", tenBai: "xem Ngoại hạng Anh 2026/27 ở đâu", linkChu: "Cách xem Ngoại hạng Anh 2026/27" }],
  ["La Liga", { kenh: "SCTV", bai: "xem-la-liga-2026-27-o-dau-sctv", tenBai: "xem La Liga 2026/27 ở đâu", linkChu: "Cách xem La Liga 2026/27" }],
  ["Serie A", { kenh: "VTVcab", bai: "xem-serie-a-2026-27-o-dau-viet-nam", tenBai: "xem Serie A 2026/27 ở đâu", linkChu: "Cách xem Serie A 2026/27" }],
  ["Bundesliga", { kenh: "TV360", bai: "xem-bundesliga-2026-27-o-dau-tv360", tenBai: "xem Bundesliga 2026/27 ở đâu", linkChu: "Cách xem Bundesliga 2026/27" }],
  ["Ligue 1", { kenh: "VTVcab", bai: "xem-ligue-1-2026-27-o-dau-viet-nam", tenBai: "xem Ligue 1 2026/27 ở đâu", linkChu: "Cách xem Ligue 1 2026/27" }],
  ["Champions League", { kenh: "VTVcab, VTV", bai: "xem-cup-c1-2026-27-o-dau-vtvcab", tenBai: "xem Cúp C1 2026/27 ở đâu", linkChu: "Cách xem Cúp C1 2026/27" }],
];

/** Tra theo MÃ GIẢI (`competitionId` từ `getMatchContext`) — đường CHÍNH.
 *
 *  ⚠️ Vì sao phải có đường này: đo 9/9/2026, cả 3 trang trận SẮP ĐÁ đều có
 *  `match.league` RỖNG (dòng đầu trang chỉ hiện ngày + giờ, không có tên giải).
 *  Tra theo `league` thôi thì khối kênh hiện trên ĐÚNG 0 TRANG — tính năng vô dụng.
 *  `ctx.competitionId` thì luôn có khi trận nằm trong 5 giải có lịch tĩnh. */
const THEO_MA: Readonly<Record<string, KenhGiai>> = {
  "epl-2026": { kenh: "FPT Play", bai: "xem-ngoai-hang-anh-2026-27-o-dau-fpt-play-thay-k-plus", tenBai: "xem Ngoại hạng Anh 2026/27 ở đâu", linkChu: "Cách xem Ngoại hạng Anh 2026/27" },
  "laliga-2026": { kenh: "SCTV", bai: "xem-la-liga-2026-27-o-dau-sctv", tenBai: "xem La Liga 2026/27 ở đâu", linkChu: "Cách xem La Liga 2026/27" },
  "seriea-2026": { kenh: "VTVcab", bai: "xem-serie-a-2026-27-o-dau-viet-nam", tenBai: "xem Serie A 2026/27 ở đâu", linkChu: "Cách xem Serie A 2026/27" },
  "bundesliga-2026": { kenh: "TV360", bai: "xem-bundesliga-2026-27-o-dau-tv360", tenBai: "xem Bundesliga 2026/27 ở đâu", linkChu: "Cách xem Bundesliga 2026/27" },
  "ligue1-2026": { kenh: "VTVcab", bai: "xem-ligue-1-2026-27-o-dau-viet-nam", tenBai: "xem Ligue 1 2026/27 ở đâu", linkChu: "Cách xem Ligue 1 2026/27" },
  "ucl-2026": { kenh: "VTVcab, VTV", bai: "xem-cup-c1-2026-27-o-dau-vtvcab", tenBai: "xem Cúp C1 2026/27 ở đâu", linkChu: "Cách xem Cúp C1 2026/27" },
};

/** Tra kênh: ưu tiên MÃ GIẢI, không có mới lùi về tên giải hiển thị. */
export function kenhTheoMaHoacTen(maGiai: string | null | undefined, league: string | null | undefined): KenhGiai | null {
  if (maGiai && THEO_MA[maGiai]) return THEO_MA[maGiai];
  return kenhTheoGiai(league);
}

/** Tra kênh theo tên giải. Không biết thì trả null — KHÔNG đoán bừa một kênh nào đó,
 *  thà không hiện còn hơn hiện sai. */
export function kenhTheoGiai(league: string | null | undefined): KenhGiai | null {
  if (!league) return null;
  const ten = league.trim();
  for (const [tienTo, kq] of BANG) {
    if (ten.toLowerCase().startsWith(tienTo.toLowerCase())) return kq;
  }
  return null;
}

/** Trận đã đá xong thì KHÔNG hiện khối này — "xem ở đâu" cho trận tuần trước là vô nghĩa.
 *  Đo 9/9: 181/187 trang trong sitemap là trận đã đá, chỉ 6 trận sắp đá. */
export function conDaDuoc(kickoffUtc: string | null | undefined, now = new Date()): boolean {
  if (!kickoffUtc) return false;
  const t = new Date(kickoffUtc).getTime();
  if (Number.isNaN(t)) return false;
  return t > now.getTime();
}
