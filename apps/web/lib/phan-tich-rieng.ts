/**
 * Phần phân tích viết tay riêng cho từng trang giải (19/11/2026, thử ở Ngoại hạng Anh).
 * Lý do: 5 trang giải dùng chung một khuôn, Google xếp "đã thu thập, chưa lập chỉ mục".
 * Chỉ giải nào có mục ở đây mới hiện khối; các giải khác không render gì.
 * Số liệu là ảnh chụp tại thời điểm `capNhat`; khi sang vòng mới phải viết lại tay, không sinh tự động.
 */
export interface PhanTichDoan {
  tieuDe: string;
  noiDung: string[];
  /** Đoạn nói về lịch sắp đá: qua mốc này (ISO) thì không hiện nữa. Bỏ trống = luôn hiện. */
  anSau?: string;
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
  tieuDe: "Nhận định Ngoại hạng Anh sau vòng 11: Arsenal hơn 6 điểm, Man City chưa thắng 4 trận, Crystal Palace thua 5 trận liền",
  capNhat: "25/11/2026",
  capNhatIso: "2026-11-25",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 11,
  doan: [
    {
      tieuDe: "Cuộc đua vô địch: Arsenal hơn 6 điểm dù hòa ở Newcastle",
      noiDung: [
        "Arsenal có 28 điểm sau 11 trận (9 thắng, 1 hòa, 1 thua), hơn Brighton và Manchester City 6 điểm. Trận hòa 2-2 trên sân Newcastle ở vòng 11 làm dừng chuỗi thắng, nhưng vì cả hai đội bám đuổi cùng mất điểm nên khoảng cách còn nới rộng thêm 1 điểm so với sau vòng 10. Hàng thủ vẫn là nền tảng: Arsenal thủng 7 bàn, ít nhất giải, và giữ sạch lưới 7 trận.",
        "Điểm cần lưu ý là hàng công. Arsenal ghi 17 bàn, 1,55 bàn mỗi trận, kém Brighton 9 bàn và kém Man City 5 bàn. Hiệu số xG trừ xGA của họ là +0,76 mỗi trận, giờ xếp thứ hai, chỉ sau Man City. Lực lượng đang mỏng: Saka chấn thương đùi, dự kiến trở lại khoảng 20/12, Zubimendi chấn thương gân kheo chưa rõ ngày về, còn thủ môn Raya chấn thương vai, khoảng 50% khả năng ra sân.",
      ],
    },
    {
      tieuDe: "Brighton và Man City: cùng 22 điểm, cùng hụt hơi",
      noiDung: [
        "Brighton thua 0-2 trên sân Hull City, trận thua thứ hai trong 5 vòng gần nhất. Họ vẫn ghi nhiều nhất giải với 26 bàn và chỉ thủng 9, hiệu số +17, nên đứng trên Man City nhờ hiệu số. Mức ghi bàn vượt xG đã giảm từ khoảng 0,67 xuống 0,40 bàn mỗi trận, đúng như số liệu báo trước. Mitoma chấn thương gân kheo và Costinha bị treo giò, cả hai dự kiến trở lại khoảng 2/12. Groß, người dẫn đầu kiến tạo cùng Wirtz với 6 lần, đang mang 4 thẻ vàng.",
        "Man City hòa Fulham 1-1 trên sân nhà, nâng chuỗi không thắng lên 4 trận (thua 3, hòa 1). Năm trận gần nhất họ chỉ có 4 điểm và thủng 9 bàn. Nghịch lý là hiệu số xG +0,77 mỗi trận của City vẫn cao nhất giải, và họ tạo ra 2,0 xG mỗi trận, cũng nhiều nhất. Haaland vẫn dẫn đầu danh sách ghi bàn với 9 bàn (xG 8,09). Semenyo tiếp tục nghỉ vì chấn thương đầu gối.",
      ],
    },
    {
      tieuDe: "Top 4: Liverpool chỉ kém nhóm nhì 1 điểm, Bournemouth thắng 5 trận liền",
      noiDung: [
        "Liverpool thắng Manchester United 4-0, có 21 điểm, kém Brighton và Man City đúng 1 điểm. Bốn trong 5 trận gần nhất họ thắng, ghi 11 bàn và chỉ thủng 3. Isak có 7 bàn, Wirtz 6 kiến tạo. Danh sách vắng mặt vẫn dài: Ekitiké (gân Achilles), Bradley và Leoni (đầu gối, dự kiến trở lại khoảng 12/12), còn Gakpo và Gravenberch chỉ khoảng 75% khả năng ra sân.",
        "Bournemouth thắng Nottingham Forest 2-0, chuỗi thắng lên 5 trận, ghi 11 bàn và chỉ thủng 1 trong giai đoạn này. Với 18 điểm, họ đứng thứ 5, kém Liverpool 3 điểm, và hiệu số xG +0,69 xếp thứ ba giải. Evanilson có 6 bàn. Silva, Smith và Tavernier vẫn đang mang 4 thẻ vàng. Phía sau là Brentford (thắng Everton 4-0) và Leeds (thắng 4-1 trên sân Chelsea) cùng 17 điểm. Chelsea và Everton cùng 16 điểm nhưng thua đậm ở vòng này, và Chelsea thua 3 trong 5 trận gần nhất, hiệu số xG -0,28.",
      ],
    },
    {
      tieuDe: "Cuộc chiến trụ hạng: Crystal Palace thua 5 trận liền, United thủng 14 bàn trong 5 trận",
      noiDung: [
        "Crystal Palace vẫn đứng cuối với 7 điểm sau khi thua Coventry 2-3. Đây là trận thua thứ 5 liên tiếp, trong 5 trận đó họ thủng 15 bàn. Palace thủng 27 bàn, nhiều nhất giải, và hiệu số xG -0,77 cũng tệ nhất. Manchester United hạng 19 có 8 điểm (1 thắng, 5 hòa, 5 thua), chưa giữ sạch lưới trận nào và chỉ lấy 2 điểm trong 5 vòng gần nhất. United tạo ra 1,66 xG mỗi trận nhưng chỉ ghi 1,27 bàn, còn hàng thủ để đối thủ tạo 2,02 xG mỗi trận.",
        "Sunderland hạng 18 và Nottingham Forest hạng 17 cùng 9 điểm. Sunderland ghi 8 bàn sau 11 trận, ít nhất giải. Forest là đội chơi tốt hơn kết quả rõ nhất: hiệu số xG +0,34, thứ sáu giải, nhưng mỗi trận ghi ít hơn xG khoảng 0,79 bàn, mức hụt lớn nhất Ngoại hạng Anh. Phía trên, Ipswich và Fulham cùng 11 điểm, Coventry 12 điểm. Ipswich chỉ có 2 điểm trong 5 trận gần nhất và chưa giữ sạch lưới trận nào. Từ hạng 20 lên hạng 13 chỉ cách 6 điểm, còn 27 vòng.",
      ],
    },
    {
      tieuDe: "Vòng 12 nên theo dõi gì",
      anSau: "2026-11-30T03:00:00+07:00",
      noiDung: [
        "Trận lớn nhất vòng là Arsenal tiếp Manchester City lúc 23h30 ngày 29/11 (giờ Việt Nam). Đội đầu bảng có hàng thủ tốt nhất gặp đội có hiệu số xG cao nhất nhưng đã 4 trận không thắng. Nếu Arsenal thắng, khoảng cách với City lên 9 điểm. Cùng ngày, lúc 19h, Everton tiếp Liverpool trong trận derby Merseyside, và lúc 21h05 Brighton tiếp Newcastle. Thủ môn Horníček của Newcastle có 38 pha cứu thua, thuộc nhóm nhiều nhất giải.",
        "Ở nhóm cuối, Crystal Palace tiếp Hull City lúc 21h05 ngày 29/11 mà không có Mateta và Yeremy, cả hai đang bị treo giò. Thủ môn Tzolakis của Hull có 48 pha cứu thua, nhiều nhất giải. Manchester United tiếp Brentford lúc 22h ngày 28/11, còn vòng đấu mở màn bằng trận Nottingham Forest tiếp Chelsea lúc 3h sáng 28/11. Bournemouth sang sân Fulham lúc 21h05 ngày 29/11 để nối dài chuỗi 5 trận thắng.",
      ],
    },
  ],
};

const LA_LIGA: PhanTichRieng = {
  tieuDe: "Nhận định La Liga sau vòng 12: Barcelona hơn Real Madrid 3 điểm, đáy bảng có Málaga chưa thắng trận nào",
  capNhat: "19/11/2026",
  capNhatIso: "2026-11-19",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 12,
  doan: [
    {
      tieuDe: "Cuộc đua vô địch: Barcelona hơn Real Madrid 3 điểm",
      noiDung: [
        "Barcelona dẫn đầu với 33 điểm, thắng 11 trận và thua 1. Họ ghi 48 bàn, nhiều nhất giải, thủng 13 bàn, hiệu số +35. Bình quân Barcelona ghi 4,00 bàn mỗi trận trong khi xG chỉ là 3,30, và hiệu số xG trừ xGA +2,19 mỗi trận cũng cao nhất La Liga. Năm trận gần nhất họ thắng bốn, thua một, ghi 17 bàn và thủng 6.",
        "Real Madrid có 30 điểm, thắng 10, thua 2, và đang có phong độ tốt nhất giải: 5 trận gần nhất đều thắng, ghi 13 bàn, thủng 2. Atlético Madrid đứng thứ 3 với 28 điểm, thủng 10 bàn và giữ sạch lưới 6 trong 12 trận, nhiều nhất giải. Tuy vậy hiệu số xG của Atlético chỉ là +0,48, xếp thứ 4, thấp hơn nhiều so với hai đội đứng trên. Về cầu thủ, Raphinha dẫn đầu danh sách ghi bàn với 15 bàn (xG 11,20), Mbappé có 13 bàn (xG 14,60), Lamine Yamal có 10 bàn và 8 kiến tạo.",
      ],
    },
    {
      tieuDe: "Top 4: Betis hơn Real Sociedad 4 điểm",
      noiDung: [
        "Real Betis đứng thứ 4 với 26 điểm (8 thắng, 2 hòa, 2 thua), hơn Real Sociedad 4 điểm và hơn Sevilla 8 điểm. Trang này tô vùng Champions League cho bốn hạng đầu, nên khoảng cách giữa hạng 4 và hạng 5 là điều đáng theo dõi. Betis thủng 15 bàn, nhưng thủ môn Álvaro Vallés có 48 pha cứu thua, nhiều nhất giải. xGA của họ là 1,73 mỗi trận, còn bàn thua thật chỉ 1,25, tức là hàng thủ đang được thủ môn gánh bớt. Real Sociedad thắng 4 trong 5 trận gần nhất và ghi 12 bàn.",
        "Villarreal là trường hợp lệch nhất bảng. Họ xếp thứ 3 về hiệu số xG (+0,95) nhưng chỉ đứng thứ 8 với 15 điểm, vì mỗi trận tạo ra xG 2,02 mà chỉ ghi 1,42 bàn. Athletic Club và Rayo Vallecano mới đá 11 trận, ít hơn các đội còn lại một trận, nên điểm số của hai đội này chưa so được ngang hàng.",
      ],
    },
    {
      tieuDe: "Cuộc chiến trụ hạng: Málaga bị bỏ lại, nhóm 12 điểm rất đông",
      noiDung: [
        "Málaga đứng cuối với 5 điểm sau 12 trận, chưa thắng trận nào (5 hòa, 7 thua), ghi 9 bàn và thủng 23. Valencia hạng 19 có 9 điểm và chỉ ghi 8 bàn, 0,67 mỗi trận, thấp nhất giải cùng Getafe. Elche hạng 18 có 10 điểm, Levante hạng 17 có 11 điểm. Bốn đội Espanyol, Rayo Vallecano, Getafe và Osasuna cùng 12 điểm (Rayo mới đá 11 trận), cách Elche đúng 2 điểm.",
        "Racing Santander xếp hạng 10 với 14 điểm, nhưng thủng 30 bàn, nhiều nhất giải, hiệu số -13 và xGA 2,23 mỗi trận, tệ nhất La Liga. Đội này sống nhờ hàng công: Yassir Zabiri có 9 bàn trong tổng 17 bàn của cả đội. Osasuna còn lệ thuộc hơn, Ante Budimir ghi 8 trong 12 bàn của đội. Deportivo Alavés đang đứng thứ 12 với 13 điểm nhưng chỉ có 2 điểm trong 5 trận gần nhất, ngang Málaga.",
      ],
    },
    {
      tieuDe: "Vòng 13 nên theo dõi gì",
      anSau: "2026-11-23T06:00:00+07:00",
      noiDung: [
        "Trang hiện có 5 trận của vòng 13, lịch của Barcelona chưa lên. Athletic Club tiếp Espanyol lúc 3h ngày 21/11 (giờ Việt Nam), hạng 7 gặp hạng 13. Lúc 20h cùng ngày, Alavés tiếp Deportivo La Coruña. Deportivo đã hòa 6 trận, nhiều thứ hai giải. Rayo Vallecano tiếp Valencia lúc 22h15, trận giữa hạng 14 và hạng 19.",
        "Sáng Chủ nhật 22/11, Sevilla gặp Real Betis lúc 0h30, hạng 6 gặp hạng 4. Cuối vòng là Real Madrid tiếp Celta Vigo lúc 3h. Celta hòa 7 trong 12 trận, nhiều nhất giải, và chỉ thủng 10 bàn, 0,83 mỗi trận, ngang Real Madrid và Atlético. Đây là phép thử cho chuỗi 5 trận thắng liên tiếp của Real.",
      ],
    },
  ],
};

const SERIE_A: PhanTichRieng = {
  tieuDe: "Nhận định Serie A sau vòng 11: Lazio, Inter và Roma sát nhau, cuối bảng chưa ngã ngũ",
  capNhat: "19/11/2026",
  capNhatIso: "2026-11-19",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 11,
  doan: [
    {
      tieuDe: "Cuộc đua vô địch: ba đội trong vòng 2 điểm",
      noiDung: [
        "Lazio dẫn đầu với 29 điểm, thắng 9, hòa 2 và chưa thua trận nào. Inter có 28 điểm, Roma 27 điểm, và Roma cũng bất bại (8 thắng, 3 hòa). Lazio thủng 9 bàn, ít nhất giải, nhưng số liệu xG không đứng về họ. Hiệu số xG trừ xGA của Lazio chỉ +0,34, thứ 7 giải, và họ ghi 2,27 bàn mỗi trận trong khi xG là 1,58. Mức vượt 0,69 bàn mỗi trận là lớn nhất Serie A. Phần Thông số của trang đã lưu ý, số dương lớn như vậy thường không giữ được lâu.",
        "Inter thì ngược lại: hiệu số xG +1,65 mỗi trận, cao nhất giải, và họ sút trúng đích 6,9 lần mỗi trận, nhiều nhất. Inter ghi 28 bàn, thủng 13, thua 1 trận. Roma ghi 31 bàn, nhiều nhất giải, thủng 10, giữ sạch lưới 6 trận và có phong độ tốt nhất 5 vòng gần đây (4 thắng, 1 hòa, 17 bàn). Donyell Malen có 8 bàn cho Roma, còn xG của anh là 9,70, cao nhất giải.",
      ],
    },
    {
      tieuDe: "Top 4: Milan, Como và Frosinone",
      noiDung: [
        "Milan đứng thứ 4 với 24 điểm, hơn Como 1 điểm và hơn Frosinone 4 điểm. Trang này tô vùng Champions League cho bốn hạng đầu. Como thắng 4 trong 5 trận gần nhất, và Anastasios Douvikas có 5 bàn. Frosinone hạng 6 ghi 24 bàn nhưng thủng 15, xGA 2,03 mỗi trận, tệ thứ hai giải. Hàng công của họ khá đều: Antonio Raimondo 8 bàn, còn Kvernadze, Ghedjemis và Schmid mỗi người 4 kiến tạo.",
        "Juventus hạng 7 với 18 điểm có hàng thủ tốt nhất giải theo xGA (0,72 mỗi trận) và giữ sạch lưới 5 trận, nhưng chỉ ghi 15 bàn. Hiệu số xG +0,73, thứ 3 giải, chưa chuyển thành điểm. Napoli hạng 10 với 15 điểm, hiệu số xG +0,54 xếp thứ 4, nhưng 5 trận gần nhất chỉ có 5 điểm.",
      ],
    },
    {
      tieuDe: "Cuộc chiến trụ hạng: năm đội trong 4 điểm",
      noiDung: [
        "Udinese đứng cuối với 5 điểm (1 thắng, 2 hòa, 8 thua) và thủng 25 bàn. Venezia hạng 19 có 6 điểm, chỉ ghi 8 bàn, 0,73 mỗi trận, thấp nhất giải, và tịt ngòi 6 trong 11 trận. Monza hạng 18 có 7 điểm, thủng 25 bàn dù Gustavo Varela là vua phá lưới Serie A với 9 bàn.",
        "Sassuolo (hạng 17, 8 điểm) thua cả 5 trận gần nhất và thủng 29 bàn, nhiều nhất giải, tức 2,64 mỗi trận. Parma cũng 8 điểm, với hiệu số xG -1,11, tệ nhất giải. Fiorentina hạng 15 có 9 điểm, thủng 25 bàn, và 91% trận của họ có từ 3 bàn trở lên. Từ hạng 20 lên hạng 15 chỉ cách nhau 4 điểm, nên chưa đội nào ở nửa dưới có thể coi là an toàn.",
      ],
    },
    {
      tieuDe: "Vòng 12 nên theo dõi gì",
      anSau: "2026-11-23T06:00:00+07:00",
      noiDung: [
        "Trang hiện có 4 trận của vòng 12, chưa có lịch của Inter và Milan. Lúc 21h ngày 21/11 (giờ Việt Nam), Lazio tiếp Lecce. Lazio thắng 4 trong 5 trận gần nhất, Lecce chỉ lấy 4 điểm trong 5 trận gần nhất. Cùng giờ, Como tiếp Cagliari. Cagliari chỉ thắng 1 trong 5 trận gần nhất, nhưng thủ môn Elia Caprile có 48 pha cứu thua, nhiều nhất giải.",
        "Lúc 0h ngày 22/11, Parma (hạng 16) tiếp Roma, đội đang có phong độ tốt nhất giải. Cuối vòng, Napoli tiếp Torino lúc 2h45, trận giữa hạng 10 và hạng 11, hơn kém nhau 1 điểm.",
      ],
    },
  ],
};

const BUNDESLIGA: PhanTichRieng = {
  tieuDe: "Nhận định Bundesliga sau vòng 9: Bayern và Dortmund cùng 21 điểm, Schalke và Gladbach chìm ở đáy",
  capNhat: "19/11/2026",
  capNhatIso: "2026-11-19",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 9,
  doan: [
    {
      tieuDe: "Cuộc đua vô địch: Bayern hơn về hiệu số, Dortmund hơn về độ chắc",
      noiDung: [
        "Bayern München và Borussia Dortmund cùng có 21 điểm, cùng thắng 6, hòa 3 và chưa thua. Bayern xếp trên nhờ hiệu số +20 so với +9. Họ ghi 29 bàn, 3,22 bàn mỗi trận, và hiệu số xG trừ xGA là +2,59 mỗi trận, xa nhất giải, vì RB Leipzig đứng thứ hai về chỉ số này chỉ có +0,99. Michael Olise có 6 bàn cho Bayern.",
        "Dortmund chỉ ghi 16 bàn nhưng thủng 7 và giữ sạch lưới 5 trận, ngang Leipzig nhiều nhất giải. Hiệu số xG của họ là +0,10, xếp thứ 8, và 3 trong 5 trận gần nhất đều là hòa, nên chuỗi bất bại của Dortmund mỏng hơn bảng điểm cho thấy.",
      ],
    },
    {
      tieuDe: "Freiburg, Leipzig và Leverkusen: ai bám được đỉnh bảng",
      noiDung: [
        "Freiburg đứng thứ 3 với 19 điểm, hơn Leipzig 1 điểm và hơn Leverkusen 3 điểm. Hiệu số xG của Freiburg là +0,71, thứ 3 giải, khá hợp với thứ hạng. RB Leipzig thắng 6, thua 3, ghi 27 bàn (3,00 mỗi trận) và thủng 13. Họ có phong độ tốt nhất giải ở 5 trận gần nhất, 4 thắng 1 thua và 18 bàn. Leipzig đang ghi hơn xG khoảng 0,50 bàn mỗi trận, mức này khó giữ lâu.",
        "Bayer Leverkusen thứ 5 với 16 điểm, Patrik Schick có 8 bàn, kém vua phá lưới Niclas Füllkrug đúng 1 bàn. Füllkrug ghi 9 trong 17 bàn của Werder Bremen, đội đứng thứ 6 với 15 điểm.",
      ],
    },
    {
      tieuDe: "Nhóm giữa bảng: bốn đội cùng 12 điểm",
      noiDung: [
        "VfB Stuttgart, Hoffenheim, Eintracht Frankfurt và Hamburger SV cùng có 12 điểm, xếp từ hạng 8 đến hạng 11. Elversberg đứng thứ 7 với 13 điểm, nhưng hiệu số xG của họ là -0,69 và họ ghi 1,89 bàn mỗi trận trong khi xG chỉ là 1,39. Mainz hạng 12 có 10 điểm, hiệu số xG +0,25 xếp thứ 5 giải, nhưng chỉ thắng 1 trong 5 trận gần nhất.",
        "Augsburg hạng 14 có 9 điểm, ghi 20 bàn và cũng thủng 20, trung bình 4,4 bàn mỗi trận, và 89% trận của họ có từ 3 bàn trở lên.",
      ],
    },
    {
      tieuDe: "Cuộc chiến trụ hạng: Gladbach 4 điểm, Schalke không ghi nổi bàn",
      noiDung: [
        "Borussia Mönchengladbach đứng cuối với 4 điểm (1 thắng, 1 hòa, 7 thua), ghi 12 bàn và thủng 25. Schalke 04 hạng 17 có 6 điểm và chỉ ghi 5 bàn sau 9 trận, 0,56 mỗi trận, tịt ngòi 6 trận. Họ có đúng 1 điểm trong 5 trận gần nhất, tệ nhất giải. Union Berlin hạng 16 có 7 điểm, chỉ 7 bàn, và hiệu số xG -1,02 là thấp nhất giải.",
        "Köln hạng 15 và Augsburg hạng 14 cùng 9 điểm, Paderborn hạng 13 có 10 điểm. Từ hạng 18 lên hạng 13 chỉ cách 6 điểm, còn 25 vòng để thay đổi.",
      ],
    },
    {
      tieuDe: "Vòng 10 nên theo dõi gì",
      anSau: "2026-11-23T06:00:00+07:00",
      noiDung: [
        "Bayern tiếp Köln lúc 2h30 ngày 21/11 (giờ Việt Nam). Lúc 21h30 cùng ngày có năm trận: Leverkusen gặp Paderborn, Eintracht Frankfurt gặp Hoffenheim, Elversberg gặp Freiburg, Union Berlin gặp Leipzig và Gladbach gặp Dortmund. Trận cuối là đội cuối bảng đối đầu đội chưa thua và có hàng thủ giữ sạch lưới nhiều nhất giải.",
        "Union vừa có ba trận hòa trong 5 trận gần nhất, và sẽ gặp Leipzig, đội ghi 18 bàn trong 5 trận đó. Sáng Chủ nhật 22/11, Schalke tiếp Stuttgart lúc 0h30. Stuttgart thắng 3 trong 5 trận gần nhất, còn Schalke chưa thắng trận nào trong 5 trận ấy.",
      ],
    },
  ],
};

const LIGUE_1: PhanTichRieng = {
  tieuDe: "Nhận định Ligue 1 sau vòng 10: PSG hơn Lille 2 điểm, Le Havre mới có 2 điểm",
  capNhat: "19/11/2026",
  capNhatIso: "2026-11-19",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 10,
  doan: [
    {
      tieuDe: "Cuộc đua vô địch: PSG dẫn đầu, Lille và Paris FC bám sát",
      noiDung: [
        "Paris Saint-Germain có 23 điểm (7 thắng, 2 hòa, 1 thua), hơn Lille 2 điểm và Paris FC 3 điểm. PSG thắng cả 5 trận gần nhất, ghi 14 bàn và thủng 3. Hiệu số xG trừ xGA của họ là +1,38 mỗi trận, cao nhất giải. Nhưng họ ghi 2,20 bàn mỗi trận trong khi xG là 2,60, tức là kết quả đang thấp hơn chất lượng cơ hội.",
        "Lille hạng 2 thắng 6, hòa 3, thua 1, nhưng chỉ ghi 14 bàn sau 10 trận, 1,40 mỗi trận. Họ dựa vào hàng thủ: giữ sạch lưới 5 trận, nhiều thứ hai giải. Hiệu số xG của Lille là -0,17, xếp thứ 9. Paris FC hạng 3 có 20 điểm, và Lassine Sinayoko dẫn đầu danh sách ghi bàn với 9 bàn, tức là hơn một nửa trong 17 bàn của đội.",
      ],
    },
    {
      tieuDe: "Top 4: Marseille đang thắng nhiều hơn chất lượng chơi",
      noiDung: [
        "Marseille đứng thứ 4 với 18 điểm, cách PSG 5 điểm, và thắng cả 5 trận gần nhất với 15 bàn, nhiều nhất giải ở giai đoạn này. Nhưng cả mùa họ thua 4 trận, và hiệu số xG của họ là -0,55, xếp thứ 17 trong 18 đội. Marseille ghi 2,20 bàn mỗi trận trong khi xG là 1,70. Amine Gouiri có 7 bàn.",
        "Lyon và Nice cùng 17 điểm. Lyon giữ sạch lưới 4 trận nhưng chỉ có 6 điểm trong 5 trận gần nhất, còn Nice thắng 4 trong 5 trận. Monaco hạng 7 có 16 điểm, hòa 4 trận và chưa thắng trận nào trong 5 trận gần nhất. Rennes hạng 8 cũng 16 điểm, ghi 21 và thủng 21 bàn, 90% trận của họ có từ 3 bàn trở lên.",
      ],
    },
    {
      tieuDe: "Giữa bảng: Brest, Lorient và Lens",
      noiDung: [
        "Brest hạng 9 có 15 điểm nhưng hiệu số xG +0,78, xếp thứ 2 giải, nên đội này chơi tốt hơn thứ hạng. Lorient cùng 15 điểm, giữ sạch lưới 6 trong 10 trận, nhiều nhất giải, nhưng chỉ ghi 9 bàn. Lens hạng 11 có 13 điểm, và Florian Thauvin có 5 bàn. Strasbourg hạng 13 ghi 1,80 bàn mỗi trận, hơn xG 0,52, mức vượt lớn nhất giải.",
      ],
    },
    {
      tieuDe: "Cuộc chiến trụ hạng: Le Havre cách xa nhóm trên 6 điểm",
      noiDung: [
        "Le Havre đứng cuối với 2 điểm sau 10 trận (0 thắng, 2 hòa, 8 thua), thua cả 5 trận gần nhất và thủng 22 bàn. Ba đội Le Mans, Angers và Troyes cùng 8 điểm, hơn Le Havre 6 điểm. Troyes chỉ ghi 7 bàn, 0,70 mỗi trận, và tịt ngòi 6 trong 10 trận. Angers ghi 9 bàn, thủng 19. Le Mans thắng 1, hòa 5 trong 10 trận.",
        "Auxerre hạng 14 và Strasbourg hạng 13 cùng 10 điểm. Auxerre thủng 24 bàn, nhiều nhất giải, dù Cameron Archer đã ghi 6 bàn.",
      ],
    },
    {
      tieuDe: "Vòng 11 nên theo dõi gì",
      anSau: "2026-11-23T06:00:00+07:00",
      noiDung: [
        "Troyes tiếp Le Havre lúc 3h05 ngày 21/11 (giờ Việt Nam), trận giữa hạng 17 và hạng 18, đây là cơ hội cho Le Havre cắt chuỗi thua. Nice tiếp PSG lúc 23h15 cùng ngày: Nice thắng 4 trong 5 trận gần nhất, còn PSG thắng cả 5.",
        "Sáng Chủ nhật 22/11, có bốn trận lúc 2h45: Lens gặp Toulouse, Lille gặp Lyon, Monaco gặp Auxerre và Strasbourg gặp Brest. Lille gặp Lyon là trận giữa hạng 2 và hạng 5, hai đội giữ sạch lưới nhiều thứ hai và thứ ba giải. Strasbourg gặp Brest cũng đáng chú ý: 90% trận của Strasbourg có từ 3 bàn trở lên, Brest là 60%.",
      ],
    },
  ],
};

const CUP_C1: PhanTichRieng = {
  tieuDe: "Nhận định Cúp C1 sau vòng 4 league phase: PSG và Real Madrid cùng 12 điểm, chín đội dồn ở mức 9 điểm",
  capNhat: "19/11/2026",
  capNhatIso: "2026-11-19",
  tacGia: "Ban biên tập banhbong.net",
  sauVong: 4,
  doan: [
    {
      tieuDe: "Cách đọc bảng 36 đội",
      noiDung: [
        "Cúp C1 mùa này dùng thể thức league phase: 36 đội xếp chung một bảng, mỗi đội đá 8 trận với 8 đối thủ khác nhau. Theo bài thể thức trên banhbong.net, sau 8 lượt top 8 vào thẳng vòng 1/8, các đội hạng 9 đến 24 đá play-off hai lượt, còn hạng 25 trở xuống bị loại. Mới qua 4 vòng nên mỗi đội còn đúng 4 trận, và các vạch 8, 24 chưa đội nào chắc chắn. Vì vậy bài này đọc bảng theo từng vạch thay vì chỉ nhìn đội đầu bảng.",
      ],
    },
    {
      tieuDe: "Nhóm đầu: PSG và Real Madrid toàn thắng",
      noiDung: [
        "Paris Saint-Germain và Real Madrid cùng thắng cả 4 trận, có 12 điểm. PSG ghi 20 bàn, thủng 5, hiệu số +15, tốt nhất bảng. Real Madrid ghi 13, thủng 7, hiệu số +6. Arsenal hạng 3 có 10 điểm (3 thắng, 1 hòa), thủng 3 bàn, ít nhất giải. Como bất ngờ đứng thứ 4 với 9 điểm và ghi 19 bàn, chỉ kém PSG 1 bàn. Anastasios Douvikas của Como dẫn đầu danh sách ghi bàn với 6 bàn, Erling Haaland và Nicolò Tresoldi (Club Brugge) có 5 bàn.",
        "Vạch top 8 là chỗ chật nhất. Từ hạng 4 đến hạng 12 có chín đội cùng 9 điểm: Como, Barcelona, Aston Villa, Manchester City, Liverpool, Club Brugge, Sporting CP, Real Betis và Borussia Dortmund. Liverpool, Club Brugge và Sporting cùng hiệu số +4. Trên bảng của trang, Liverpool xếp thứ 8 nhờ ghi nhiều bàn hơn (14, so với 11 và 8). Bayern München hạng 13 có 8 điểm, chưa thua (2 thắng, 2 hòa), nên chỉ cách top 8 một điểm.",
      ],
    },
    {
      tieuDe: "Vạch hạng 24: sáu đội cùng 4 điểm",
      noiDung: [
        "Roma (hạng 20), Shakhtar Donetsk, Viking, Atlético Madrid, PSV Eindhoven (hạng 24) và Bodø/Glimt (hạng 25) cùng có 4 điểm. Chỉ hiệu số tách PSV (-1) khỏi Bodø/Glimt (-5). Atlético mới có 4 bàn sau 4 trận. Roma ghi 10 bàn nhưng thủng 8, mới thắng 1 trận.",
        "Ngay dưới vạch này là Porto, Napoli, Villarreal, AEK Athens, RB Leipzig, Sabah, Feyenoord và Lens, cùng 3 điểm. Napoli và RB Leipzig đều là đội mạnh ở giải trong nước, nhưng mới thắng 1 trận mỗi đội. Vì chỉ còn 4 trận, một chuỗi thắng sẽ đủ để đổi hạng rất nhiều.",
      ],
    },
    {
      tieuDe: "Đáy bảng: Slovan chưa có điểm, Lille mới có 1 điểm",
      noiDung: [
        "Slovan Bratislava thua cả 4 trận, ghi 1 bàn và thủng 17, hiệu số -16, tệ nhất giải. Slavia Praha và Lille cùng có 1 điểm, đều chưa thắng trận nào. Lille đang đứng thứ 2 ở Ligue 1 nhưng ở đây xếp thứ 35. Lens hạng 33 thủng 16 bàn sau 4 trận, hiệu số -12.",
      ],
    },
    {
      tieuDe: "Số liệu cá nhân sau vòng 4",
      noiDung: [
        "Về xG, Serhou Guirassy (Borussia Dortmund) dẫn đầu với 4,50, rồi đến Harry Kane (4,30) và Luis Suárez (4,20). Joshua Kimmich dẫn đầu xA với 2,30, còn Nico Paz của Como dẫn đầu kiến tạo với 5. Thủ môn Yann Sommer của Club Brugge có 27 pha cứu thua, nhiều nhất.",
      ],
    },
    {
      tieuDe: "Lực lượng trước vòng 5",
      anSau: "2026-11-26T06:00:00+07:00",
      noiDung: [
        "Trang chưa có lịch vòng 5. Danh sách chấn thương của trang ghi 127 cầu thủ có thể vắng ở vòng này, Barcelona và Liverpool mỗi đội có 7 người, nhiều nhất. PSG có 5 người trong danh sách, trong đó Khvicha Kvaratskhelia nghỉ hết mùa.",
      ],
    },
  ],
};

const THEO_GIAI: Record<string, PhanTichRieng> = {
  "premier-league": NGOAI_HANG_ANH,
  "la-liga": LA_LIGA,
  "serie-a": SERIE_A,
  bundesliga: BUNDESLIGA,
  "ligue-1": LIGUE_1,
  "champions-league": CUP_C1,
};

export function phanTichRieng(slug: string, bayGio: number = Date.now()): PhanTichRieng | null {
  const pt = THEO_GIAI[slug];
  if (!pt) return null;
  return { ...pt, doan: pt.doan.filter((d) => !d.anSau || Date.parse(d.anSau) > bayGio) };
}
