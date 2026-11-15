/**
 * KHO TRẬN ĐÃ ĐÁ (Peter chốt 15/11/2026): trận 5 giải lớn + Cúp C1 đá xong VẪN GIỮ trang
 * /du-doan/{slug}, đổi thành trang kết quả: tỷ số · số liệu trận · link highlight · link giải +
 * trận kế. KHÔNG hiện lại dự đoán cũ ("ko cần show dự đoán lúc trước").
 *
 * - data/du-doan-luu-tru.json: scripts/nap-predictz.mjs ghi thêm trận có kết quả (KHÔNG bao giờ xoá,
 *   tệp tuần chỉ giữ 7 ngày); scripts/nap-highlight.mjs bù số liệu trận + highlight từ FotMob.
 * - Cỡ: ~0,4 KB/trận (chỉ giữ trường cần cho trang kết quả), ~1.940 trận/mùa (5 giải 1.752 + C1 ~190)
 *   ≈ 0,8 MB/mùa. Chỉ trang server import tệp này — không vào gói JS phía trình duyệt.
 */
import kho from "../data/du-doan-luu-tru.json";
import { GIAI_INDEX_TRAN } from "./chi-muc";
import { tenSo } from "./du-doan-cham";
import { tenGiaiViet } from "./ten-viet";

type Cap = [number, number];
/** Số liệu cả trận [nhà, khách] (FotMob): kiểm soát bóng %, xG, sút, trúng đích, cơ hội lớn, phạt góc, thẻ vàng. */
export interface SoTran { pos?: Cap; xg?: Cap; sh?: Cap; st?: Cap; bc?: Cap; co?: Cap; yc?: Cap }
/** Link highlight chính thức (kênh YouTube của giải / CLB) + tên kênh. */
export interface Highlight { url: string; nguon: string }
export interface TranLuuTru {
  ngay: string;
  gioUtc: string | null;
  /** Tên giải gốc PredictZ ("England Premier League"). */
  giai: string;
  nha: string;
  khach: string;
  kq: Cap;
  so?: SoTran;
  hl?: Highlight;
  /** Mã trận FotMob, lần chạy sau khỏi dò lại. */
  fm?: number;
}

const KHO = kho as unknown as readonly TranLuuTru[];

/** Cùng khuôn slugTuan (lib/du-doan-tuan.ts) để trang trận giữ nguyên địa chỉ khi rời tệp tuần. */
export const slugLuuTru = (t: Pick<TranLuuTru, "ngay" | "nha" | "khach">) => `tuan-${t.ngay}-${tenSo(t.nha)}-${tenSo(t.khach)}`;

export function timLuuTru(slug: string, ds: readonly TranLuuTru[] = KHO): TranLuuTru | null {
  return ds.find((t) => slugLuuTru(t) === slug) ?? null;
}

/** Chỉ nhận link YouTube (kênh chính thức do FotMob gắn) — không link web lậu, không nhà cái. */
export function linkHighlight(hl: Highlight | undefined): Highlight | null {
  if (!hl?.url) return null;
  try {
    const host = new URL(hl.url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" ? hl : null;
  } catch {
    return null;
  }
}

/** Trang kết quả được index khi thuộc giải được index VÀ có thêm số liệu trận hoặc highlight (không chỉ một tỷ số). */
export const ketQuaDuocIndex = (t: TranLuuTru): boolean =>
  GIAI_INDEX_TRAN.test(tenGiaiViet(t.giai)) && (!!linkHighlight(t.hl) || Object.keys(t.so ?? {}).length > 0);

/** Hub giải /competitions/{slug} theo tên gốc PredictZ. */
const HUB: Record<string, string> = {
  "England Premier League": "premier-league",
  "Spain La Liga": "la-liga",
  "Italy Serie A": "serie-a",
  "Germany Bundesliga": "bundesliga",
  "France Ligue 1": "ligue-1",
  "UEFA Champions League": "champions-league",
};
export const hubGiai = (giai: string): string | null => HUB[giai] ?? null;
