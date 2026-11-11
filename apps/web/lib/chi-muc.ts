/**
 * Trang bài nào ĐƯỢC mời Google lập chỉ mục (Peter chốt 9/11/2026).
 *
 * Bối cảnh: từ 4/9 Google bỏ chỉ mục gần hết site. Đo GSC 16 tháng (9/11): 460
 * URL trong sitemap, chỉ 66 từng có lượt hiện. Dọn: chỉ mời Google vào nhóm có
 * nhu cầu thật, phần còn lại noindex + rút khỏi sitemap. Trang vẫn sống, vẫn
 * follow, người đọc vào thẳng vẫn xem được.
 *
 * - Bài đăng chưa quá 21 ngày LUÔN được index (Jane góp 9/11): bài mới chưa kịp có
 *   lượt hiện, tắt luôn là giết nó từ trứng. Qua 21 ngày mới xét danh sách.
 * - /news: sau 21 ngày chỉ giữ tin từng có lượt hiện (danh sách cứng bên dưới).
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
  // 9/11: bỏ "thu-hang-arsenal-coventry..." — BXH sau vòng 1, ~500 chữ, đã cũ.
]);

/** Bài "xem ở đâu / lịch thi đấu / mấy giờ" — nhóm duy nhất từng ăn click. */
const MAU_TRANG_LICH = /^(xem-.*-o-dau|lich-thi-dau-|.*-da-may-gio-)/;

/** Trang lịch/xem ở đâu theo CẢ MÙA (bỏ bài lịch từng vòng — qua vòng là cũ) — trang chủ trỏ vào nhóm này. */
export function laTrangLichCaMua(slug: string): boolean {
  // ASEAN Cup 2026 đá xong 5/10 — giải đã hết, không đưa lên trang chủ.
  return MAU_TRANG_LICH.test(slug) && !/-vong-\d/.test(slug) && !slug.includes("asean-cup-2026");
}

/** Bài blog lịch / BXH / xem ở đâu theo cả mùa — trang chủ trỏ vào nhóm này.
 *  Bỏ lịch "cuối tuần" (qua tuần là cũ) và ASEAN Cup 2026 (đá xong 5/10). */
export function laBlogLichCaMua(slug: string): boolean {
  return /^(xem-.*-o-dau|lich-thi-dau-|bxh-)/.test(slug) && !slug.includes("cuoi-tuan") && !slug.includes("asean-cup-2026");
}

/** Bài trụ lâu năm (lịch cả mùa / xem ở đâu / mấy giờ + bài giữ index) — trang giải trỏ vào nhóm này. */
export function laBaiTru(slug: string): boolean {
  return laTrangLichCaMua(slug) || ANALYSIS_GIU_INDEX.has(slug);
}

const HAN_BAI_MOI_MS = 21 * 24 * 3_600_000;

function conMoi(ngayDang: string | null | undefined): boolean {
  const t = ngayDang ? Date.parse(ngayDang) : NaN;
  return Number.isFinite(t) && Date.now() - t < HAN_BAI_MOI_MS;
}

/** Tin dưới ngưỡng này là tin mỏng (12/11): noindex + không nộp sitemap, dù mới hay trong danh sách giữ. */
export const NEWS_TOI_THIEU_CHU = 400;

/** Đếm chữ thân bài, bỏ thẻ HTML/ký hiệu markdown. Không có thân bài → 0. */
export function demChu(body: string | null | undefined): number {
  if (!body) return 0;
  const chu = body
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`~\[\]()|-]+/g, " ")
    .trim();
  return chu ? chu.split(/\s+/).length : 0;
}

/** `soChu` không truyền = chưa đo (giữ luật cũ); truyền thì tin dưới NEWS_TOI_THIEU_CHU không được index. */
export function newsDuocIndex(slug: string, ngayDang?: string | null, soChu?: number): boolean {
  if (soChu !== undefined && soChu < NEWS_TOI_THIEU_CHU) return false;
  return conMoi(ngayDang) || NEWS_GIU_INDEX.has(slug);
}

export function analysisDuocIndex(slug: string, ngayDang?: string | null): boolean {
  // 9/11: bài lịch TỪNG VÒNG (vòng 1/3/4…) và ASEAN Cup 2026 đã đá xong → noindex,
  // chỉ giữ index bài lịch cả mùa. Trang vẫn mở cho người vào thẳng.
  return conMoi(ngayDang) || laTrangLichCaMua(slug) || ANALYSIS_GIU_INDEX.has(slug);
}

/**
 * Trang trận /du-doan/{slug} (Peter chốt 10/11/2026): trận nào cũng có trang riêng,
 * nhưng chỉ mời Google vào GIẢI LỚN + TRẬN ĐỘI TUYỂN + mọi trận có VIỆT NAM. Trận còn
 * lại noindex,follow và không vào sitemap. Thêm/bớt giải: SỬA BA DÒNG DƯỚI ĐÂY.
 * Tên giải so trên tên đang hiển thị (tên Việt nếu có, không thì tên gốc).
 */
const GIAI_LON_INDEX = /^(ngoại hạng anh|premier league|la ?liga|serie a|bundesliga|ligue 1|v-?league( 1)?|(uefa )?(champions|europa|conference) league)$/i;
const GIAI_DOI_TUYEN_INDEX = /nations league|world cup|\beuro\b|asian cup|asean cup|aff cup|copa am[eé]rica|giao hữu|friendl|vòng loại|qualif/i;
const DOI_VIET_NAM = /vi[eệ]t nam|vietnam/i;

export function tranDuocIndex(h: { slug: string; giai: string; nha: string; khach: string }): boolean {
  // 12/11: trang trận dựng từ TỆP TUẦN (slug `tuan-…`, xem lib/du-doan-tuan.ts) là trang
  // khuôn mỏng, không có bài — noindex,follow + không nộp sitemap. Chỉ bài tay
  // `nhan-dinh-…` mới xét giải/đội như dưới.
  if (h.slug.startsWith("tuan-")) return false;
  return (
    GIAI_LON_INDEX.test(h.giai) || GIAI_DOI_TUYEN_INDEX.test(h.giai) || DOI_VIET_NAM.test(h.nha) || DOI_VIET_NAM.test(h.khach)
  );
}

/** Nhóm sitemap con (12/11): /sitemap/{id}.xml, mỗi nhóm một dòng riêng trong Search Console.
 *  Mục lục /sitemap.xml liệt kê các nhóm này — xem app/sitemap.xml/route.ts. */
export const NHOM_SITEMAP = ["static", "blog", "analysis", "news", "du-doan"] as const;
export type NhomSitemap = (typeof NHOM_SITEMAP)[number];
