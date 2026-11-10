/**
 * Dựng dòng hiển thị cho hub /du-doan + khối "Dự đoán hôm nay" trang chủ.
 * Chạy ở SERVER: logo tra sẵn ở đây (bảng logo nặng, không gửi xuống trình duyệt),
 * dòng trả về là dữ liệu thuần để thành phần client lọc ngày/giải.
 */
import { tenSo } from "./du-doan-cham";
import { tenKhach, tenNha } from "./du-doan-nguon";
import { doiDau, phongDo, type KQ, type TranDaDa, type TranDoiDau } from "./phong-do";
import { teamBadge } from "./team-badges";
import { tenGiaiViet } from "./ten-viet";
import { nhanTran, type NhanTran } from "./du-doan-nhan";

export { nhanTran, type NhanTran };
import type { MucDuDoan } from "./du-doan";
import type { OddsBoardMatch } from "./odds-data";

export interface HangDuDoan {
  slug: string;
  /** Có bài nhận định /analysis/{slug} (dòng nạp từ tệp tuần thì không). */
  coBai: boolean;
  giai: string;
  kickoffUtc: string;
  /** Ngày đá theo giờ VN, YYYY-MM-DD — khoá của tab ngày. */
  ngay: string;
  /** Giờ đá VN "19:00". */
  gio: string;
  nha: string;
  khach: string;
  logoNha: string | null;
  logoKhach: string | null;
  anhNha: string | null;
  anhKhach: string | null;
  creditAnh: string | null;
  /** Tỷ số dự đoán [nhà, khách]; null = bài chưa chốt số. */
  du: [number, number] | null;
  /** Tỷ số thật, khi đã chấm được. */
  that: [number, number] | null;
  /** Đúng kết quả thắng/hoà/thua (null = chưa chấm). */
  dung: boolean | null;
  /** Trúng đúng tỷ số (null = chưa chấm). */
  dungTySo: boolean | null;
  /** Tên sân, nếu tệp dự đoán có ghi (cho JSON-LD location). */
  san: string | null;
  sapDa: boolean;
  /** Chú Tám có pick cho trận này (khớp tên hai đội + giờ đá). */
  pick: boolean;
  /** Tỷ lệ 1 · X · 2 hiện tại, nếu bảng tỷ lệ có trận này. */
  mot: [number, number, number] | null;
  /** 5 trận gần nhất trước trận này, mới nhất trước; null = không đủ dữ liệu. */
  formNha: KQ[] | null;
  formKhach: KQ[] | null;
  /** Tối đa 5 lần gặp nhau gần nhất (từ cùng dữ liệu phong độ); null = chưa có. */
  doiDau: TranDoiDau[] | null;
  /** Dự đoán tài/xỉu kèm mốc bàn ("Tài 2.5"); null = nguồn không ghi. */
  taiXiu: string | null;
  /** Dự đoán cả hai đội ghi bàn; null = nguồn không ghi. */
  haiDoiGhi: boolean | null;
  nhan: NhanTran[];
}

const LECH_TOI_DA = 36 * 3_600_000;

/** Khớp trận theo tên rút gọn hai đội (đúng chiều sân nhà) + giờ đá lệch ≤ 36 giờ. */
export function cungTran(
  a: { home: string; away: string; kickoff: string },
  b: { home: string; away: string; kickoff: string },
): boolean {
  return (
    tenSo(a.home) === tenSo(b.home) &&
    tenSo(a.away) === tenSo(b.away) &&
    Math.abs(Date.parse(a.kickoff) - Date.parse(b.kickoff)) <= LECH_TOI_DA
  );
}

/** YYYY-MM-DD theo giờ Việt Nam. */
export function ngayVN(iso: string | number | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));
}

const gioVN = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

export function dungHang(
  muc: readonly MucDuDoan[],
  picks: readonly { home_team: string; away_team: string; kickoff_utc: string }[],
  odds: readonly OddsBoardMatch[],
  daDa: readonly TranDaDa[] = [],
): HangDuDoan[] {
  return muc.flatMap((m): HangDuDoan[] => {
    const d = m.duDoan;
    if (!d || !m.kickoffUtc) return [];
    const tran = { home: d.home, away: d.away, kickoff: m.kickoffUtc };
    const keo = odds.find((o) => cungTran(tran, { home: o.homeTeam, away: o.awayTeam, kickoff: o.kickoffUtc }));
    const ml = keo?.markets.ML?.[0]?.current;
    const mot: HangDuDoan["mot"] =
      ml?.home_odds && ml.draw_odds && ml.away_odds ? [ml.home_odds, ml.draw_odds, ml.away_odds] : null;
    const logoNguon = (id: number | null | undefined) => (id ? `/api/team-logo/${id}` : null);
    const hang: HangDuDoan = {
        slug: m.bai.slug,
        coBai: true,
        giai: tenGiaiViet(m.bai.league || "Giải khác"),
        kickoffUtc: m.kickoffUtc,
        ngay: ngayVN(m.kickoffUtc),
        gio: gioVN(m.kickoffUtc),
        nha: tenNha(d),
        khach: tenKhach(d),
        logoNha: teamBadge(d.home) ?? logoNguon(keo?.homeId),
        logoKhach: teamBadge(d.away) ?? logoNguon(keo?.awayId),
        anhNha: d.anh_nha ?? null,
        anhKhach: d.anh_khach ?? null,
        creditAnh: d.credit_anh ?? null,
        du: m.chot ? [m.chot.home_goals, m.chot.away_goals] : null,
        that: m.ketQua ? [m.ketQua.that.home_score, m.ketQua.that.away_score] : null,
        dung: m.ketQua ? m.ketQua.dungKetQua : null,
        dungTySo: m.ketQua ? m.ketQua.dungTySo : null,
        san: d.san ?? null,
        sapDa: m.sapDa,
        pick: picks.some((p) => cungTran(tran, { home: p.home_team, away: p.away_team, kickoff: p.kickoff_utc })),
        mot,
        formNha: phongDo(daDa, d.home, m.kickoffUtc),
        formKhach: phongDo(daDa, d.away, m.kickoffUtc),
        doiDau: doiDau(daDa, d.home, d.away, m.kickoffUtc),
        taiXiu: null,
        haiDoiGhi: null,
        nhan: [],
    };
    return [{ ...hang, nhan: nhanTran(hang) }];
  });
}

/** Tên gốc (như bảng fixtures) của mọi đội có dự đoán — để kéo phong độ một lần. */
export function doiCanPhongDo(muc: readonly MucDuDoan[]): string[] {
  return muc.flatMap((m) => (m.duDoan ? [m.duDoan.home, m.duDoan.away] : []));
}

/** Câu ngắn cho ô dự đoán: "Việt Nam thắng" / "Hòa". */
export function cauKetQua(h: HangDuDoan, chuThang: string, chuHoa: string): string {
  if (!h.du) return "";
  const [a, b] = h.du;
  if (a === b) return chuHoa;
  return `${a > b ? h.nha : h.khach} ${chuThang}`;
}
