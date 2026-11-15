/**
 * Đoạn "phong độ" của MỘT đội trong bài nhận định sinh từ số (lib/tran-nhan-dinh.ts).
 * Câu chọn theo TÌNH HUỐNG của số liệu (đang cao / khá / thất thường / sa sút; công mạnh, thủ yếu,
 * sân nhà là điểm tựa…), không phải một khuôn thay tên. Hàm THUẦN, import TƯƠNG ĐỐI.
 */
import { chon, type SoDoi } from "./tran-nhan-dinh-so";
import { ngayNgan, type ThanhTich } from "./tran-so-lieu";

const tb = (x: number, n: number) => (x / n).toFixed(1);

/** "thắng 6, hòa 3, thua 1" — số 0 đổi thành chữ ("chưa thua trận nào") cho tự nhiên. */
export function cauTHB(s: ThanhTich): string {
  const co = [s.t > 0 ? `thắng ${s.t}` : null, s.h > 0 ? `hòa ${s.h}` : null, s.b > 0 ? `thua ${s.b}` : null].filter(Boolean);
  const khong = s.t === 0 ? "chưa thắng trận nào" : s.b === 0 ? "chưa thua trận nào" : null;
  return [...co, khong].filter(Boolean).join(", ");
}

type Muc = "cao" | "kha" | "thatThuong" | "kem";
const mucPhongDo = (s: SoDoi): Muc => {
  const d = s.diem / s.tran;
  return d >= 2 ? "cao" : d >= 1.4 ? "kha" : d >= 0.9 ? "thatThuong" : "kem";
};

function cauMo(ten: string, s: SoDoi, khoa: string): string {
  const thb = cauTHB(s);
  const n = s.tran;
  const mau: Record<Muc, string[]> = {
    cao: [
      `${ten} đang có phong độ cao: ${n} trận gần nhất ${thb}.`,
      `${ten} bước vào trận này với sự tự tin, ${n} trận vừa qua họ ${thb}.`,
      `Kết quả gần đây của ${ten} rất tốt: ${thb} sau ${n} trận, giành ${s.diem}/${n * 3} điểm.`,
    ],
    kha: [
      `Phong độ của ${ten} ở mức khá: ${n} trận gần nhất ${thb}.`,
      `${ten} giữ được sự ổn định tương đối, ${n} trận gần đây ${thb}.`,
      `${ten} giành ${s.diem}/${n * 3} điểm trong ${n} trận gần nhất (${thb}), không nổi bật nhưng cũng không tệ.`,
    ],
    thatThuong: [
      `${ten} thi đấu thất thường: ${n} trận gần nhất ${thb}.`,
      `Khó đoán trước ${ten} lúc này, ${n} trận gần nhất họ ${thb}.`,
      `${n} trận gần đây ${ten} ${thb}, tức chỉ giành ${s.diem}/${n * 3} điểm.`,
    ],
    kem: [
      `${ten} đang sa sút: ${n} trận gần nhất ${thb}.`,
      `Kết quả gần đây của ${ten} khá tệ, ${n} trận họ ${thb}.`,
      `${ten} chỉ giành ${s.diem}/${n * 3} điểm trong ${n} trận gần nhất (${thb}).`,
    ],
  };
  return chon(mau[mucPhongDo(s)], `${khoa}-mo`);
}

function cauBan(ten: string, s: SoDoi): string {
  const n = s.tran;
  const ghi = s.ghi / n;
  const thung = s.thung / n;
  if (ghi >= 1.8 && thung <= 1) return `Họ ghi ${s.ghi} bàn và chỉ thủng lưới ${s.thung} bàn trong quãng này, trung bình ${tb(s.ghi, n)} bàn ghi được mỗi trận.`;
  if (ghi >= 1.8 && thung >= 1.5) return `Hàng công ghi tới ${s.ghi} bàn (${tb(s.ghi, n)} bàn mỗi trận) nhưng hàng thủ cũng để lọt ${s.thung} bàn, nên trận nào có ${ten} cũng dễ nhiều bàn thắng.`;
  if (ghi <= 0.9 && thung <= 1) return `Đội ghi bàn khá ít, ${s.ghi} bàn sau ${n} trận, bù lại hàng thủ chỉ thủng lưới ${s.thung} bàn.`;
  if (ghi <= 0.9) return `Vấn đề nằm ở khâu ghi bàn: ${s.ghi} bàn sau ${n} trận${s.tit > 0 ? `, trong đó ${s.tit} trận không ghi được bàn nào` : ""}, còn hàng thủ để lọt ${s.thung} bàn.`;
  if (thung >= 1.8) return `Hàng thủ là điểm yếu khi để thủng lưới ${s.thung} bàn sau ${n} trận (${tb(s.thung, n)} bàn mỗi trận), hàng công ghi được ${s.ghi} bàn.`;
  return `Tổng cộng họ ghi ${s.ghi} bàn và thủng lưới ${s.thung} bàn, trung bình ${tb(s.ghi, n)} bàn ghi được và ${tb(s.thung, n)} bàn thua mỗi trận.`;
}

function cauSan(s: SoDoi, vai: "nha" | "khach"): string | null {
  const x = s.san;
  if (x.tran < 3) return null;
  const thb = cauTHB(x);
  if (vai === "nha") {
    if (x.t / x.tran >= 0.6) return `Sân nhà là điểm tựa: ${x.tran} trận đá tại đây trong quãng này họ ${thb}.`;
    if (x.t === 0) return `Đáng lo là ${x.tran} trận sân nhà gần đây họ ${thb}.`;
    return `Riêng trên sân nhà, thành tích là ${thb} sau ${x.tran} trận.`;
  }
  if (x.t / x.tran >= 0.5) return `Đá xa nhà không phải trở ngại: ${x.tran} chuyến làm khách gần đây họ ${thb}.`;
  if (x.t === 0) return `Khi rời sân nhà họ kém hẳn, ${x.tran} chuyến làm khách gần đây ${thb}.`;
  return `Thành tích sân khách là ${thb} sau ${x.tran} trận.`;
}

function cauChuoi(s: SoDoi): string | null {
  const c = s.chuoi;
  if (!c || c.so < 3) return null;
  return c.loai === "chuaThua" ? `Chuỗi bất bại hiện tại kéo dài ${c.so} trận.` : `Họ đã ${c.so} trận liên tiếp chưa biết thắng.`;
}

function cauMoiNhat(ten: string, s: SoDoi, tenDoi: (goc: string) => string, khoa: string): string {
  const m = s.moi;
  const dong = m.kq === "T" ? "thắng" : m.kq === "H" ? "hòa" : "thua";
  const noi = m.sanNha ? "trên sân nhà" : "trên sân khách";
  const kq = `${dong} ${tenDoi(m.doiThu)} ${m.ghi}-${m.thung} ${noi}`;
  return chon(
    [
      `Trận gần nhất (${ngayNgan(m.ngay)}), ${ten} ${kq}.`,
      `Lần ra sân gần nhất hôm ${ngayNgan(m.ngay)}, họ ${kq}.`,
      `Hôm ${ngayNgan(m.ngay)}, ${ten} ${kq} ở trận gần nhất.`,
    ],
    `${khoa}-moi`,
  );
}

/** Đoạn phong độ một đội. `tenDoi` đổi tên gốc của đối thủ sang tên hiển thị. */
export function doanDoi(ten: string, s: SoDoi, vai: "nha" | "khach", tenDoi: (goc: string) => string, khoa: string): string {
  const sach = s.sach / s.tran >= 0.4 ? `Có ${s.sach}/${s.tran} trận họ giữ sạch lưới.` : null;
  return [cauMo(ten, s, khoa), cauBan(ten, s), cauSan(s, vai), cauChuoi(s), sach, cauMoiNhat(ten, s, tenDoi, khoa)].filter(Boolean).join(" ");
}
