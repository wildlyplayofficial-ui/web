/**
 * Dữ kiện trang /sea-games-2027 (19/11/2026). Mọi dòng có nguồn ở NGUON.
 * Lịch từng trận bóng đá và quy định độ tuổi chưa có nguồn chính thức: để CHUA_CONG_BO.
 * Đổi ngày ở đây thì vẽ lại hình lịch: node apps/web/scripts/ve-hinh-lich-2027.mjs (chạy từ gốc repo).
 */
import type { DuLieuTrang } from "@/lib/lich-2027-kieu";

export const CAP_NHAT = "19/11/2026";
export const CAP_NHAT_ISO = "2026-11-19";
const CHUA_CONG_BO = "Chưa công bố";

export const DU_LIEU: DuLieuTrang = {
  duong: "/sea-games-2027",
  h1: "SEA Games 2027: tổ chức ở đâu, ngày khai mạc, bóng đá đá ở đâu",
  moTa: "SEA Games 2027 (SEA Games 34) diễn ra 18-29/9/2027 tại Malaysia. Bóng đá đá ở Johor. Lịch từng trận và độ tuổi cầu thủ: chưa công bố.",
  ogPhu: "18 – 29/9/2027 · Malaysia",
  capNhat: CAP_NHAT,
  moDau:
    "SEA Games 2027 (SEA Games 34) diễn ra từ 18 đến 29/9/2027 tại Malaysia, với bóng đá thi đấu ở bang Johor. Lịch từng trận bóng đá nam và nữ, cùng quy định độ tuổi cầu thủ, chưa được công bố; trang này sẽ cập nhật khi có.",
  khoi: [
    {
      id: "moc",
      tieuDe: "18 – 29/9/2027: các mốc SEA Games 2027",
      bang: {
        cot: ["Mốc", "Thông tin"],
        hang: [
          ["Khai mạc", "18/9/2027, sân vận động Sarawak"],
          ["Bế mạc", "29/9/2027, sân vận động quốc gia Bukit Jalil, Kuala Lumpur"],
          ["Bóng đá", "Thi đấu tại Johor"],
          ["Lịch từng trận bóng đá nam, nữ", CHUA_CONG_BO],
          ["Độ tuổi cầu thủ bóng đá", CHUA_CONG_BO],
        ],
      },
    },
    {
      id: "o-dau",
      tieuDe: "Malaysia đăng cai: 4 cụm thi đấu",
      doan: [
        "Theo kế hoạch Malaysia công bố, Đại hội chia thành các cụm: Sarawak (cụm chính, lễ khai mạc và 17 môn), Penang (6 môn), Kuala Lumpur (14 môn, lễ bế mạc) và Johor (trung tâm bóng đá). Bóng đá nam dự kiến ở các sân tại Johor như sân Sultan Ibrahim và sân Pasir Gudang; bóng đá nữ ở các sân như Kulai Mini Stadium.",
        "Số môn thi đấu: Hội đồng Liên đoàn SEA Games duyệt thêm 5 môn hồi tháng 7/2026, nâng tổng lên 43 môn. Danh sách môn và địa điểm có thể còn điều chỉnh.",
      ],
    },
    {
      id: "gio",
      tieuDe: "SEA Games 2027 đá mấy giờ theo giờ Việt Nam",
      doan: [
        "Malaysia nhanh hơn Việt Nam 1 tiếng: trận đá 20h00 ở Johor là 19h00 theo giờ Việt Nam. Lịch từng trận bóng đá chưa công bố, nên chưa có giờ cụ thể.",
      ],
    },
  ],
  hoiDap: [
    { hoi: "SEA Games 2027 tổ chức ở đâu?", dap: "Tại Malaysia, ở các bang Sarawak, Penang, Johor và thành phố Kuala Lumpur. Bóng đá thi đấu ở Johor." },
    { hoi: "SEA Games 2027 khai mạc ngày nào?", dap: "18/9/2027 tại sân vận động Sarawak. Lễ bế mạc ngày 29/9/2027 tại sân Bukit Jalil, Kuala Lumpur." },
    { hoi: "SEA Games 2027 là SEA Games thứ mấy?", dap: "SEA Games 34, theo cách gọi của báo chí Việt Nam. Kỳ trước (SEA Games 33) diễn ra năm 2025 tại Thái Lan." },
    { hoi: "Lịch thi đấu bóng đá SEA Games 2027 khi nào có?", dap: "Chưa công bố. Ban tổ chức mới chốt ngày khai mạc, bế mạc và cụm thi đấu." },
    { hoi: "Bóng đá SEA Games 2027 giới hạn tuổi nào?", dap: "Chưa công bố. Trang này không suy ra từ kỳ trước, sẽ cập nhật khi có quy định chính thức." },
  ],
  nguon: [
    { ten: "Wikipedia: 2027 SEA Games (ngày, cụm thi đấu, sân bóng đá)", url: "https://en.wikipedia.org/wiki/2027_SEA_Games" },
    { ten: "New Straits Times, 12/2025: Sarawak, Penang, Johor, KL to host 2027 SEA Games", url: "https://www.nst.com.my/amp/sports/others/2025/12/1330688/sarawak-penang-johor-kl-host-2027-sea-games" },
    { ten: "Lao Động: SEA Games 34 sẽ tổ chức 38 môn vào năm 2027", url: "https://news.laodong.vn/the-thao/sea-games-34-se-to-chuc-38-mon-vao-nam-2027-1621583.ldo" },
  ],
  lienKetDuDoan: [
    { href: "/du-doan", ten: "Dự đoán bóng đá hôm nay" },
    { href: "/doi/vietnam", ten: "Đội tuyển Việt Nam" },
  ],
};
