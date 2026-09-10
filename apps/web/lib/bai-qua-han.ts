/**
 * Bài TRƯỚC TRẬN mà trận đã đá xong.
 *
 * Vì sao có tệp này (đo 10/9/2026): 12 bài dạng "mấy giờ đá", "xem ở đâu",
 * "soi kèo", "lịch thi đấu vòng N" còn nguyên văn phong tương lai trên web
 * trong khi trận đã đá — bài Chelsea vs Leeds quá hạn 8 giờ, bài Siêu cúp Anh
 * quá hạn 24 ngày. Người đọc vào thấy "sẽ gặp", "đáng để thức" cho một trận đã
 * có tỉ số. Không xoá bài (mất link trỏ tới, mất lịch sử), chỉ nói thẳng ở đầu
 * bài là trận đã xong và chỉ đường sang bài kết quả.
 *
 * Vì sao là BẢNG GHI TAY chứ không tự suy: 5 bài /news/ trong nhóm này KHÔNG có
 * `match_id` (kiểm trang thật 10/9 — không bài nào in dòng giờ đá), nên không
 * có mốc thời gian nào để so. Bài Desk thì slug do người đặt, không theo khuôn
 * `xem-truoc-<đội>-vs-<đội>-YYYY-MM-DD` nên cũng không đọc được ngày từ slug.
 *
 * Bài ĐĂNG SAU thì KHÔNG cần thêm vào đây: trang /news tự so `kickoffUtc` lấy
 * từ `match_id` với hiện tại. Bảng này chỉ để vá nhóm bài cũ thiếu dữ liệu.
 * Khi nào bài cũ được gắn `match_id` thì xoá dòng tương ứng đi.
 */

export interface BaiQuaHan {
  /** Đường dẫn bài kết quả để chỉ sang. Không có bài kết quả thì bỏ trống. */
  den?: string;
  /** Tên bài kết quả, in nguyên văn cho người đọc biết bấm vào đâu. */
  ten?: string;
}

/** Khoá là slug, không kèm /news/ hay /analysis/ — slug hai mục không trùng nhau. */
export const BAI_QUA_HAN: Record<string, BaiQuaHan> = {
  "chelsea-vs-leeds-may-gio-cup-lien-doan-anh-vong-3": {
    den: "/news/chelsea-6-3-leeds-nguoc-dong-tu-0-2-cup-lien-doan-anh",
    ten: "Chelsea 6-3 Leeds: ngược dòng từ 0-2 ở Cúp Liên đoàn Anh",
  },
  "chung-ket-luot-ve-aseancup-2026-viet-nam-thai-lan-xem-o-dau": {
    den: "/news/ket-qua-chung-ket-asean-cup-2026-viet-nam-thai-lan",
    ten: "Việt Nam vô địch ASEAN Cup 2026: hòa Thái Lan 2-2, thắng chung cuộc 4-2",
  },
  "chung-ket-asean-cup-2026-viet-nam-thai-lan-lich-hai-luot-va-ba-cai-ten-dang-chu-y": {
    den: "/news/ket-qua-chung-ket-asean-cup-2026-viet-nam-thai-lan",
    ten: "Việt Nam vô địch ASEAN Cup 2026: hòa Thái Lan 2-2, thắng chung cuộc 4-2",
  },
  "arsenal-vs-man-city-sieu-cup-anh": {
    den: "/analysis/arsenal-man-city-sieu-cup-anh-2026-ket-qua",
    ten: "Arsenal 3-0 Man City: bàn phút thứ nhất và trận ra mắt đắng của Maresca",
  },
  "soi-keo-ipswich-vs-liverpool-vong-3": {
    den: "/news/isak-lap-cu-dup-liverpool-thang-ipswich-2-0",
    ten: "Isak lập cú đúp trong 9 phút, Liverpool thắng Ipswich 2-0 và có 3 điểm đầu tiên",
  },
  "lich-thi-dau-ngoai-hang-anh-vong-3": {
    den: "/news/bang-xep-hang-ngoai-hang-anh-sau-vong-3",
    ten: "BXH Ngoại hạng Anh sau vòng 3: Man City, Arsenal cùng toàn thắng dẫn đầu",
  },
  "lich-da-hom-nay-30-8-chelsea-mu": {
    den: "/analysis/ket-qua-ngoai-hang-anh-2026-27-vong-2",
    ten: "Kết quả Ngoại hạng Anh vòng 2",
  },
  // Bốn bài dưới đây CHƯA có bài kết quả tương ứng (kiểm sitemap 10/9). Vẫn gắn
  // nhãn để người đọc khỏi tưởng trận chưa đá, nhưng không bịa ra link.
  "20-doi-ngoai-hang-anh-2026-27-va-tran-mo-man-tung-doi": {},
  "soi-keo-real-madrid-vs-real-sociedad-la-liga-27-8": {},
  "soi-keo-crystal-palace-vs-manchester-city-29-8": {},
  "u20-viet-nam-vs-u20-trieu-tien-31-8-may-gio-kenh-nao": {},
  // CỐ Ý KHÔNG có ở đây, đừng thêm vào nhầm:
  // - lich-cup-c1-dem-8-9-... : 6 trận thì mới 3 trận có bài kết quả, một link
  //   không đại diện được cả bài.
  // - lich-thi-dau-cup-c1-2026-27-vong-1-... : 12/18 trận đã đá, 6 trận còn lại
  //   đá tối 10/9 và rạng sáng 11/9 — bài VẪN CÒN DÙNG ĐƯỢC.
};

/** Trận đã đá xong chưa. Trả về thông tin bài kết quả nếu có.
 *
 *  `loai` BẮT BUỘC phải là "preview" thì nhánh tự động mới chạy. Bài KẾT QUẢ
 *  cũng gắn `match_id` và giờ trận cũng đã qua — thiếu điều kiện này thì bài
 *  "Chelsea 6-3 Leeds" sẽ tự dán nhãn "trận này đã kết thúc" lên chính nó.
 *  Hôm nay chưa lộ vì bài kết quả đang bỏ trống `match_id`, nhưng ngày nào
 *  người ta điền vào là hỏng ngay, mà hỏng kiểu không ai báo lỗi. */
export function baiQuaHan(
  slug: string,
  kickoffUtc?: string | null,
  loai?: string | null,
): BaiQuaHan | null {
  const ghiTay = BAI_QUA_HAN[slug];
  if (ghiTay) return ghiTay;
  // Đường tự động cho bài trước trận có gắn trận: không cần ai ghi tay nữa.
  if (loai !== "preview" || !kickoffUtc) return null;
  const gio = Date.parse(kickoffUtc);
  return Number.isNaN(gio) || gio >= Date.now() ? null : {};
}
