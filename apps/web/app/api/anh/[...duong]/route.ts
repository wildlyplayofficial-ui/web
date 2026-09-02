/**
 * Cổng ảnh có ĐỆM — đứng trước kho ảnh Supabase.
 *
 * VÌ SAO CÓ TỆP NÀY (đo 2/9/2026, tổ chức Supabase vượt băng thông 8,016/5 GB):
 * Kho Supabase trả `cache-control: no-cache` cho ảnh công khai. Nghĩa là KHÔNG
 * tầng nào giữ đệm — mỗi lượt xem trang, mỗi người đọc, mỗi lần tải lại đều bò
 * về tận Supabase lấy ảnh. Đo trên trang thật: khoảng 1 MB mỗi lượt xem.
 *
 * Cổng này lấy ảnh một lần rồi trả kèm hạn đệm một năm, nên mạng phân phối của
 * Vercel giữ lại và phục vụ các lượt sau. Supabase chỉ còn bị gọi khi đệm hết
 * hạn hoặc gặp tệp mới.
 *
 * VÌ SAO NẰM DƯỚI /api/: proxy.ts chừa sẵn `api` trong danh sách bỏ qua. Đặt ở
 * /anh/ thì middleware bắt trước và thêm tiền tố ngôn ngữ vào, ảnh hỏng —
 * đúng cái bẫy đã dính với /og/ hôm 1/9. Không sửa matcher vì gõ nhầm một ký tự
 * trong regex đó là cả site trả lỗi.
 *
 * Vì sao đặt hạn một năm mà an toàn: tên tệp ảnh KHÔNG BAO GIỜ bị ghi đè. Sửa
 * ảnh thì tải lên dưới tên mới (-v2, -v3, -n1200...) rồi trỏ bài sang — luật đã
 * theo từ trước vì mạng phân phối từng trả bản cũ sau khi ghi đè.
 */
import { NextRequest } from "next/server";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Chỉ ba kho này. Không mở rộng bằng cách nhận tham số — cổng nhận kho tuỳ ý là
// biến trang mình thành proxy công cộng cho người khác xài nhờ băng thông.
const KHO = new Set(["blog-images", "player-photos", "competition-logos"]);

export async function GET(_req: NextRequest, ctx: { params: Promise<{ duong: string[] }> }) {
  const { duong } = await ctx.params;
  if (!SB || duong.length < 2 || !KHO.has(duong[0])) {
    return new Response("Not found", { status: 404 });
  }
  // Chặn đi ngược thư mục và mọi ký tự lạ trong tên tệp.
  if (duong.some((p) => p.includes("..") || p.includes("\\") || p.startsWith("."))) {
    return new Response("Not found", { status: 404 });
  }
  const upstream = `${SB}/storage/v1/object/public/${duong.map(encodeURIComponent).join("/")}`;
  const r = await fetch(upstream, { cache: "force-cache" });
  if (!r.ok) return new Response("Not found", { status: r.status === 404 ? 404 : 502 });

  return new Response(r.body, {
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/octet-stream",
      // s-maxage cho mạng phân phối, max-age cho trình duyệt, immutable vì tên tệp không đổi nội dung
      "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "x-nguon-anh": "supabase-qua-cong-dem",
    },
  });
}
