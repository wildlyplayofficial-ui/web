/**
 * Trang /ket-qua (Peter duyệt mẫu v2 11/11/2026): tỷ số các trận đã dự đoán.
 * Nguồn tỷ số, theo thứ tự: `that` của dòng dự đoán (bài nhận định: bảng kết quả CSDL; tệp tuần:
 * `kq` máy nạp gắn), rồi bảng fixtures CSDL khớp theo tên đội + giờ đá (tệp tuần chưa có `kq`).
 */
import { cungTran, ngayVN, type HangDuDoan } from "./du-doan-hang";
import { slugTuan, type DongTuan } from "./du-doan-tuan";
import type { TranDaDa } from "./phong-do";

export interface TranKetQua {
  slug: string;
  giai: string;
  /** Giờ đá VN "02:30"; không có giờ thì "--:--". */
  gio: string;
  /** Khoá xếp thứ tự trong ngày. */
  khoa: string;
  nha: string;
  khach: string;
  logoNha: string | null;
  logoKhach: string | null;
  kq: [number, number];
}

/** Cộng/trừ ngày trên khoá YYYY-MM-DD (tính ở UTC để khỏi lệch múi giờ máy). */
export const lechNgay = (khoa: string, n: number) =>
  new Date(Date.parse(`${khoa}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const gioDa = (d: DongTuan) => d.gioUtc ?? `${d.ngay}T12:00:00Z`;

/** Dòng tệp tuần đã tới giờ đá mà chưa có `kq` — cần tra bảng fixtures. */
export const canTraTySo = (dong: readonly DongTuan[], bayGio = Date.now()): DongTuan[] =>
  dong.filter((d) => d.kq?.length !== 2 && Date.parse(gioDa(d)) < bayGio);

/** Tỷ số từ bảng fixtures cho dòng tệp tuần, khoá theo slug trang trận. Tên đội dùng tên GỐC tiếng Anh. */
export function tySoTuFixtures(dong: readonly DongTuan[], daDa: readonly TranDaDa[]): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  for (const d of dong) {
    const tran = { home: d.nha, away: d.khach, kickoff: gioDa(d) };
    const f = daDa.find((x) => cungTran(tran, { home: x.home, away: x.away, kickoff: x.kickoff_utc }));
    if (f) m.set(slugTuan(d), [f.home_score, f.away_score]);
  }
  return m;
}

/** Trận đã có tỷ số trong ngày `ngay` (giờ VN), xếp theo giờ đá. */
export function ketQuaNgay(
  hang: readonly HangDuDoan[],
  ngay: string,
  them: ReadonlyMap<string, [number, number]> = new Map(),
): TranKetQua[] {
  return hang
    .flatMap((h): TranKetQua[] => {
      const kq = h.that ?? them.get(h.slug);
      if (!kq || h.ngay !== ngay) return [];
      return [
        {
          slug: h.slug,
          giai: h.giai,
          gio: h.gio,
          khoa: h.gio === "--:--" ? `${h.ngay}T99` : h.kickoffUtc,
          nha: h.nha,
          khach: h.khach,
          logoNha: h.logoNha,
          logoKhach: h.logoKhach,
          kq,
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
