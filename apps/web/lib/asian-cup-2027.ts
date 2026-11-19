/**
 * Dữ kiện trang /lich-thi-dau-asian-cup-2027 (kiểm lại 19/11/2026).
 * Mọi dòng đều có nguồn ở NGUON bên dưới. Mục nào AFC chưa công bố thì ghi CHUA_CONG_BO,
 * KHÔNG suy ra ngày đá từ lịch cũ. AFC ra lịch mới → sửa file này, trang tự đổi theo.
 * Đổi ngày ở đây thì vẽ lại hình lịch: node apps/web/scripts/ve-hinh-lich-2027.mjs (chạy từ gốc repo).
 */
export const CAP_NHAT = "19/11/2026";
export const CAP_NHAT_ISO = "2026-11-19";
export const CHUA_CONG_BO = "Chưa công bố";

export interface MocLich {
  moc: string;
  lichMoi: string;
  lichCu: string;
}

/** Lịch mới: AFC báo 3/11/2026 (chờ FIFA duyệt). Lịch cũ: AFC công bố 26/10/2026, nay đã bỏ. */
export const MOC_LICH: MocLich[] = [
  { moc: "Khai mạc", lichMoi: "23/12/2027", lichCu: "7/1/2027" },
  { moc: "Vòng bảng", lichMoi: CHUA_CONG_BO, lichCu: "7/1 – 20/1/2027" },
  { moc: "Vòng 16 đội", lichMoi: CHUA_CONG_BO, lichCu: "Từ 22/1/2027" },
  { moc: "Tứ kết", lichMoi: CHUA_CONG_BO, lichCu: "28/1 và 29/1/2027" },
  { moc: "Bán kết", lichMoi: CHUA_CONG_BO, lichCu: "1/2 và 2/2/2027" },
  { moc: "Chung kết", lichMoi: "21/1/2028", lichCu: "5/2/2027" },
];

export interface TranVietNam {
  tran: string;
  lichMoi: string;
  lichCu: string;
}

/** 3 trận vòng bảng của Việt Nam. Cặp đấu giữ theo kết quả bốc thăm; ngày giờ mới chưa có. */
export const TRAN_VIET_NAM: TranVietNam[] = [
  { tran: "UAE – Việt Nam", lichMoi: CHUA_CONG_BO, lichCu: "20h30 ngày 11/1/2027" },
  { tran: "Việt Nam – Hàn Quốc", lichMoi: CHUA_CONG_BO, lichCu: "17h30 ngày 15/1/2027" },
  { tran: "Việt Nam – Yemen", lichMoi: CHUA_CONG_BO, lichCu: "20h30 ngày 20/1/2027" },
];

export const BANG_DAU: { bang: string; doi: string[] }[] = [
  { bang: "A", doi: ["Saudi Arabia (chủ nhà)", "Kuwait", "Oman", "Palestine"] },
  { bang: "B", doi: ["Uzbekistan", "Bahrain", "CHDCND Triều Tiên", "Jordan"] },
  { bang: "C", doi: ["Iran", "Syria", "Kyrgyzstan", "Trung Quốc"] },
  { bang: "D", doi: ["Australia", "Tajikistan", "Iraq", "Singapore"] },
  { bang: "E", doi: ["Hàn Quốc", "UAE", "Việt Nam", "Yemen"] },
  { bang: "F", doi: ["Nhật Bản", "Qatar", "Thái Lan", "Indonesia"] },
];

export const SAN_DAU: { thanhPho: string; san: string[] }[] = [
  {
    thanhPho: "Riyadh",
    san: [
      "King Fahd Sports City",
      "King Saud University",
      "Kingdom Arena",
      "Imam Mohammad Ibn Saud University",
      "Al Shabab",
    ],
  },
  { thanhPho: "Jeddah", san: ["King Abdullah Sports City", "Prince Abdullah Al Faisal Sports City"] },
  { thanhPho: "Al Khobar", san: ["Aramco"] },
];

export const HOI_DAP: { hoi: string; dap: string }[] = [
  {
    hoi: "Asian Cup 2027 đá khi nào?",
    dap: "Từ 23/12/2027 đến 21/1/2028 tại Saudi Arabia. Đây là lịch mới AFC thông báo ngày 3/11/2026, thay cho lịch cũ 7/1 – 5/2/2027, và còn chờ FIFA phê duyệt.",
  },
  {
    hoi: "Vì sao Asian Cup 2027 bị dời?",
    dap: "AFC nêu lý do là tình hình bất ổn trong khu vực Trung Đông làm việc đi lại và hậu cần khó khăn. Quyết định được đưa ra sau khi AFC làm việc với ban tổ chức sở tại và Liên đoàn Bóng đá Saudi Arabia.",
  },
  {
    hoi: "Việt Nam nằm ở bảng nào tại Asian Cup 2027?",
    dap: "Bảng E, cùng Hàn Quốc, UAE và Yemen, theo kết quả bốc thăm ngày 9/5/2026.",
  },
  {
    hoi: "Việt Nam đá trận đầu tiên ngày nào?",
    dap: "Chưa công bố. Lịch cũ xếp trận UAE – Việt Nam vào 20h30 ngày 11/1/2027 (giờ Việt Nam), nhưng lịch này đã bị bỏ khi giải dời sang tháng 12/2027.",
  },
  {
    hoi: "Giải đá vào năm 2028 thì có đổi tên không?",
    dap: "Không. Giải vẫn giữ tên Asian Cup 2027 dù trận chung kết diễn ra ngày 21/1/2028.",
  },
  {
    hoi: "Giờ Saudi Arabia lệch giờ Việt Nam bao nhiêu?",
    dap: "Saudi Arabia chậm hơn Việt Nam 4 tiếng. Trận đá 20h00 ở Riyadh là 0h00 hôm sau theo giờ Việt Nam.",
  },
];

export const NGUON: { ten: string; url: string }[] = [
  { ten: "VnExpress, 3/11/2026: Asian Cup 2027 bị hoãn gần một năm", url: "https://vnexpress.net/asian-cup-2027-bi-hoan-gan-mot-nam-5140191.html" },
  { ten: "Tuổi Trẻ, 3/11/2026: AFC dời lịch Asian Cup 2027 đến tháng 12/2027", url: "https://tuoitre.vn/nong-afc-doi-lich-asian-cup-2027-den-tan-thang-12-2027-100261103132425968.htm" },
  { ten: "VOV, 26/10/2026: lịch thi đấu của đội tuyển Việt Nam (lịch cũ)", url: "https://vov.vn/the-thao/lich-thi-dau-chinh-thuc-cua-dt-viet-nam-tai-asian-cup-2027-post1344743.vov" },
  { ten: "Báo Quốc tế, 3/11/2026: lịch mới sẽ được trình FIFA phê duyệt", url: "https://baoquocte.vn/vong-chung-ket-asian-cup-2027-doi-sang-to-chuc-tu-thang-12-2027-den-1-2028-464089.html" },
  { ten: "AFC: trang chính thức Asian Cup Saudi Arabia 2027", url: "https://www.the-afc.com/en/national/afc_asian_cup.html" },
];
