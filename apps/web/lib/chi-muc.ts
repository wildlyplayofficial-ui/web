/**
 * Trang bài nào ĐƯỢC mời Google lập chỉ mục (Peter chốt 9/11/2026).
 *
 * Bối cảnh: từ 4/9 Google bỏ chỉ mục gần hết site. Đo GSC 16 tháng (9/11): 460
 * URL trong sitemap, chỉ 66 từng có lượt hiện. Dọn: chỉ mời Google vào nhóm có
 * nhu cầu thật, phần còn lại noindex + rút khỏi sitemap. Trang vẫn sống, vẫn
 * follow, người đọc vào thẳng vẫn xem được.
 *
 * - /news: chỉ giữ tin từng có lượt hiện (danh sách cứng bên dưới). Tin mới đăng
 *   sau này mặc định KHÔNG index — muốn index thì thêm slug vào đây.
 * - /analysis: giữ nhóm "xem giải X ở đâu / lịch thi đấu / mấy giờ" (khớp mẫu,
 *   tự áp cho bài mới cùng loại) + vài bài từng có lượt hiện.
 */
export const NEWS_GIU_INDEX = new Set([
  "aston-villa-chinh-thuc-ky-leon-goretzka-tu-do-tu-bayern-munich",
  "aston-villa-dat-thoa-thuan-toi-65-trieu-bang-cho-nicolas-jackson",
  "chung-ket-asean-cup-2026-viet-nam-thai-lan-lich-hai-luot-va-ba-cai-ten-dang-chu-y",
  "crystal-palace-chieu-mo-zavier-gozo-tu-real-salt-lake-chinh-thuc",
  "curtis-jones-chinh-thuc-roi-liverpool-sang-inter-milan",
  "ezri-konsa-chinh-thuc-gia-nhap-arsenal-hop-dong-4-nam",
  "joao-cancelo-tro-lai-barcelona-lan-thu-ba-hop-dong-3-mua-chinh-thuc",
  "liam-delap-chinh-thuc-gia-nhap-nottingham-forest-hop-dong-5-nam",
  "man-city-chinh-thuc-ky-ayyoub-bouaddi-hop-dong-5-nam",
  "man-united-chinh-thuc-ky-carlos-baleba-tu-brighton",
  "newcastle-chieu-mo-amar-dedic-tu-benfica-chinh-thuc",
  "nottingham-forest-dat-thoa-thuan-ky-luc-50-trieu-bang-cho-liam-delap",
  "tottenham-chinh-thuc-ky-savio-tu-manchester-city",
  "tottenham-dat-thoa-thuan-muon-omar-marmoush-nghia-vu-mua-60-trieu-bang",
  "vicario-roi-tottenham-sang-juventus-chinh-thuc",
]);

const ANALYSIS_GIU_INDEX = new Set([
  "ba-doi-len-hang-ngoai-hang-anh-2026-27-ai-tru-duoc",
  "lich-derby-dai-chien-ngoai-hang-anh-2026-27",
  "thu-hang-arsenal-coventry-city-bxh-ngoai-hang-anh",
]);

/** Bài "xem ở đâu / lịch thi đấu / mấy giờ" — nhóm duy nhất từng ăn click. */
const MAU_TRANG_LICH = /^(xem-.*-o-dau|lich-thi-dau-|.*-da-may-gio-)/;

export function newsDuocIndex(slug: string): boolean {
  return NEWS_GIU_INDEX.has(slug);
}

export function analysisDuocIndex(slug: string): boolean {
  return MAU_TRANG_LICH.test(slug) || ANALYSIS_GIU_INDEX.has(slug);
}
