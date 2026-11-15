import type { DongTomTat, MucNhanDinh } from "@/lib/tran-nhan-dinh";
import { ChuTy, Ty } from "@/components/ty-le";

/**
 * Bài nhận định sinh từ số của trang trận tệp tuần (15/11): bảng tóm tắt mọi dự đoán rồi các
 * đoạn phân tích (lib/tran-nhan-dinh.ts). Không có đoạn nào → không vẽ gì.
 */
const XUONG_DONG = { whiteSpace: "normal", overflowWrap: "anywhere" } as const;

export function TranNhanDinh({ cap, muc, tomTat }: { cap: string; muc: readonly MucNhanDinh[]; tomTat: readonly DongTomTat[] }) {
  if (muc.length === 0) return null;
  return (
    <article id="nhan-dinh" className="prose-md mt-8 scroll-mt-20 border-t border-line pt-6">
      <h2>Nhận định {cap}</h2>
      {tomTat.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Dự đoán</th>
                <th scope="col">Lựa chọn</th>
                <th scope="col">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {tomTat.map((d) => (
                <tr key={d.nhan}>
                  {/* .prose-md đặt nowrap cho th/td → ô dài bị cắt trên điện thoại; bảng này cho xuống dòng. */}
                  <th scope="row" style={XUONG_DONG}>{d.nhan}</th>
                  <td style={XUONG_DONG}>{d.chon}</td>
                  <td>{d.tyLe ? <Ty v={d.tyLe} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {muc.map((m) => (
        <section key={m.tieuDe}>
          <h3>{m.tieuDe}</h3>
          <p><ChuTy text={m.doan} /></p>
        </section>
      ))}
    </article>
  );
}
