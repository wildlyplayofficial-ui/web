/**
 * Dự đoán theo tuần nạp từ tệp (data/du-doan-tuan.json): mỗi dòng một trận có tỷ số dự đoán,
 * phong độ 5 trận, tỷ lệ 1·X·2 và giờ đá UTC (ghép từ lịch livescore lúc nạp).
 * Trận không có bài nhận định → nút "Xem nhận định" ẩn, JSON-LD trỏ về /du-doan.
 */
import duLieu from "../data/du-doan-tuan.json";
import { tenSo } from "./du-doan-cham";
import { cungTran, ngayVN, nhanTran, type HangDuDoan } from "./du-doan-hang";
import { chieuDuDoan, phongDoCuTruoc, type KQ, type TranDaDa } from "./phong-do";
import { teamBadge } from "./team-badges";
import { tenDoiViet, tenGiaiViet } from "./ten-viet";
import { bxConMoi, conMoi, phongDoTuTran, type SoLieuTran } from "./tran-so-lieu";
import type { ThiTruongPhu } from "./tran-keo-phu";
import { docDnb, docKqBtts, docKqOu } from "./tran-keo3";
import { docDiem, docHtft, type DiemDoi, type HtFt } from "./tran-htft";

export interface DongTuan extends SoLieuTran {
  ngay: string;
  giai: string;
  nha: string;
  khach: string;
  /** "Home 2-1" / "Draw 1-1" / "Away 0-2". */
  du: string;
  /** Phong độ kiểu "WDLWW": CŨ NHẤT TRƯỚC, chữ cuối là trận mới nhất; rỗng = tệp không có. */
  fn: string;
  fk: string;
  /** Tỷ lệ 1·X·2; 0 = không có. */
  o: number[];
  gioUtc: string | null;
  /** Kết quả thật [nhà, khách] khi tệp hôm sau báo về. */
  kq?: number[];
  /** "Over 2.5" / "Under 2.5". */
  tx?: string;
  /** Cả hai đội ghi bàn: "Có" / "Không". */
  btts?: string;
  /** Chi tiết hai đội ghi bàn / Over/Under 2,5 / tỷ số chính xác: tip + tỷ lệ + chuỗi 5 trận. */
  pBtts?: ThiTruongPhu;
  pOu?: ThiTruongPhu;
  pCs?: ThiTruongPhu;
  /** Tỷ lệ Hiệp 1 / Cả trận, khoá "hiệp 1 + cả trận" (H nhà · D hòa · A khách, vd DH): đủ 9 ô hoặc không ghi. */
  htft?: HtFt;
  /** Draw No Bet [nhà, khách]. */
  pDnb?: [number, number];
  /** ISO: lúc tỷ lệ o / pBtts.keo / pOu.keo được làm mới; tệp Jane đến sau mà cũ hơn thì không đè. */
  oCapNhat?: string;
  /** Kết quả & BTTS: n nhà thắng, k khách thắng, h hòa; Y/N hai đội cùng ghi bàn có/không. */
  pKqBtts?: { nY: number; nN: number; kY: number; kN: number; hY: number; hN: number };
  /** Kết quả & Over/Under 2.5: T = Over, X = Under. */
  pKqOu?: { nT: number; nX: number; kT: number; kX: number; hT: number; hX: number };
  /** Điểm phong độ [tấn công, phòng ngự], thang 1–10, của đội nhà (n) và đội khách (k). */
  diem?: DiemDoi;
  /** Slug bài nhận định của cùng trận (trận ĐTQG nguồn tuần không có): số liệu tệp gắn vào trang bài. */
  bai?: string;
}

const DONG = duLieu as DongTuan[];

/** Tên trong tệp khác tên bảng cờ → đổi trước khi tra logo. */
const TEN_LOGO: Record<string, string> = {
  "Czech Republic": "Czechia",
  "Rep of Ireland": "Ireland",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Cape Verde Islands": "Cape Verde",
  // PredictZ ghi CHDC Congo là "DR Congo"; "Congo" trơn là Cộng hoà Congo.
  Congo: "Republic of the Congo",
};
export const logo = (ten: string) => teamBadge(TEN_LOGO[ten] ?? ten);

/**
 * Trùng tên khác CLB: bảng logo khớp theo tên đã rút "FC", nên "Liverpool FC" của Uruguay (Montevideo) dính
 * huy hiệu Liverpool nước Anh. Giải nằm trong danh sách này thì KHÔNG tra theo tên (để trống, hiện chữ viết tắt).
 */
const TRUNG_TEN: ReadonlyArray<{ ten: string; giai: RegExp }> = [{ ten: "Liverpool FC", giai: /^Uruguay\b/ }];
/** Tệp dữ liệu cũ ghi "Tài/Xỉu 2.5": hiển thị luôn là Over/Under. */
const chuanOU = (t?: string | null) => (t ? t.replace(/^Tài/i, "Over").replace(/^Xỉu/i, "Under") : null);

export const logoTheoGiai = (ten: string, giai: string) => (TRUNG_TEN.some((x) => x.ten === ten && x.giai.test(giai)) ? null : logo(ten));

const KQ_ANH: Record<string, KQ> = { W: "T", D: "H", L: "B" };
const docForm = (s: string): KQ[] | null => {
  const kq = [...s].map((c) => KQ_ANH[c]).filter(Boolean);
  return kq.length > 0 ? kq : null;
};

export const slugTuan = (d: DongTuan) => `tuan-${d.ngay}-${tenSo(d.nha)}-${tenSo(d.khach)}`;

/** Dòng tệp theo slug trang trận: slug tuần, hoặc slug bài nhận định ghi ở trường `bai`. */
const timDong = (slug: string) => DONG.find((x) => slugTuan(x) === slug || x.bai === slug);

/** Đối đầu, bảng xếp hạng, các trận gần nhất của một trận tệp tuần; tệp không ghi gì → null. */
export function soLieuTuan(slug: string): (SoLieuTran & { nha: string; khach: string }) | null {
  const d = timDong(slug);
  if (!d) return null;
  // Dòng gõ tay (ĐTQG): đội tuyển nghỉ vài tháng giữa 2 đợt là thường, không lọc "cũ quá 30 ngày".
  const gn = d.bai ? d.gn : conMoi(d.gn, d.ngay);
  const gk = d.bai ? d.gk : conMoi(d.gk, d.ngay);
  const bxn = bxConMoi(d.bxn, d.gn, d.ngay);
  const bxk = bxConMoi(d.bxk, d.gk, d.ngay);
  if (!(d.h2h?.length || bxn || bxk || gn || gk)) return null;
  return { nha: d.nha, khach: d.khach, h2h: d.h2h, bxn, bxk, gn, gk };
}

const gioVN = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );

/** Đội thiếu phong độ trong tệp — để kéo bù từ bảng fixtures. */
export function doiThieuPhongDo(): string[] {
  return DONG.flatMap((d) => [...(d.fn ? [] : [d.nha]), ...(d.fk ? [] : [d.khach])]);
}

/**
 * Dòng từ tệp, bỏ trận đã có bài dự đoán riêng (bài có chấm điểm + nhận định thì ưu tiên).
 * `daDa` bù phong độ cho đội tệp không ghi (đội tuyển).
 */
export function hangTuan(daCo: readonly HangDuDoan[], daDa: readonly TranDaDa[], bayGio: number): HangDuDoan[] {
  return DONG.flatMap((d): HangDuDoan[] => {
    const kickoffUtc = d.gioUtc ?? `${d.ngay}T12:00:00Z`;
    const tran = { home: d.nha, away: d.khach, kickoff: kickoffUtc };
    if (d.bai || daCo.some((h) => cungTran(tran, { home: h.nha, away: h.khach, kickoff: h.kickoffUtc }))) return [];
    const so = d.du.match(/(\d+)\s*-\s*(\d+)/);
    const du: [number, number] | null = so ? [Number(so[1]), Number(so[2])] : null;
    const that: [number, number] | null = d.kq?.length === 2 ? [d.kq[0], d.kq[1]] : null;
    const mot: [number, number, number] | null = d.o.length === 3 && d.o.every((x) => x > 0) ? [d.o[0], d.o[1], d.o[2]] : null;
    const h: HangDuDoan = {
      slug: slugTuan(d),
      coBai: false,
      giai: d.giai,
      kickoffUtc,
      // Không ghép được giờ thì giữ ngày trong tệp, giờ để trống.
      ngay: d.gioUtc ? ngayVN(d.gioUtc) : d.ngay,
      gio: d.gioUtc ? gioVN(d.gioUtc) : "--:--",
      nha: d.nha,
      khach: d.khach,
      logoNha: logoTheoGiai(d.nha, d.giai),
      logoKhach: logoTheoGiai(d.khach, d.giai),
      anhNha: null,
      anhKhach: null,
      creditAnh: null,
      du,
      that,
      dung: that && du ? chieuDuDoan(that) === chieuDuDoan(du) : null,
      dungTySo: that && du ? that[0] === du[0] && that[1] === du[1] : null,
      san: null,
      sapDa: Date.parse(kickoffUtc) > bayGio,
      pick: false,
      mot,
      // Ưu tiên chuỗi trong tệp (khớp trang danh sách nguồn), rồi các trận gần nhất còn mới, cuối cùng
      // bù từ CSDL — cả ba cùng chiều cũ → mới. Tệp 10/11: chuỗi và danh sách lệch nhau 11/136 đội.
      formNha: docForm(d.fn) ?? phongDoTuTran(conMoi(d.gn, d.ngay), d.nha) ?? phongDoCuTruoc(daDa, d.nha, kickoffUtc),
      formKhach: docForm(d.fk) ?? phongDoTuTran(conMoi(d.gk, d.ngay), d.khach) ?? phongDoCuTruoc(daDa, d.khach, kickoffUtc),
      doiDau: null,
      taiXiu: chuanOU(d.tx),
      haiDoiGhi: d.btts ? d.btts === "Có" : null,
      nhan: [],
    };
    // Nhãn tính trên tên gốc; hiển thị + JSON-LD dùng tên Việt (người Việt tìm bằng tên Việt).
    return [{ ...h, nhan: nhanTran(h), giai: tenGiaiViet(d.giai), nha: tenDoiViet(d.nha), khach: tenDoiViet(d.khach) }];
  });
}

/**
 * Dòng có bài nhận định mà tệp tuần cũng ghi trận đó (trường `bai`): giữ tỷ số dự đoán của bài,
 * bù tỷ lệ 1·X·2, Over/Under, hai đội ghi bàn, phong độ từ tệp — trang bài hiện đủ khối như trận tuần.
 */
export function gopTuan(hang: readonly HangDuDoan[]): HangDuDoan[] {
  return hang.map((h) => {
    const d = DONG.find((x) => x.bai === h.slug);
    if (!d) return h;
    const mot: HangDuDoan["mot"] = d.o.length === 3 && d.o.every((x) => x > 0) ? [d.o[0], d.o[1], d.o[2]] : h.mot;
    const g: HangDuDoan = {
      ...h,
      mot,
      formNha: docForm(d.fn) ?? phongDoTuTran(conMoi(d.gn, d.ngay), d.nha) ?? h.formNha,
      formKhach: docForm(d.fk) ?? phongDoTuTran(conMoi(d.gk, d.ngay), d.khach) ?? h.formKhach,
      taiXiu: chuanOU(d.tx) ?? h.taiXiu,
      haiDoiGhi: d.btts ? d.btts === "Có" : h.haiDoiGhi,
    };
    return { ...g, nhan: nhanTran(g) };
  });
}

export type KeoPhu = Pick<DongTuan, "nha" | "khach" | "pBtts" | "pOu" | "pCs">;

/** Khối hai đội ghi bàn · Over/Under · tỷ số chính xác của một trận tệp tuần; tệp không ghi gì → null. */
export function keoPhuTuan(slug: string): KeoPhu | null {
  const d = timDong(slug);
  if (!d || !(d.pBtts || d.pOu || d.pCs)) return null;
  return { nha: d.nha, khach: d.khach, pBtts: d.pBtts, pOu: d.pOu, pCs: d.pCs };
}

/** Dữ liệu trang "Cả 2 đội ghi bàn + thắng": chuỗi 5 trận (pBtts) + bảng kết quả + cả hai đội ghi bàn đã kiểm (pKqBtts). */
export function keoThangTuan(slug: string): { pBtts?: KeoPhu["pBtts"]; pKqBtts: NonNullable<DongTuan["pKqBtts"]> } | null {
  const d = timDong(slug);
  const g = d && keo3Tuan(slug)?.pKqBtts;
  return g ? { pBtts: d.pBtts, pKqBtts: g } : null;
}

export interface PhongDoChung { c?: number[]; gn: DongTuan["gn"]; gk: DongTuan["gk"]; ngay: string }

/** Điểm phong độ chung + 10 trận gần nhất của một dòng tệp tuần (cho bảng đội phong độ tốt nhất); không có dòng → null. */
export function phongDoChungTuan(slug: string): PhongDoChung | null {
  const d = timDong(slug);
  return d ? { c: d.diem?.c, gn: d.gn, gk: d.gk, ngay: d.ngay } : null;
}

export type GanNhat = Pick<DongTuan, "nha" | "khach" | "gn" | "gk">;

/** 10 trận gần nhất của hai đội một trận tệp tuần, KHÔNG lọc theo độ mới (đội nghỉ lâu vẫn hiện); cả hai rỗng → null. */
export function ganNhatTuan(slug: string): GanNhat | null {
  const d = timDong(slug);
  if (!d || !(d.gn?.length || d.gk?.length)) return null;
  return { nha: d.nha, khach: d.khach, gn: d.gn, gk: d.gk };
}

export type HtftDiem = Pick<DongTuan, "nha" | "khach" | "htft" | "diem">;

/** Hiệp 1 / Cả trận + điểm tấn công / phòng ngự của một trận tệp tuần; không có số hợp lệ nào → null. */
export function htftDiemTuan(slug: string): HtftDiem | null {
  const d = timDong(slug);
  if (!d) return null;
  const htft = docHtft(d.htft) ? d.htft : undefined;
  const diem = docDiem(d.diem?.n) && docDiem(d.diem?.k) ? d.diem : undefined;
  return htft || diem ? { nha: d.nha, khach: d.khach, htft, diem } : null;
}

export type Keo3Tuan = Pick<DongTuan, "nha" | "khach" | "pDnb" | "pKqBtts" | "pKqOu">;

/** Ba bảng tỷ lệ phụ của một trận tệp tuần; không bảng nào hợp lệ → null. */
export function keo3Tuan(slug: string): Keo3Tuan | null {
  const d = timDong(slug);
  if (!d) return null;
  const pDnb = docDnb(d.pDnb) ? d.pDnb : undefined;
  const pKqBtts = docKqBtts(d.pKqBtts) ? d.pKqBtts : undefined;
  const pKqOu = docKqOu(d.pKqOu) ? d.pKqOu : undefined;
  return pDnb || pKqBtts || pKqOu ? { nha: d.nha, khach: d.khach, pDnb, pKqBtts, pKqOu } : null;
}

/** Các dòng tệp tuần hiện tại. */
export const dongTuan = (): readonly DongTuan[] => DONG;
