/**
 * Dữ kiện trang /world-cup-nu-2027 (28/11/2026). Mọi dòng có nguồn ở NGUON.
 * Danh sách đội có vé theo ESPN, thêm Mỹ và Jamaica (tứ kết 27/11 giờ Mỹ); còn đội sẽ thêm vào.
 * Đổi ngày ở đây thì vẽ lại hình lịch: node apps/web/scripts/ve-hinh-lich-2027.mjs (chạy từ gốc repo).
 */
import type { DuLieuTrang } from "@/lib/lich-2027-kieu";

export const CAP_NHAT = "28/11/2026";
export const CAP_NHAT_ISO = "2026-11-28";
const CHUA_CONG_BO = "Chưa công bố";

export const DU_LIEU: DuLieuTrang = {
  duong: "/world-cup-nu-2027",
  h1: "World Cup nữ 2027: lịch thi đấu, đội có vé, Việt Nam có dự không",
  moTa: "World Cup nữ 2027 đá từ 24/6 đến 25/7/2027 tại Brazil, 32 đội. Việt Nam không có vé. 20 đội đã có vé tính đến 28/11/2026. Lịch từng trận: chưa công bố.",
  ogPhu: "24/6 – 25/7/2027 · Brazil · 32 đội",
  capNhat: CAP_NHAT,
  moDau:
    "World Cup nữ 2027 diễn ra từ 24/6 đến 25/7/2027 tại Brazil, lần đầu tiên giải này được tổ chức ở Nam Mỹ. Đội tuyển nữ Việt Nam không có vé dự vòng chung kết. Lịch từng trận và kết quả bốc thăm chia bảng chưa được công bố; trang này sẽ cập nhật khi có.",
  khoi: [
    {
      id: "lich",
      tieuDe: "24/6 – 25/7/2027: các mốc World Cup nữ 2027",
      doan: ["Ngày khai mạc và chung kết do Hội đồng FIFA chốt từ tháng 12/2024. Các mốc khác chưa có thông tin chính thức."],
      bang: {
        cot: ["Mốc", "Thời gian"],
        hang: [
          ["Khai mạc", "Thứ Năm 24/6/2027"],
          ["Chung kết", "Chủ nhật 25/7/2027"],
          ["Play-off liên lục địa (3 suất)", "Tháng 2/2027"],
          ["Bốc thăm chia bảng", CHUA_CONG_BO],
          ["Ngày giờ từng trận", CHUA_CONG_BO],
        ],
      },
    },
    {
      id: "viet-nam",
      tieuDe: "Đội tuyển nữ Việt Nam và World Cup nữ 2027",
      doan: [
        "Châu Á có 6 suất, đã chốt sau các trận play-off tháng 3/2026: Australia, Trung Quốc, Nhật Bản, CHDCND Triều Tiên, Hàn Quốc và Philippines. Việt Nam không nằm trong danh sách này và cũng không nằm trong số đội châu Á dự play-off liên lục địa (Đài Bắc Trung Hoa và Uzbekistan).",
      ],
    },
    {
      id: "doi-co-ve",
      tieuDe: "20 đội đã có vé dự World Cup nữ 2027",
      doan: [
        "Tính đến ngày 28/11/2026 đã có 20 đội: 18 đội trong danh sách của ESPN, cộng thêm Mỹ và Jamaica sau tứ kết Concacaf W Championship ngày 27/11 (giờ Mỹ). Danh sách dưới đây sẽ đổi.",
        "Các mốc vòng loại còn lại: play-off châu Âu (8 cặp, 26/11 – 5/12/2026); tứ kết Concacaf Canada – Panama và Mexico – Haiti (28/11 giờ Mỹ), đội thắng có vé; play-in Concacaf ngày 2/12 cho các đội thua tứ kết; play-off liên lục địa.",
      ],
      danhSach: [
        "Chủ nhà: Brazil",
        "Châu Âu (4): Đan Mạch, Pháp, Đức, Tây Ban Nha",
        "Nam Mỹ (2): Argentina, Colombia",
        "Châu Á (6): Australia, Trung Quốc, Nhật Bản, CHDCND Triều Tiên, Hàn Quốc, Philippines",
        "Châu Phi (4): Algeria, Morocco, Cameroon, Malawi",
        "Châu Đại Dương (1): New Zealand",
        "Bắc, Trung Mỹ và Caribe (2): Mỹ, Jamaica",
      ],
    },
    {
      id: "the-thuc",
      tieuDe: "32 đội chia 8 bảng: thể thức World Cup nữ 2027",
      doan: [
        "Giải có 32 đội chia thành 8 bảng, mỗi bảng 4 đội. Hai đội đứng đầu mỗi bảng vào vòng loại trực tiếp. Danh sách đăng ký tăng từ 23 lên 26 cầu thủ.",
      ],
    },
    {
      id: "san",
      tieuDe: "8 sân ở 8 thành phố của Brazil",
      doan: ["Mỗi thành phố một sân. Sân nào đá trận nào: chưa công bố."],
      danhSach: [
        "Belo Horizonte: Estadio Mineirao",
        "Brasilia: Estadio Nacional",
        "Fortaleza: Arena Castelao",
        "Porto Alegre: Estadio Beira-Rio",
        "Recife: Arena de Pernambuco",
        "Rio de Janeiro: Estadio do Maracana",
        "Salvador: Arena Fonte Nova",
        "Sao Paulo: Arena Itaquera",
      ],
    },
  ],
  hoiDap: [
    { hoi: "World Cup nữ 2027 đá khi nào?", dap: "Từ 24/6 đến 25/7/2027. Trận khai mạc ngày 24/6, chung kết ngày 25/7." },
    { hoi: "World Cup nữ 2027 tổ chức ở đâu?", dap: "Tại Brazil, 8 thành phố. Đây là lần đầu tiên World Cup nữ tổ chức ở Nam Mỹ." },
    { hoi: "Việt Nam có tham dự World Cup nữ 2027 không?", dap: "Không. Việt Nam không nằm trong 6 đội châu Á đã giành vé và không dự play-off liên lục địa." },
    { hoi: "Đội nào đã có vé dự World Cup nữ 2027?", dap: "Tính đến 28/11/2026 có 20 đội: Brazil, Đan Mạch, Pháp, Đức, Tây Ban Nha, Argentina, Colombia, Australia, Trung Quốc, Nhật Bản, CHDCND Triều Tiên, Hàn Quốc, Philippines, Algeria, Morocco, Cameroon, Malawi, New Zealand, Mỹ và Jamaica." },
    { hoi: "World Cup nữ 2027 có bao nhiêu đội?", dap: "32 đội, chia 8 bảng. Hai đội đầu mỗi bảng đi tiếp." },
    { hoi: "Bao giờ bốc thăm chia bảng World Cup nữ 2027?", dap: "Chưa công bố. Lịch bốc thăm chưa được FIFA ấn định tại thời điểm cập nhật." },
  ],
  nguon: [
    { ten: "FIFA: ngày khai mạc và chung kết World Cup nữ Brazil 2027 (Hội đồng FIFA, 10/12/2024)", url: "https://inside.fifa.com/news/fifa-womens-world-cup-brazil-2027-dates-confirmed" },
    { ten: "ESPN: 2027 Women's World Cup, thể thức, đội đã có vé, sân", url: "https://www.espn.ph/football/story/_/id/48983407/everything-need-know-2027-womens-world-cup-format-qualified-more" },
    { ten: "Tuổi Trẻ: xác định 6 đội nữ châu Á dự World Cup 2027", url: "https://tuoitre.vn/asian-cup-nu.html" },
    { ten: "US Soccer: Mỹ là đội thứ 20 giành vé (27/11/2026)", url: "https://www.ussoccer.com/stories/2026/11/uswnt-vs-el-salvador-match-recap-highlights-concacaf-w-championship" },
    { ten: "ESPN: đội thắng tứ kết Concacaf có vé trực tiếp (27/11/2026)", url: "https://www.espn.com/soccer/report/_/gameId/401870040" },
    { ten: "Wikipedia: 2026 Concacaf W Championship, nhánh đấu và play-in", url: "https://en.wikipedia.org/wiki/2026_CONCACAF_W_Championship" },
  ],
  lienKetDuDoan: [
    { href: "/du-doan", ten: "Dự đoán bóng đá hôm nay" },
    { href: "/doi/vietnam", ten: "Đội tuyển Việt Nam" },
  ],
};
