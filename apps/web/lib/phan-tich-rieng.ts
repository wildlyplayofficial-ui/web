/**
 * Phần phân tích viết tay riêng cho từng trang giải (19/11/2026, thử ở Ngoại hạng Anh).
 * Lý do: 5 trang giải dùng chung một khuôn, Google xếp "đã thu thập, chưa lập chỉ mục".
 * Chỉ giải nào có mục ở đây mới hiện khối; các giải khác không render gì.
 * Số liệu là ảnh chụp tại thời điểm `capNhat`; khi sang vòng mới phải viết lại tay, không sinh tự động.
 */
export interface PhanTichDoan {
  tieuDe: string;
  noiDung: string[];
}

export interface PhanTichRieng {
  tieuDe: string;
  /** Ngày dữ liệu, dạng hiển thị (giờ Việt Nam). */
  capNhat: string;
  /** Mốc ISO cho thẻ <time>. */
  capNhatIso: string;
  tacGia: string;
  /** Số liệu chụp sau vòng này. */
  sauVong: number;
  doan: PhanTichDoan[];
}

const NGOAI_HANG_ANH: PhanTichRieng = {
  tieuDe: "Nhận định Ngoại hạng Anh sau vòng 10: Arsenal dẫn đầu, cuộc đua top 4 và nhóm cuối sát nhau",
  capNhat: "19/11/2026",
  capNhatIso: "2026-11-19",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 10,
  doan: [
    {
      tieuDe: "Cuộc đua vô địch: Arsenal hơn 5 điểm nhờ hàng thủ",
      noiDung: [
        "Arsenal thắng 9 trong 10 trận, có 27 điểm, hơn Brighton 5 điểm và Manchester City 6 điểm. Điểm khác biệt nằm ở phía sau lưng: họ chỉ thủng lưới 5 bàn, ít nhất giải, và giữ sạch lưới 7 trận. Năm trận gần nhất đều thắng, ghi 7 bàn và chỉ thủng 1.",
        "Đây không phải kết quả may mắn. Hiệu số xG trừ xGA của Arsenal là +0,86 mỗi trận, cao nhất giải. Nhưng họ ghi 15 bàn sau 10 trận, thấp hơn nhiều so với Brighton (26 bàn) hay Man City (21 bàn), nên một trận hàng thủ lỡ nhịp có thể đủ để họ mất điểm. Trận thua duy nhất là 0-3 trên sân Brighton ngày 19/9. Lực lượng cũng có dấu hỏi: Saka đang chấn thương đùi chưa rõ ngày trở lại, Zubimendi chỉ có khoảng 75% khả năng ra sân.",
      ],
    },
    {
      tieuDe: "Brighton và Man City: bàn thắng nhiều, nhưng kết quả chưa phản ánh hết",
      noiDung: [
        "Brighton đứng nhì với 22 điểm, ghi 26 bàn, thủng 7 bàn, hiệu số +19. Có một điểm cần lưu ý: họ tạo ra trung bình 1,93 xG mỗi trận nhưng ghi thật 2,60 bàn, tức đang vượt kỳ vọng khoảng 0,67 bàn mỗi trận. Mức đó hiếm khi giữ được cả mùa. Tuy vậy hiệu số xG +0,57 vẫn xếp thứ tư giải, nên họ không chỉ dựa vào sút may. Chủ nhật 22/11 Brighton sang làm khách của Hull City, đội đang đứng thứ 13.",
        "Man City có 21 điểm nhưng phong độ đang xuống: năm trận gần nhất thắng 2, rồi thua liền 3, gần nhất là 1-3 trên sân Nottingham Forest. Họ thủng 13 bàn sau 10 trận, nhiều hơn Arsenal 8 bàn. Ngược lại, hiệu số xG của City là +0,74, cao thứ hai giải, nghĩa là số liệu tạo cơ hội tốt hơn kết quả trên bảng. Haaland dẫn đầu danh sách ghi bàn với 9 bàn (xG 7,06). Semenyo đang nghỉ vì chấn thương đầu gối, Guéhi và Gvardiol cũng chỉ ở mức khoảng 75% khả năng ra sân.",
      ],
    },
    {
      tieuDe: "Top 4: sáu đội cách nhau 4 điểm",
      noiDung: [
        "Liverpool đứng thứ 4 với 18 điểm (5 thắng, 3 hòa, 2 thua), hơn Chelsea và Everton 2 điểm, hơn Bournemouth 3 điểm. Từ hạng 4 đến hạng 9 chỉ cách nhau 4 điểm nên thứ hạng có thể đảo liên tục từng vòng. Liverpool vừa thắng Crystal Palace 3-1, Isak có 7 bàn, Wirtz có 5 kiến tạo. Nhưng danh sách chấn thương khá dài, gồm Ekitiké (gân Achilles), Leoni, Frimpong và Bradley.",
        "Chelsea (16 điểm) vừa thua 0-1 ở Sunderland và João Pedro đang chấn thương đùi. Everton (16 điểm) thắng 2 trận liền, và Barry có 7,29 xG, cao nhất giải. Bournemouth (15 điểm) thắng 4 trong 5 trận gần nhất, hiệu số xG +0,67 xếp thứ ba. Đây là đội đáng theo dõi nhất ở nhóm săn vé châu Âu, nhưng họ có ba cầu thủ (Silva, Smith, Tavernier) đang mang 4 thẻ vàng, thêm một thẻ là nghỉ trận kế.",
      ],
    },
    {
      tieuDe: "Cuộc chiến trụ hạng: Man United, Sunderland, Crystal Palace",
      noiDung: [
        "Crystal Palace xếp cuối với 7 điểm, thua 7 trong 10 trận và thủng 24 bàn, tệ nhất giải. Họ chỉ có 3 điểm trong 5 trận gần nhất, và hiệu số xG -0,81 cũng thấp nhất giải. Sunderland (19) và Manchester United (18) cùng có 8 điểm. United mới thắng 1 trận sau 10 vòng, hòa 5 và vừa có trận hòa 4-4 với Aston Villa; cả hai đội ghi tổng 8 bàn trong một trận.",
        "Khoảng cách trong nhóm này rất nhỏ. Coventry (hạng 17) và Nottingham Forest (hạng 16) cùng 9 điểm, Fulham hạng 15 có 10 điểm, Hull và Ipswich 11 điểm. Từ hạng 20 lên hạng 11 chỉ cách 5 điểm. Forest là trường hợp đáng chú ý: hiệu số xG +0,47, cao thứ năm giải, nhưng chỉ đứng thứ 16, cho thấy kết quả của họ đang thấp hơn chất lượng chơi. Còn 28 vòng nên chưa đội nào ở nửa dưới có thể coi là an toàn.",
      ],
    },
    {
      tieuDe: "Vòng 11 nên theo dõi gì",
      noiDung: [
        "Newcastle gặp Arsenal lúc 0h30 ngày 22/11 (giờ Việt Nam). Newcastle hạng 12, chỉ có 4 điểm trong 5 trận gần nhất, nhưng thủ môn Horníček đã cứu 36 cú sút, thuộc nhóm nhiều nhất giải. Đây là phép thử cho hàng thủ của đội đầu bảng. Man City tiếp Fulham lúc 19h30 ngày 21/11 và cần cắt chuỗi 3 trận thua.",
        "Ở nhóm cuối, Coventry tiếp Crystal Palace lúc 22h ngày 21/11 là trận giữa hạng 17 và hạng 20. Aston Villa tiếp Sunderland cùng giờ. Lúc 23h30 ngày 22/11, Liverpool đấu Manchester United tại Anfield, trận mà Liverpool cần điểm để giữ chỗ trong top 4, còn United chưa thắng ở giải kể từ cuối tháng 8. Cuối vòng, Brentford tiếp Everton lúc 3h ngày 24/11.",
      ],
    },
  ],
};

const THEO_GIAI: Record<string, PhanTichRieng> = {
  "premier-league": NGOAI_HANG_ANH,
};

export function phanTichRieng(slug: string): PhanTichRieng | null {
  return THEO_GIAI[slug] ?? null;
}
