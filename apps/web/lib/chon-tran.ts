/**
 * Danh sách "Chọn trận khác" (kiểu ô nhảy trận của PredictZ, Peter 10/11): mọi trận
 * có dự đoán, gom theo NGÀY (giờ VN) rồi theo GIẢI. Ngày sắp tới lên trước (gần
 * nhất trước), ngày đã qua xếp sau (mới nhất trước). Hàm THUẦN, import tương đối.
 */
import { laBaiDuDoan } from "./du-doan-cham";
import { duDoanCua, tenKhach, tenNha } from "./du-doan-nguon";
import type { AnalysisArticle } from "./types";

export interface TranChon {
  slug: string;
  nhan: string;
}
export interface NhomNgay {
  ngay: string;
  nhan: string;
  giai: { ten: string; tran: TranChon[] }[];
}

const dinhDang = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...o }).format(new Date(iso));
const ngayKhoa = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

export function cacTranChon(bai: readonly AnalysisArticle[], now: number): NhomNgay[] {
  const homNay = ngayKhoa(new Date(now).toISOString());
  const tran = bai.flatMap((b) => {
    const d = laBaiDuDoan(b) ? duDoanCua(b) : null;
    if (!d || !Number.isFinite(Date.parse(d.kickoff_utc))) return [];
    const ko = d.kickoff_utc;
    const gio = dinhDang(ko, { hour: "2-digit", minute: "2-digit", hour12: false });
    // vi-VN chỉ ngày+tháng ra "13-11" → ghép tay thành "13/11".
    const dm = ngayKhoa(ko).slice(5).split("-").reverse().join("/");
    return [{ ko, ngay: ngayKhoa(ko), giai: b.league || "Giải khác", slug: b.slug, nhan: `${gio} ${dm} · ${tenNha(d)} vs ${tenKhach(d)}` }];
  });
  const ngays = [...new Set(tran.map((t) => t.ngay))];
  const sap = ngays.filter((n) => n >= homNay).sort();
  const qua = ngays.filter((n) => n < homNay).sort().reverse();
  return [...sap, ...qua].map((ngay) => {
    const trong = tran.filter((t) => t.ngay === ngay).sort((a, b) => a.ko.localeCompare(b.ko));
    const giais = [...new Set(trong.map((t) => t.giai))];
    return {
      ngay,
      nhan: dinhDang(trong[0].ko, { weekday: "long", day: "2-digit", month: "2-digit" }),
      giai: giais.map((ten) => ({ ten, tran: trong.filter((t) => t.giai === ten).map(({ slug, nhan }) => ({ slug, nhan })) })),
    };
  });
}
