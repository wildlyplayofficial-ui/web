/**
 * Dữ kiện hub /lich-thi-dau-bong-da-2027 (19/11/2026). Ngày lấy từ các tệp dữ kiện của từng
 * trang sự kiện (cùng nguồn); mục chưa công bố ghi "Chưa công bố".
 * Đổi ngày ở đây thì vẽ lại hình lịch: node apps/web/scripts/ve-hinh-lich-2027.mjs (chạy từ gốc repo).
 */
import type { DuLieuTrang } from "@/lib/lich-2027-kieu";
import { NGUON as NGUON_ASIAN_CUP } from "@/lib/asian-cup-2027";
import { DU_LIEU as C1 } from "@/lib/chung-ket-c1-2027";
import { DU_LIEU as WC_NU } from "@/lib/world-cup-nu-2027";
import { DU_LIEU as SEA } from "@/lib/sea-games-2027";

export const CAP_NHAT = "19/11/2026";
export const CAP_NHAT_ISO = "2026-11-19";

export const DU_LIEU: DuLieuTrang = {
  duong: "/lich-thi-dau-bong-da-2027",
  h1: "Lịch thi đấu bóng đá 2027: các giải lớn theo thứ tự thời gian",
  moTa: "Lịch thi đấu bóng đá 2027: chung kết C1 5/6, World Cup nữ 24/6 – 25/7, SEA Games 18 – 29/9 và Asian Cup dời sang 23/12/2027 – 21/1/2028.",
  ogPhu: "C1 · World Cup nữ · SEA Games · Asian Cup",
  capNhat: CAP_NHAT,
  moDau:
    "Lịch thi đấu bóng đá 2027 có bốn mốc lớn: chung kết C1 ngày 5/6, World Cup nữ từ 24/6 đến 25/7, SEA Games từ 18 đến 29/9, và Asian Cup đã dời sang 23/12/2027 – 21/1/2028 (chờ FIFA phê duyệt). Trang này gom ngày chính thức của từng giải, mục nào chưa công bố thì ghi rõ là chưa công bố.",
  khoi: [
    {
      id: "theo-thoi-gian",
      tieuDe: "Các giải bóng đá lớn năm 2027 theo thứ tự thời gian",
      bang: {
        cot: ["Thời gian", "Sự kiện", "Địa điểm"],
        hang: [
          ["27 – 28/4 và 4 – 5/5/2027", "Bán kết Cúp C1 (lượt đi, lượt về)", "Sân nhà của các đội"],
          ["5/6/2027", "Chung kết Cúp C1", "Sân Metropolitano, Madrid"],
          ["24/6 – 25/7/2027", "World Cup nữ 2027", "Brazil"],
          ["18 – 29/9/2027", "SEA Games 2027 (có bóng đá)", "Malaysia, bóng đá ở Johor"],
          ["23/12/2027 – 21/1/2028", "Asian Cup 2027 (đã dời, chờ FIFA duyệt)", "Saudi Arabia"],
        ],
      },
    },
    {
      id: "viet-nam",
      tieuDe: "Bóng đá Việt Nam năm 2027 đá gì, khi nào",
      danhSach: [
        "Asian Cup 2027: Việt Nam ở bảng E cùng Hàn Quốc, UAE, Yemen. Ngày đá từng trận theo lịch mới: chưa công bố.",
        "SEA Games 2027: lịch bóng đá và độ tuổi cầu thủ chưa công bố.",
        "World Cup nữ 2027: đội tuyển nữ Việt Nam không có vé dự vòng chung kết.",
      ],
    },
    {
      id: "chua-co",
      tieuDe: "Giải nào chưa có trong trang này",
      doan: [
        "Trang chỉ đưa các giải đã có ngày chính thức và nguồn kiểm chứng được. Giải nào đủ thông tin sẽ được thêm vào bảng trên.",
      ],
    },
  ],
  hoiDap: [
    { hoi: "Năm 2027 có những giải bóng đá lớn nào?", dap: "Chung kết Cúp C1 (5/6), World Cup nữ (24/6 – 25/7), SEA Games (18 – 29/9) và Asian Cup (23/12/2027 – 21/1/2028, lịch mới chờ FIFA phê duyệt)." },
    { hoi: "Asian Cup 2027 đá khi nào?", dap: "AFC dời giải sang 23/12/2027 – 21/1/2028 ngày 3/11/2026, còn chờ FIFA phê duyệt. Lịch cũ 7/1 – 5/2/2027 đã bỏ." },
    { hoi: "Việt Nam có đá World Cup nữ 2027 không?", dap: "Không, đội tuyển nữ Việt Nam không giành vé dự vòng chung kết." },
    { hoi: "Bao giờ có lịch thi đấu chi tiết từng trận?", dap: "Mỗi giải có lịch riêng: Asian Cup, World Cup nữ và bóng đá SEA Games đều chưa công bố lịch từng trận. Các trang con sẽ được cập nhật khi có." },
  ],
  nguon: [...NGUON_ASIAN_CUP, ...C1.nguon, ...WC_NU.nguon, ...SEA.nguon],
  lienKetDuDoan: [
    { href: "/du-doan", ten: "Dự đoán bóng đá hôm nay" },
    { href: "/competitions", ten: "Bảng xếp hạng các giải" },
    { href: "/doi/vietnam", ten: "Đội tuyển Việt Nam" },
  ],
};
