/**
 * Bù tỷ số thật cho dòng từ BÀI nhận định từ livescore (lib/ket-qua-ls.ts).
 * Vì sao: `getTySoThat` (lib/du-doan.ts) đọc bảng fixtures + match_live_state, mà fixtures ngừng có
 * tỷ số từ 8/9/2026 → trang trận /du-doan/{slug} không hiện "Kết quả". Không tự chế luật khớp/chấm:
 * dùng lại `dungMuc` (khớp `timTySo`: tên GỐC tiếng Anh trong tệp dự đoán, đúng chiều sân nhà,
 * giờ lệch ≤ 2 ngày; chấm `cham`). Không khớp thì giữ null.
 */
import { dungMuc } from "./du-doan-cham";
import type { MucDuDoan } from "./du-doan";
import type { TranLS } from "./ket-qua";

/** Trận đã qua giờ đá, chưa có tỷ số, mà dự đoán đã chốt (chưa chốt thì không chấm được). */
export const canBuTySo = (m: MucDuDoan, bayGio: number): boolean =>
  !m.ketQua && !m.sapDa && m.chot !== null && m.kickoffUtc !== null && Date.parse(m.kickoffUtc) < bayGio;

/** Điền `ketQua` từ livescore cho mục còn thiếu; mục khác trả nguyên. */
export function boSungTySoLS(muc: readonly MucDuDoan[], ls: readonly TranLS[], bayGio: number): MucDuDoan[] {
  const tySo = ls.map((x) => ({ home: x.home, away: x.away, kickoff_utc: x.kickoff, home_score: x.kq[0], away_score: x.kq[1] }));
  return muc.map((m) => (canBuTySo(m, bayGio) ? dungMuc(m.bai, tySo, bayGio) : m));
}
