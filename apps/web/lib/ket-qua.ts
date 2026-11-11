/**
 * Trang /ket-qua (Peter duyệt mẫu v2 11/11/2026): tỷ số các trận đã dự đoán, lấy từ tệp tuần
 * (data/du-doan-tuan.json) — dòng nào máy nạp đã gắn `kq` [bàn nhà, bàn khách] là trận đã đá.
 */
import { ngayVN } from "./du-doan-hang";
import { logo, slugTuan, type DongTuan } from "./du-doan-tuan";
import { tenDoiViet, tenGiaiViet } from "./ten-viet";

export interface TranKetQua {
  slug: string;
  giai: string;
  /** Giờ đá VN "02:30"; tệp không có giờ thì "--:--". */
  gio: string;
  /** Khoá xếp thứ tự trong ngày. */
  khoa: string;
  nha: string;
  khach: string;
  logoNha: string | null;
  logoKhach: string | null;
  kq: [number, number];
}

const gioVN = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );

/** Cộng/trừ ngày trên khoá YYYY-MM-DD (tính ở UTC để khỏi lệch múi giờ máy). */
export const lechNgay = (khoa: string, n: number) =>
  new Date(Date.parse(`${khoa}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Trận đã có tỷ số trong ngày `ngay` (giờ VN), xếp theo giờ đá. */
export function ketQuaNgay(dong: readonly DongTuan[], ngay: string): TranKetQua[] {
  return dong
    .flatMap((d): TranKetQua[] => {
      if (d.kq?.length !== 2) return [];
      if ((d.gioUtc ? ngayVN(d.gioUtc) : d.ngay) !== ngay) return [];
      return [
        {
          slug: slugTuan(d),
          giai: tenGiaiViet(d.giai),
          gio: d.gioUtc ? gioVN(d.gioUtc) : "--:--",
          khoa: d.gioUtc ?? `${d.ngay}T99`,
          nha: tenDoiViet(d.nha),
          khach: tenDoiViet(d.khach),
          logoNha: logo(d.nha),
          logoKhach: logo(d.khach),
          kq: [d.kq[0], d.kq[1]],
        },
      ];
    })
    .sort((a, b) => a.khoa.localeCompare(b.khoa));
}

/** Gom theo giải, giải nhiều trận đứng trước (cùng số trận thì giữ thứ tự giờ đá). */
export function gomGiai(ds: readonly TranKetQua[]): [string, TranKetQua[]][] {
  const m = new Map<string, TranKetQua[]>();
  for (const t of ds) m.set(t.giai, [...(m.get(t.giai) ?? []), t]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Thứ viết tay, không dùng Intl: ICU của Node và trình duyệt ra chữ khác nhau. */
const THU = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ngayThang = (k: string) => `${+k.slice(8)}/${+k.slice(5, 7)}`;

/** Nhãn tab: "Hôm nay 11/11", "Hôm qua 10/11", "Thứ Hai 9/11". */
export function nhanNgay(k: string, homNay: string): string {
  if (k === homNay) return `Hôm nay ${ngayThang(k)}`;
  if (k === lechNgay(homNay, -1)) return `Hôm qua ${ngayThang(k)}`;
  return `${THU[new Date(`${k}T00:00:00Z`).getUTCDay()]} ${ngayThang(k)}`;
}

/** Tiêu đề trang theo ngày đang xem. */
export function tieuDeNgay(k: string, homNay: string): string {
  if (k === homNay) return "Kết quả bóng đá hôm nay";
  if (k === lechNgay(homNay, -1)) return "Kết quả bóng đá hôm qua";
  return `Kết quả bóng đá ${nhanNgay(k, homNay)}`;
}

/** Ngày hôm nay theo giờ VN, YYYY-MM-DD. */
export const homNayVN = () => ngayVN(Date.now());

/** 5 tab: hôm nay, hôm qua, 3 ngày trước. */
export const cacNgay = (homNay: string) => [0, -1, -2, -3, -4].map((n) => lechNgay(homNay, n));
