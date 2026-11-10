/**
 * Dự đoán theo tuần nạp từ tệp (data/du-doan-tuan.json): mỗi dòng một trận có tỷ số dự đoán,
 * phong độ 5 trận, tỷ lệ 1·X·2 và giờ đá UTC (ghép từ lịch livescore lúc nạp).
 * Trận không có bài nhận định → nút "Xem nhận định" ẩn, JSON-LD trỏ về /du-doan.
 */
import duLieu from "@/data/du-doan-tuan.json";
import { tenSo } from "./du-doan-cham";
import { cungTran, ngayVN, nhanTran, type HangDuDoan } from "./du-doan-hang";
import { chieuDuDoan, phongDoCuTruoc, type KQ, type TranDaDa } from "./phong-do";
import { teamBadge } from "./team-badges";
import { tenDoiViet, tenGiaiViet } from "./ten-viet";
import { phongDoTuTran, type SoLieuTran } from "./tran-so-lieu";

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
  /** "Tài 2.5" / "Xỉu 2.5". */
  tx?: string;
  /** Cả hai đội ghi bàn: "Có" / "Không". */
  btts?: string;
}

const DONG = duLieu as DongTuan[];

/** Tên trong tệp khác tên bảng cờ → đổi trước khi tra logo. */
const TEN_LOGO: Record<string, string> = {
  "Czech Republic": "Czechia",
  "Rep of Ireland": "Ireland",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
};
const logo = (ten: string) => teamBadge(TEN_LOGO[ten] ?? ten);

const KQ_ANH: Record<string, KQ> = { W: "T", D: "H", L: "B" };
const docForm = (s: string): KQ[] | null => {
  const kq = [...s].map((c) => KQ_ANH[c]).filter(Boolean);
  return kq.length > 0 ? kq : null;
};

const slugTuan = (d: DongTuan) => `tuan-${d.ngay}-${tenSo(d.nha)}-${tenSo(d.khach)}`;

/** Đối đầu, bảng xếp hạng, các trận gần nhất của một trận tệp tuần; tệp không ghi gì → null. */
export function soLieuTuan(slug: string): (SoLieuTran & { nha: string; khach: string }) | null {
  const d = DONG.find((x) => slugTuan(x) === slug);
  if (!d || !(d.h2h?.length || d.bxn || d.bxk || d.gn?.length || d.gk?.length)) return null;
  return { nha: d.nha, khach: d.khach, h2h: d.h2h, bxn: d.bxn, bxk: d.bxk, gn: d.gn, gk: d.gk };
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
    if (daCo.some((h) => cungTran(tran, { home: h.nha, away: h.khach, kickoff: h.kickoffUtc }))) return [];
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
      logoNha: logo(d.nha),
      logoKhach: logo(d.khach),
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
      // Ưu tiên tính từ các trận gần nhất, rồi chuỗi trong tệp, cuối cùng bù từ CSDL — cả ba cùng chiều cũ → mới.
      formNha: phongDoTuTran(d.gn, d.nha) ?? docForm(d.fn) ?? phongDoCuTruoc(daDa, d.nha, kickoffUtc),
      formKhach: phongDoTuTran(d.gk, d.khach) ?? docForm(d.fk) ?? phongDoCuTruoc(daDa, d.khach, kickoffUtc),
      doiDau: null,
      taiXiu: d.tx ?? null,
      haiDoiGhi: d.btts ? d.btts === "Có" : null,
      nhan: [],
    };
    // Nhãn tính trên tên gốc; hiển thị + JSON-LD dùng tên Việt (người Việt tìm bằng tên Việt).
    return [{ ...h, nhan: nhanTran(h), giai: tenGiaiViet(d.giai), nha: tenDoiViet(d.nha), khach: tenDoiViet(d.khach) }];
  });
}
