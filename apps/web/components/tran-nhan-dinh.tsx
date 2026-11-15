import type { MucNhanDinh } from "@/lib/tran-nhan-dinh";
import { ChuTy } from "@/components/ty-le";

/**
 * Bài nhận định sinh từ số của trang trận tệp tuần (15/11): các đoạn phân tích
 * (lib/tran-nhan-dinh.ts). Không có đoạn nào → không vẽ gì. Không có bảng tóm tắt:
 * khung đầu trang đã có đủ tỷ số, 1·X·2, Over/Under (Peter 15/11 "ok bỏ bảng").
 */
export function TranNhanDinh({ cap, muc }: { cap: string; muc: readonly MucNhanDinh[] }) {
  if (muc.length === 0) return null;
  return (
    <article id="nhan-dinh" className="prose-md mt-8 scroll-mt-20 border-t border-line pt-6">
      <h2>Nhận định {cap}</h2>
      {muc.map((m) => (
        <section key={m.tieuDe}>
          <h3>{m.tieuDe}</h3>
          <p><ChuTy text={m.doan} /></p>
        </section>
      ))}
    </article>
  );
}
