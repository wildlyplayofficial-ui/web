/**
 * Trang /ket-qua (Peter duyệt mẫu v2 11/11/2026): tỷ số các trận đã dự đoán.
 * Nguồn tỷ số, theo thứ tự: `that` của dòng dự đoán (bài nhận định: bảng kết quả CSDL; tệp tuần:
 * `kq` máy nạp gắn), rồi tỷ số livescore (lib/ket-qua-ls.ts) / bảng fixtures CSDL khớp theo tên đội
 * + giờ đá (tệp tuần chưa có `kq`).
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

/** Tab ngày /ket-qua (Peter 11/11 "ngày nào không có thì đừng hiện"): chỉ ngày có ≥1 trận có tỷ số.
 *  Ngày chọn: `xin` nếu có tỷ số, rồi hôm qua, rồi ngày gần nhất có tỷ số; không ngày nào có → null. */
export function chonNgayKetQua(
  homNay: string,
  hang: readonly HangDuDoan[],
  them: ReadonlyMap<string, [number, number]>,
  xin?: string,
): { ngays: string[]; ngay: string | null } {
  const ngays = cacNgay(homNay).filter((k) => ketQuaNgay(hang, k, them).length > 0);
  const homQua = lechNgay(homNay, -1);
  const ngay = xin && ngays.includes(xin) ? xin : ngays.includes(homQua) ? homQua : ngays[0] ?? null;
  return { ngays, ngay };
}

/** Một trận đã đá theo nhà cung cấp tỷ số (lib/ket-qua-ls.ts). */
export interface TranLS {
  home: string;
  away: string;
  /** ISO UTC giờ đá. */
  kickoff: string;
  kq: [number, number];
}

/** Chuẩn hoá tên đội như máy nạp (scripts/nap-predictz.mjs `so`): bỏ dấu, bỏ FC/United/Town… */
export const soTen = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|afc|cf|sc|united|utd|city|town|athletic|the)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
const giong = (x: string, y: string) => x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x));

/** Ghép dòng tệp tuần với trận nhà cung cấp: tên nhà + khách giống nhau, giờ đá lệch ≤ 36 tiếng
 *  (dòng không có giờ thì lấy giữa trưa ngày PredictZ). Khoá theo slug trang trận. */
export function tySoTuLS(dong: readonly DongTuan[], ls: readonly TranLS[]): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  for (const d of dong) {
    const nha = soTen(d.nha);
    const khach = soTen(d.khach);
    const t = Date.parse(gioDa(d));
    const f = ls.find(
      (x) => giong(soTen(x.home), nha) && giong(soTen(x.away), khach) && Math.abs(Date.parse(x.kickoff) - t) <= 36 * 3_600_000,
    );
    if (f) m.set(slugTuan(d), f.kq);
  }
  return m;
}
