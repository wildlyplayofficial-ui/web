/**
 * Trang riêng từng trận /du-doan/{slug} + dòng trận dùng chung (thiết kế lại 10/11).
 * Hàm THUẦN: tiêu đề, meta, câu tóm tắt, trận liên quan — chữ sinh từ số đã có, không bịa.
 * Import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { T } from "./ty-le";

/** Thứ viết tay (Intl của Node và trình duyệt ra chữ khác nhau → lỗi hydrate). */
const THU = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** "Thứ Sáu" từ khoá ngày YYYY-MM-DD. */
export const thuVN = (khoa: string) => THU[new Date(`${khoa}T00:00:00Z`).getUTCDay()];
/** "13/11" từ khoá ngày YYYY-MM-DD. */
export const ngayThang = (khoa: string) => `${Number(khoa.slice(8, 10))}/${Number(khoa.slice(5, 7))}`;
/** "02h45"; trận chưa ghép được giờ ("--:--") → null. */
export const gioChu = (gio: string) => (/^\d{2}:\d{2}$/.test(gio) ? gio.replace(":", "h") : null);

/** H1 /du-doan theo ngày: "Dự đoán bóng đá Thứ Sáu, ngày 13 tháng 11 năm 2026". */
export function tieuDeH1(khoa: string): string {
  const [y, m, d] = khoa.split("-").map(Number);
  return `Dự đoán bóng đá ${thuVN(khoa)}, ngày ${d} tháng ${m} năm ${y}`;
}

const lechNgay = (khoa: string, n: number) =>
  new Date(Date.parse(`${khoa}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Tab ngày /du-doan: hôm nay → 5 ngày tới, CHỈ ngày có trận; không hiện hôm qua (Peter 11/11 —
 *  ngày đã qua xem ở /ket-qua). Không ngày nào có trận → chỉ tab hôm nay. */
export function ngayTabDuDoan(homNay: string, coDuLieu: ReadonlySet<string>): { ngays: string[]; macDinh: string } {
  const coTran = [0, 1, 2, 3, 4, 5].map((n) => lechNgay(homNay, n)).filter((n) => coDuLieu.has(n));
  const ngays = coTran.length > 0 ? coTran : [homNay];
  return { ngays, macDinh: ngays[0] };
}

type Tran = Pick<HangDuDoan, "nha" | "khach" | "ngay" | "gio">;

/** H1 trang trận: "Dự đoán Anh vs Croatia, 02h45 ngày 13/11". */
export function tieuDeTran(h: Tran): string {
  const gio = gioChu(h.gio);
  return `Dự đoán ${h.nha} vs ${h.khach}, ${gio ? `${gio} ` : ""}ngày ${ngayThang(h.ngay)}`;
}

/** "Anh thắng Croatia 3-0" / "Tây Ban Nha thắng CH Séc 2-0" (bàn đội thắng trước) / "Armenia hòa Síp 1-1". */
export function cauThang(h: Pick<HangDuDoan, "nha" | "khach" | "du">): string | null {
  if (!h.du) return null;
  const [a, b] = h.du;
  if (a === b) return `${h.nha} hòa ${h.khach} ${a}-${b}`;
  return a > b ? `${h.nha} thắng ${h.khach} ${a}-${b}` : `${h.khach} thắng ${h.nha} ${b}-${a}`;
}

/** Giải thích mốc Over/Under: "Over 2.5" → "dự đoán trận có từ 3 bàn trở lên". */
export function giaiThichTaiXiu(taiXiu: string): string | null {
  const moc = Number(taiXiu.match(/\d+(\.\d+)?/)?.[0]);
  if (!Number.isFinite(moc)) return null;
  return /^(tài|over)/i.test(taiXiu)
    ? `dự đoán trận có từ ${Math.floor(moc) + 1} bàn trở lên`
    : `dự đoán trận có nhiều nhất ${Math.ceil(moc) - 1} bàn`;
}

/** "cả hai đội đều ghi bàn" / "chỉ một đội ghi bàn" / "không đội nào ghi bàn" (theo tỷ số dự đoán). */
export function cauHaiDoiGhi(h: Pick<HangDuDoan, "haiDoiGhi" | "du">): string | null {
  if (h.haiDoiGhi === null) return null;
  if (h.haiDoiGhi) return "cả hai đội đều ghi bàn";
  return h.du && h.du[0] + h.du[1] === 0 ? "không đội nào ghi bàn" : "chỉ một đội ghi bàn";
}

const haiSo = (x: number) => x.toFixed(2);

/** Một đoạn tóm tắt sinh từ số của trận (cho người đọc lướt + máy tìm kiếm trích). */
export function cauTomTat(h: HangDuDoan, danhDau = false, chuyenGia?: string): string {
  const so = danhDau ? T : (x: number) => x.toFixed(2);
  const gio = gioChu(h.gio);
  const luc = `${gio ? `lúc ${gio} ` : ""}${thuVN(h.ngay).replace(/^Thứ/, "thứ").replace(/^Chủ Nhật/, "Chủ nhật")} ${ngayThang(h.ngay)}`;
  const noi = h.san ? (h.san.startsWith("Sân ") ? ` trên sân ${h.san.slice(4)}` : ` tại ${h.san}`) : gio ? " giờ Việt Nam" : "";
  const thang = cauThang(h);
  const cau = [
    thang
      ? `${chuyenGia ? `Chuyên gia ${chuyenGia}` : "banhbong.net"} dự đoán ${thang} ở ${h.giai}, trận đá ${luc}${noi}.`
      : `${h.nha} gặp ${h.khach} ở ${h.giai}, trận đá ${luc}${noi}.`,
  ];
  if (h.mot) cau.push(`Tỷ lệ 1·X·2 ${h.sapDa ? "đang là" : "trước trận là"} ${h.mot.map(so).join(" · ")}.`);
  const kem = [h.taiXiu, cauHaiDoiGhi(h)].filter(Boolean);
  if (kem.length > 0) cau.push(`Dự đoán kèm theo: ${kem.join(", ")}.`);
  if (h.that) {
    const cham = h.dung === null ? "" : h.dungTySo ? ", dự đoán trúng tỷ số" : h.dung ? ", dự đoán đúng kết quả" : ", dự đoán sai";
    cau.push(`Kết quả: ${h.nha} ${h.that[0]}-${h.that[1]} ${h.khach}${cham}.`);
  }
  return cau.join(" ");
}

/** Title (chưa kèm " | banhbong.net") + description trang trận. */
export function metaTran(h: HangDuDoan): { tieuDe: string; moTa: string } {
  const gio = gioChu(h.gio);
  const nam = h.ngay.slice(0, 4);
  const thang = cauThang(h);
  return {
    tieuDe: `Dự đoán ${h.nha} vs ${h.khach} ngày ${ngayThang(h.ngay)}`,
    moTa: [
      `Dự đoán tỷ số ${h.nha} vs ${h.khach} (${h.giai}), ${gio ? `${gio} ` : ""}ngày ${ngayThang(h.ngay)}/${nam}${gio ? " giờ Việt Nam" : ""}`,
      thang ? `: ${thang}.` : ".",
      h.mot ? ` Tỷ lệ 1·X·2: ${h.mot.map(haiSo).join(" · ")}.` : "",
    ].join(""),
  };
}

export function timTran(hang: readonly HangDuDoan[], slug: string): HangDuDoan | null {
  return hang.find((h) => h.slug === slug) ?? null;
}

const TOI_THIEU = 3;
const TOI_DA = 5;
const theoGio = (a: HangDuDoan, b: HangDuDoan) => a.kickoffUtc.localeCompare(b.kickoffUtc);

/**
 * Link nội bộ cuối trang trận: ≥3 trận cùng giải cùng ngày thì hiện nhóm đó (tối đa 5);
 * không đủ thì "Trận kế tiếp" — các trận đá sau trận này, thiếu nữa thì bù trận ngay trước.
 */
export function tranLienQuan(hang: readonly HangDuDoan[], h: HangDuDoan): { cungNgay: boolean; ds: HangDuDoan[] } {
  const khac = hang.filter((x) => x.slug !== h.slug);
  const cung = khac.filter((x) => x.giai === h.giai && x.ngay === h.ngay).sort(theoGio);
  if (cung.length >= TOI_THIEU) return { cungNgay: true, ds: cung.slice(0, TOI_DA) };
  const sau = khac.filter((x) => x.kickoffUtc >= h.kickoffUtc).sort(theoGio).slice(0, TOI_DA);
  const truoc = khac.filter((x) => x.kickoffUtc < h.kickoffUtc).sort(theoGio).reverse();
  return { cungNgay: false, ds: [...sau, ...truoc.slice(0, Math.max(0, TOI_THIEU - sau.length))] };
}
