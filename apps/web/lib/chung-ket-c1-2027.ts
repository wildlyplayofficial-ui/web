/**
 * Dữ kiện trang /chung-ket-c1-2027 (19/11/2026). Mọi dòng có nguồn ở NGUON.
 * Giờ bóng lăn UEFA chưa công bố: để CHUA_CONG_BO, KHÔNG suy ra từ các mùa trước.
 * Đổi ngày ở đây thì vẽ lại hình lịch: node apps/web/scripts/ve-hinh-lich-2027.mjs (chạy từ gốc repo).
 */
import type { DuLieuTrang } from "@/lib/lich-2027-kieu";

export const CAP_NHAT = "19/11/2026";
export const CAP_NHAT_ISO = "2026-11-19";
const CHUA_CONG_BO = "Chưa công bố";

export const DU_LIEU: DuLieuTrang = {
  duong: "/chung-ket-c1-2027",
  h1: "Chung kết C1 2027: ngày nào, đá ở sân nào",
  moTa: "Chung kết C1 2027 đá ngày 5/6/2027 tại sân Metropolitano, Madrid. Bán kết 27-28/4 và 4-5/5/2027. Giờ bóng lăn: chưa công bố.",
  ogPhu: "5/6/2027 · sân Metropolitano, Madrid",
  capNhat: CAP_NHAT,
  moDau:
    "Chung kết C1 2027 (chung kết Champions League mùa 2026/27) đá vào thứ Bảy 5/6/2027 tại sân Metropolitano của Atlético Madrid, thủ đô Madrid, Tây Ban Nha. Giờ bóng lăn UEFA chưa công bố, nên trang này chưa ghi giờ Việt Nam; sẽ điền ngay khi có.",
  khoi: [
    {
      id: "ngay-san",
      tieuDe: "5/6/2027 tại Madrid: ngày và sân chung kết C1 2027",
      doan: [
        "UEFA trao trận chung kết mùa 2026/27 cho sân Metropolitano ở Madrid sau cuộc họp Ủy ban Điều hành tại Tirana. Chỉ có hai hồ sơ đăng cai, Madrid và Baku. Đây là lần thứ hai sân này đăng cai trận chung kết C1, sau trận Liverpool thắng Tottenham 2-0 năm 2019.",
        "Sân có hai tên gọi: UEFA ghi Estadio Metropolitano, còn Atlético Madrid hiện gọi là Riyadh Air Metropolitano theo hợp đồng đặt tên.",
      ],
      bang: {
        cot: ["Mốc", "Ngày"],
        hang: [
          ["Bán kết lượt đi", "27 và 28/4/2027"],
          ["Bán kết lượt về", "4 và 5/5/2027"],
          ["Chung kết", "Thứ Bảy 5/6/2027"],
          ["Giờ bóng lăn chung kết", CHUA_CONG_BO],
          ["Hai đội vào chung kết", CHUA_CONG_BO],
        ],
      },
    },
    {
      id: "gio-viet-nam",
      tieuDe: "Chung kết C1 2027 đá mấy giờ theo giờ Việt Nam",
      doan: [
        "UEFA chưa công bố giờ bóng lăn. Tháng 6 Madrid dùng giờ mùa hè, chậm hơn Việt Nam 5 tiếng: trận đá lúc 21h00 ở Madrid là 2h00 sáng hôm sau theo giờ Việt Nam. Khi UEFA chốt giờ, trang này sẽ ghi giờ Việt Nam cụ thể.",
      ],
    },
    {
      id: "chung-ket-nu",
      tieuDe: "Chung kết C1 nữ 2027 đá ở Warsaw",
      doan: [
        "Trận chung kết Champions League nữ 2027 được UEFA giao cho sân vận động Quốc gia Warsaw, Ba Lan. Ngày đá: chưa công bố.",
      ],
    },
  ],
  hoiDap: [
    { hoi: "Chung kết C1 2027 đá ngày nào?", dap: "Thứ Bảy 5/6/2027, theo lịch UEFA mà beIN SPORTS đăng ngày 20/8/2026. Giờ bóng lăn chưa công bố." },
    { hoi: "Chung kết C1 2027 đá ở sân nào?", dap: "Sân Metropolitano (Riyadh Air Metropolitano) của Atlético Madrid ở Madrid, Tây Ban Nha. Sức chứa các nguồn ghi khác nhau, quanh mức 68.000 chỗ, nên trang không khẳng định con số." },
    { hoi: "Đội nào vào chung kết C1 2027?", dap: "Chưa biết. Mùa 2026/27 còn ở vòng đấu bảng; hai đội vào chung kết chỉ rõ sau bán kết đầu tháng 5/2027." },
    { hoi: "Chung kết C1 2027 đá mấy giờ theo giờ Việt Nam?", dap: "Chưa công bố. Madrid chậm hơn Việt Nam 5 tiếng vào tháng 6, nên giờ đá buổi tối ở Madrid sẽ rơi vào rạng sáng hôm sau ở Việt Nam." },
    { hoi: "Chung kết C1 mùa trước đá ở đâu?", dap: "Chung kết mùa 2025/26 đá ngày 30/5/2026 tại sân Puskás Aréna, Budapest, Hungary." },
  ],
  nguon: [
    { ten: "beIN SPORTS, 20/8/2026: When and where will the 2026-27 UEFA Champions League final be played", url: "https://www.beinsports.com/en-us/soccer/uefa-champions-league/articles/when-and-where-will-the-2026-27-uefa-champions-league-final-be-played-2026-08-20" },
    { ten: "ESPN: Metropolitano to host 2027 Champions League final, Warsaw gets women's event", url: "https://global.espn.com/football/story/_/id/46222719/madrid-metropolitano-stadium-host-27-champions-league-final" },
    { ten: "beIN SPORTS, 12/9/2025: Where will be the 2027 Champions League final", url: "https://www.beinsports.com/en-us/soccer/uefa-champions-league/articles/where-will-be-the-2027-champions-league-final-2025-09-12?country=ma" },
    { ten: "UEFA: lịch bóng đá châu Âu 2026 (chung kết 30/5/2026 ở Budapest)", url: "https://www.uefa.com/news-media/news/02a0-1f71bdf70a9a-b6067bd647f2-1000--2026-european-football-calendar-dates-for-all-uefa-competiti/" },
  ],
  lienKetDuDoan: [
    { href: "/competitions/champions-league", ten: "Cúp C1: lịch, bảng xếp hạng, dự đoán" },
    { href: "/du-doan", ten: "Dự đoán bóng đá hôm nay" },
  ],
};
