/**
 * Chữ tóm tắt viết từ số liệu có thật của bảng dự đoán, cho hub /du-doan và trang từng giải
 * (soi chỉ mục 18/11: Google chỉ giữ trang chủ, trang dự đoán quá mỏng). Hàm THUẦN: số đếm từ
 * các dòng trận đang có, câu nào không có số thật thì không sinh. Import TƯƠNG ĐỐI cho vitest.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { ngayThang, thuVN } from "./du-doan-tran";
import type { CauHoi } from "./du-doan-schema";

const soTran = (n: number) => `${n} trận`;

/** Danh sách "A, B và C". */
function noiChu(ds: readonly string[]): string {
  if (ds.length <= 1) return ds.join("");
  return `${ds.slice(0, -1).join(", ")} và ${ds[ds.length - 1]}`;
}

const theoGio = (a: HangDuDoan, b: HangDuDoan) => a.kickoffUtc.localeCompare(b.kickoffUtc);

export interface DongNgay {
  ngay: string;
  /** "Thứ Sáu 20/11". */
  nhan: string;
  so: number;
  dau: HangDuDoan;
}

/** Gom trận theo ngày VN (đã xếp theo giờ đá): số trận + trận đá đầu tiên của ngày. */
export function bangTheoNgay(ds: readonly HangDuDoan[]): DongNgay[] {
  const nhom = new Map<string, HangDuDoan[]>();
  for (const h of [...ds].sort(theoGio)) nhom.set(h.ngay, [...(nhom.get(h.ngay) ?? []), h]);
  return [...nhom.entries()].map(([ngay, l]) => ({ ngay, nhan: `${thuVN(ngay)} ${ngayThang(ngay)}`, so: l.length, dau: l[0] }));
}

export interface DongGiai {
  giai: string;
  so: number;
  tu: string;
  den: string;
}

export interface TongQuan {
  /** 2-3 câu mở đầu, số liệu ở ngay câu đầu. */
  mo: string;
  bang: DongGiai[];
  faq: CauHoi[];
}

/** Số trận Over / số trận có mốc Over/Under trong danh sách. */
function demOver(ds: readonly HangDuDoan[]): { over: number; co: number } {
  const co = ds.filter((h) => h.taiXiu !== null);
  return { over: co.filter((h) => /^over/i.test(h.taiXiu ?? "")).length, co: co.length };
}

/** Tổng quan hub /du-doan từ các trận sắp đá (ngày VN từ `homNay` trở đi). Không có trận nào → null. */
export function tongQuanDuDoan(hang: readonly HangDuDoan[], homNay: string): TongQuan | null {
  const sap = hang.filter((h) => h.sapDa && h.ngay >= homNay).sort(theoGio);
  if (sap.length === 0) return null;
  const hn = sap.filter((h) => h.ngay === homNay);
  const ngay = [...new Set(sap.map((h) => h.ngay))];
  const giai = [...new Set(sap.map((h) => h.giai))];
  const tu = ngayThang(ngay[0]);
  const den = ngayThang(ngay[ngay.length - 1]);
  const khoang = ngay.length === 1 ? `ngày ${tu}` : `${ngay.length} ngày từ ${tu} đến ${den}`;

  const dauCau = hn.length > 0
    ? `Hôm nay ${ngayThang(homNay)} có ${soTran(hn.length)} được dự đoán tỷ số`
    : `Hôm nay ${ngayThang(homNay)} chưa có trận nào được dự đoán`;
  const mo = `${dauCau}; tính cả những ngày tới, banhbong đang có ${soTran(sap.length)} sắp đá ở ${giai.length} giải trong ${khoang} (giờ Việt Nam). ` +
    `Giải có nhiều trận nhất là ${[...giai].map((g) => ({ g, n: sap.filter((h) => h.giai === g).length })).sort((a, b) => b.n - a.n)[0].g}. ` +
    `Bảng dưới tóm tắt từng giải, danh sách trận theo ngày nằm ngay bên dưới.`;

  const bang: DongGiai[] = giai.map((g) => {
    const l = sap.filter((h) => h.giai === g);
    return { giai: g, so: l.length, tu: ngayThang(l[0].ngay), den: ngayThang(l[l.length - 1].ngay) };
  }).sort((a, b) => b.so - a.so);

  const faq: CauHoi[] = [];
  if (hn.length > 0) {
    const ds = hn.slice(0, 5).map((h) => `${h.nha} vs ${h.khach}${h.gio === "--:--" ? "" : ` (${h.gio})`}`);
    faq.push({
      hoi: "Hôm nay có những trận nào được dự đoán?",
      dap: `Hôm nay ${ngayThang(homNay)} có ${soTran(hn.length)}: ${noiChu(ds)}${hn.length > 5 ? ` và ${hn.length - 5} trận khác` : ""}. Giờ đá theo giờ Việt Nam.`,
    });
  }
  faq.push({
    hoi: "Giải nào có nhiều trận dự đoán nhất?",
    dap: `${noiChu(bang.slice(0, 3).map((b) => `${b.giai} (${soTran(b.so)})`))}, trong tổng ${soTran(sap.length)} sắp đá từ ${tu} đến ${den}.`,
  });
  const { over, co } = demOver(sap);
  if (co > 0) {
    faq.push({
      hoi: "Bao nhiêu trận được dự đoán Over?",
      dap: `Trong ${co} trận sắp đá có dự đoán Over/Under, ${over} trận được dự đoán Over và ${co - over} trận Under. Over nghĩa là tổng số bàn cả trận vượt mốc, Under là không vượt mốc.`,
    });
  }
  const co2 = sap.filter((h): h is HangDuDoan & { du: [number, number] } => h.du !== null);
  if (co2.length > 0) {
    const nha = co2.filter((h) => h.du[0] > h.du[1]).length;
    const hoa = co2.filter((h) => h.du[0] === h.du[1]).length;
    faq.push({
      hoi: "Các trận sắp tới nghiêng về đội chủ nhà hay đội khách?",
      dap: `Theo tỷ số dự đoán của ${co2.length} trận đã chốt: ${nha} trận chủ nhà thắng, ${hoa} trận hòa, ${co2.length - nha - hoa} trận đội khách thắng.`,
    });
  }
  return { mo, bang, faq };
}

/** Câu hỏi bổ sung cho trang một giải, từ các trận sắp đá của giải (đã xếp theo giờ đá). */
export function faqGiai(ds: readonly HangDuDoan[], ten: string): CauHoi[] {
  if (ds.length === 0) return [];
  const ngay = bangTheoNgay(ds);
  const faq: CauHoi[] = [
    {
      hoi: `Sắp tới ${ten} có bao nhiêu trận?`,
      dap: `${ten} có ${soTran(ds.length)} sắp đá trong ${ngay.length === 1 ? `ngày ${ngayThang(ngay[0].ngay)}` : `${ngay.length} ngày từ ${ngayThang(ngay[0].ngay)} đến ${ngayThang(ngay[ngay.length - 1].ngay)}`} (giờ Việt Nam). Ngày đông nhất là ${ngay.slice().sort((a, b) => b.so - a.so)[0].nhan} với ${soTran(ngay.slice().sort((a, b) => b.so - a.so)[0].so)}.`,
    },
    {
      hoi: `Trận ${ten} nào đá sớm nhất?`,
      dap: `${ds[0].nha} vs ${ds[0].khach}, ${ds[0].gio === "--:--" ? "" : `${ds[0].gio} `}${thuVN(ds[0].ngay)} ${ngayThang(ds[0].ngay)} (giờ Việt Nam).`,
    },
  ];
  const { over, co } = demOver(ds);
  if (co > 0) {
    faq.push({
      hoi: `${ten} sắp tới có bao nhiêu trận được dự đoán Over?`,
      dap: `${over}/${co} trận có dự đoán Over/Under được dự đoán Over, ${co - over} trận Under.`,
    });
  }
  return faq;
}
