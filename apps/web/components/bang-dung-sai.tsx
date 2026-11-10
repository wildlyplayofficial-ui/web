import Link from "next/link";
import { tongKetTheoTacGia } from "@/lib/du-doan-cham";
import type { MucDuDoan } from "@/lib/du-doan";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * Bảng đúng/sai của hub /du-doan: trận đã đá, tỷ số dự đoán đặt cạnh tỷ số thật.
 * Tổng cộng dồn TÁCH THEO TÁC GIẢ (firewall Curator/Scout — không gộp một tổng).
 * Chỉ bài chốt tỷ số TRƯỚC giờ đá mới được chấm (lib/du-doan-cham `duDoanChot`).
 */
export function BangDungSai({ muc, lang }: { muc: MucDuDoan[]; lang: Lang }) {
  const daCham = muc.filter((m): m is MucDuDoan & { ketQua: NonNullable<MucDuDoan["ketQua"]> } => m.ketQua !== null);
  const choTySo = muc.filter((m) => m.chot && !m.sapDa && !m.ketQua).length;
  const tong = tongKetTheoTacGia(daCham.map((m) => ({ tacGia: m.bai.byline, ...m.ketQua })));
  const pt = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "–");

  return (
    <section aria-labelledby="bang-dung-sai" className="mt-12">
      <h2 id="bang-dung-sai" className="font-display text-2xl font-bold">Bảng đúng/sai</h2>
      <p className="mt-2 text-sm text-muted">
        Mỗi trận đã đá: tỷ số dự đoán (chốt trước giờ bóng lăn) đặt cạnh tỷ số thật. Đúng kết quả là đoán
        đúng đội thắng hoặc hoà; đúng tỷ số là trúng cả hai con số. Đoán trượt vẫn giữ nguyên trên bảng.
      </p>

      {tong.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {tong.map((t) => (
            <div key={t.tacGia} className="rounded-card border border-brand/30 bg-brand-dim/30 p-5">
              <p className="font-display font-bold">{t.tacGia}</p>
              <p className="mt-2 text-sm">
                <span className="font-display text-xl font-bold">{t.dungKetQua}/{t.tran}</span>{" "}
                <span className="text-muted">đúng kết quả ({pt(t.dungKetQua, t.tran)})</span>
              </p>
              <p className="text-sm">
                <span className="font-display text-xl font-bold">{t.dungTySo}/{t.tran}</span>{" "}
                <span className="text-muted">đúng tỷ số ({pt(t.dungTySo, t.tran)})</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {daCham.length === 0 ? (
        <p className="mt-5 rounded-card border border-line bg-card px-6 py-8 text-center text-sm text-muted">
          Chưa có trận nào đủ điều kiện chấm. Bảng bắt đầu đếm từ bài dự đoán đầu tiên có tỷ số chốt trước giờ đá.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Trận</th>
                <th className="px-4 py-2 font-semibold">Dự đoán</th>
                <th className="px-4 py-2 font-semibold">Thật</th>
                <th className="px-4 py-2 font-semibold">Kết quả</th>
                <th className="px-4 py-2 font-semibold">Tỷ số</th>
              </tr>
            </thead>
            <tbody>
              {daCham.map((m) => (
                <tr key={m.bai.slug} className="border-t border-line">
                  <td className="px-4 py-2">
                    <Link href={withLang(`/analysis/${m.bai.slug}`, lang)} className="font-semibold hover:text-brand">
                      {m.ketQua.that.home} – {m.ketQua.that.away}
                    </Link>
                    <span className="block text-xs text-muted">{m.bai.byline}</span>
                  </td>
                  <td className="px-4 py-2 font-display font-bold">{m.chot?.home_goals}-{m.chot?.away_goals}</td>
                  <td className="px-4 py-2 font-display font-bold">{m.ketQua.that.home_score}-{m.ketQua.that.away_score}</td>
                  <td className={`px-4 py-2 font-semibold ${m.ketQua.dungKetQua ? "text-brand" : "text-loss"}`}>
                    {m.ketQua.dungKetQua ? "Đúng" : "Sai"}
                  </td>
                  <td className={`px-4 py-2 font-semibold ${m.ketQua.dungTySo ? "text-brand" : "text-muted"}`}>
                    {m.ketQua.dungTySo ? "Trúng" : "Trượt"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {choTySo > 0 && (
        <p className="mt-3 text-xs text-muted">{choTySo} trận đã đá đang chờ cập nhật tỷ số chính thức.</p>
      )}
    </section>
  );
}
