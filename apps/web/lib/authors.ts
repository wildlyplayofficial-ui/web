import { CHU_TAM, PETE, SITE_NAME, SITE_URL } from "./brand";

/**
 * Hai tác giả của banhbong.net (Peter chốt 15/9/2026 trong group banhbong):
 *  - Chú Tám Banh: mọi bài phân tích, nhận định, dự đoán.
 *  - Pete Nguyễn: bài tin tức và blog.
 * Cột `byline` trong DB mang đúng một trong hai tên này; trang bài tra tên ở đây
 * để ra link hồ sơ, schema Person và dòng khai AI.
 */
export interface AuthorProfile {
  name: string;
  slug: string;
  path: string;
  role: string;
  bio: string;
  disclosure: string;
}

export const AUTHORS: readonly AuthorProfile[] = [
  {
    name: CHU_TAM,
    slug: "chu-tam-banh",
    path: "/tac-gia/chu-tam-banh",
    role: "Phân tích · Nhận định trước trận",
    // Chép từ persona trên /about (app/[lang]/about/copy.ts) — sửa thì sửa cả hai.
    bio: "Chú Tám Banh là người thật đứng sau mọi nhận định trên banhbong.net — theo bóng đá châu Âu hơn 15 năm, chuyên Ngoại hạng Anh và các giải lớn châu Âu. Mỗi trận đều tự đọc số liệu, xem phong độ và đội hình rồi mới đặt bút. Không nhận định gượng ép: không thấy lợi thế thì ghi rõ là bỏ qua. Thành tích thắng thua công khai từ ngày đầu, không sửa, không xoá.",
    disclosure: "Chú Tám Banh chọn trận và góc nhìn · AI viết bài từ số liệu",
  },
  {
    name: PETE,
    slug: "pete-nguyen",
    path: "/tac-gia/pete-nguyen",
    role: "Biên tập tin tức · Blog",
    bio: "Pete Nguyễn biên tập mảng tin tức và blog của banhbong.net: tin chuyển nhượng, kết quả, bảng xếp hạng và các bài blog bóng đá. AI hỗ trợ viết từ nguồn công khai, nguồn tin ghi rõ trong từng bài.",
    disclosure: "Pete Nguyễn biên tập · AI hỗ trợ viết",
  },
];

/** Tên tác giả của một dòng `posts` (bảng không có cột byline): guide giữ tên trang,
 *  tin + blog là Pete Nguyễn, bài của Scout giữ "Trợ lý AI" (sổ thành tích riêng),
 *  còn lại (nhận định/xem trước/tổng kết của Curator) là Chú Tám Banh. */
export function postAuthorName(post: { type: string; author?: string }): string {
  if (post.type === "guide") return SITE_NAME;
  if (post.type === "news" || post.type === "blog") return PETE;
  if (post.author === "scout") return "Trợ lý AI";
  return CHU_TAM;
}

export function authorByName(name: string | null | undefined): AuthorProfile | null {
  return AUTHORS.find((a) => a.name === name) ?? null;
}

export function authorBySlug(slug: string): AuthorProfile | null {
  return AUTHORS.find((a) => a.slug === slug) ?? null;
}

/** schema.org author: Person có url hồ sơ khi là tác giả đã biết, còn lại giữ Organization. */
export function authorSchema(name: string) {
  const a = authorByName(name);
  return a
    ? { "@type": "Person", name: a.name, url: `${SITE_URL}${a.path}` }
    : { "@type": "Organization", name, url: SITE_URL };
}
