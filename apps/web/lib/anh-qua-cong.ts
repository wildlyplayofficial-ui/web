/**
 * Đưa ảnh Supabase Storage đi qua cổng đệm /api/anh/ (xem app/api/anh/[...duong]/route.ts).
 *
 * VÌ SAO: kho Supabase trả `cache-control: no-cache`, nên ảnh ghi trong DB dạng URL đầy đủ
 * (hero_image, thumb_image, hero_card_url, ảnh trong thân bài) bị trình duyệt tải thẳng về
 * Supabase mỗi lượt xem → hết băng thông, kho bị khoá 402 (exceed_egress_quota).
 *
 * `https://<ref>.supabase.co/storage/v1/object/public/<kho>/<đường>` → `/api/anh/<kho>/<đường>`.
 * Chỉ đổi URL của ĐÚNG project này (host lấy từ NEXT_PUBLIC_SUPABASE_URL) và đúng 3 kho cổng
 * nhận — kho khác giữ nguyên (cổng sẽ 404 nếu ta trỏ vào). Mọi chỗ cần URL tuyệt đối (og:image,
 * JSON-LD) đã tự thêm `${BASE}` khi đường bắt đầu bằng "/", nên không cần hàm riêng.
 *
 * Dùng được cho cả một URL lẫn cả thân bài markdown (thay mọi lần xuất hiện).
 * KHO_CONG phải khớp danh sách KHO trong route.ts.
 */
const KHO_CONG = new Set(["blog-images", "player-photos", "competition-logos"]);

function hostSupabase(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
  } catch {
    return null;
  }
}

export function anhQuaCong<T extends string | null | undefined>(s: T): T {
  const host = hostSupabase();
  if (!host || typeof s !== "string" || !s.includes("/storage/v1/object/public/")) return s;
  const re = new RegExp(
    `https://${host.replace(/\./g, "\\.")}/storage/v1/object/public/([^/\\s"'()<>\\]]+)/([^\\s"'()<>\\]]+)`,
    "g",
  );
  return s.replace(re, (goc, kho: string, duong: string) => (KHO_CONG.has(kho) ? `/api/anh/${kho}/${duong}` : goc)) as T;
}

const TRUONG_ANH = [
  "hero_image", "thumb_image", "hero_card_url",
  "body", "body_md", "body_en", "body_vi", "body_th", "body_es",
] as const;

/** Chuẩn hoá mọi trường ảnh/thân bài của một bản ghi bài (analysis_articles, news_items, posts). */
export function chuanHoaAnh<T extends object>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  for (const k of TRUONG_ANH) {
    if (typeof out[k] === "string") out[k] = anhQuaCong(out[k] as string);
  }
  return out as T;
}
