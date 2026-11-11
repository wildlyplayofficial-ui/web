/**
 * JSON-LD + câu hỏi nhanh cho dự đoán (bản mổ xẻ PredictZ 10/11: mỗi trận một
 * SportsEvent, FAQ có số thật). Hàm THUẦN — số lấy từ dữ liệu đã chấm, không bịa.
 * Import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";

const doi = (name: string) => ({ "@type": "SportsTeam", name });

/** Câu dự đoán ngắn: "Việt Nam thắng 2-1" / "Hòa 1-1". */
export function cauDuDoan(h: Pick<HangDuDoan, "nha" | "khach" | "du">): string | null {
  if (!h.du) return null;
  const [a, b] = h.du;
  return a === b ? `Hòa ${a}-${b}` : `${a > b ? h.nha : h.khach} thắng ${a}-${b}`;
}

/** Một trận → SportsEvent. Trận đã đá vẫn để EventScheduled (schema.org không có
 *  trạng thái "đã xong"); kết quả ghi vào description. `trangTran` = url trỏ trang
 *  riêng /du-doan/{slug} (mặc định cho trận không có bài; bài nhận định trỏ /analysis). */
export function suKienTran(h: HangDuDoan, base: string, trangTran = !h.coBai) {
  const du = cauDuDoan(h);
  const moTa = [
    du ? `Dự đoán: ${du}` : null,
    h.that ? `Kết quả: ${h.nha} ${h.that[0]}-${h.that[1]} ${h.khach}` : null,
  ].filter(Boolean).join(". ");
  return {
    "@type": "SportsEvent",
    name: `${h.nha} vs ${h.khach}`,
    startDate: h.kickoffUtc,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Football",
    url: trangTran ? `${base}/du-doan/${h.slug}` : `${base}/analysis/${h.slug}`,
    homeTeam: doi(h.nha),
    awayTeam: doi(h.khach),
    competitor: [doi(h.nha), doi(h.khach)],
    ...(h.san ? { location: { "@type": "Place", name: h.san } } : {}),
    ...(moTa ? { description: moTa } : {}),
  };
}

export interface CauHoi {
  hoi: string;
  dap: string;
}

const gioNgayVN = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

/**
 * Câu hỏi nhanh cho /du-doan. Chỉ sinh câu nào có số thật; chưa có trận chốt tỷ
 * số thì trả mảng rỗng (không hiện khối). Thành tích tách THEO TÁC GIẢ (firewall
 * Curator/Scout — không gộp một tổng).
 */
export function cauHoiDuDoan(hang: readonly HangDuDoan[]): CauHoi[] {
  // Đếm theo bảng đang hiện (bài + tệp tuần) để FAQ khớp số trận người đọc thấy.
  // Peter 11/11: /du-doan bỏ phần chấm đúng/sai → FAQ không nói chuyện chấm.
  const coDu = hang.filter((h) => h.du);
  if (coDu.length === 0) return [];
  const ds: CauHoi[] = [
    {
      hoi: "banhbong.net đã dự đoán bao nhiêu trận?",
      dap: `${coDu.length} trận có tỷ số chốt trước giờ bóng lăn, ${coDu.filter((h) => h.sapDa).length} trận sắp đá.`,
    },
  ];
  const ke = hang.filter((h) => h.sapDa && h.du).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))[0];
  if (ke) {
    ds.push({
      hoi: "Trận sắp tới có dự đoán là trận nào?",
      dap: `${ke.nha} vs ${ke.khach}, ${gioNgayVN(ke.kickoffUtc)} (giờ Việt Nam). Dự đoán: ${cauDuDoan(ke)}.`,
    });
  }
  ds.push({
    hoi: "Mỗi trận có những gì?",
    dap: "Tỷ số dự đoán chốt trước giờ bóng lăn, phong độ 5 trận gần nhất của hai đội (T thắng, H hoà, B bại, mới nhất bên phải) và tỷ lệ 1 X 2 khi có. Bấm vào trận để xem số liệu đầy đủ.",
  });
  return ds;
}

export function faqSchema(ds: readonly CauHoi[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ds.map((c) => ({
      "@type": "Question",
      name: c.hoi,
      acceptedAnswer: { "@type": "Answer", text: c.dap },
    })),
  };
}

/** Chuỗi JSON an toàn để nhúng <script type="application/ld+json">. */
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

/** "10/11/2026" theo giờ VN. */
const ngayVNChu = (t: number | Date) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(t);

/** Title + description /du-doan có ngày (giờ VN). Title chưa kèm " | banhbong.net"
 *  (template gốc gắn thêm 15 ký tự) → giữ ≤45 để tổng ≤60; description ≤160. */
export function metaDuDoan(now: number | Date): { tieuDe: string; moTa: string } {
  const ngay = ngayVNChu(now);
  return {
    tieuDe: `Dự đoán bóng đá hôm nay ${ngay}`,
    moTa: `Dự đoán tỷ số từng trận ngày ${ngay} (giờ Việt Nam): các giải đấu trong ngày, kèm bảng đúng/sai công khai sau mỗi trận.`,
  };
}
