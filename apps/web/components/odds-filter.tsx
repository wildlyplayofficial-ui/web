"use client";

/**
 * Bộ lọc dùng CHUNG cho cả bảng lớn lẫn danh sách điện thoại.
 *
 * Trước đây bộ lọc nằm bên trong odds-board-list, mà cả component đó bị ẩn ở
 * màn hình rộng — nên trên máy tính KHÔNG có ô tìm kiếm nào (Nick 25/8 báo
 * "cho tìm kiếm và filter"; nó có sẵn nhưng chỉ hiện trên điện thoại).
 * Tách ra đây để một bộ lọc điều khiển cả hai kiểu hiển thị.
 */
import { leagueLabelForCompetition, type MarketLine, type OddsBoardMatch } from "@/lib/odds-data";

export interface DayGroup {
  dateKey: string;
  heading: string;
  matches: OddsBoardMatch[];
}

export interface BoLoc {
  search: string;
  competition: string;
  dateKey: string;
}

/** Chuẩn hoá để tìm không phân biệt hoa/thường, có dấu/không dấu (Arsenal ~ arsenal ~ ARSENAL). */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function danhSachGiai(days: DayGroup[]): string[] {
  return [...new Set(days.flatMap((d) => d.matches.map((m) => leagueLabelForCompetition(m.competitionId))))].sort();
}

export function danhSachNgay(days: DayGroup[]): Array<{ dateKey: string; label: string }> {
  return days.map((d) => ({ dateKey: d.dateKey, label: d.heading.split(",")[1]?.trim() ?? d.heading }));
}

/** Lọc ngay trên dữ liệu đã tải sẵn — không gọi lại server, gõ tới đâu thấy tới đó. */
export function locNgay(days: DayGroup[], { search, competition, dateKey }: BoLoc): DayGroup[] {
  const needle = normalize(search.trim());
  return days
    .filter((d) => dateKey === "" || d.dateKey === dateKey)
    .map((d) => ({
      ...d,
      matches: d.matches.filter((m) => {
        if (competition && leagueLabelForCompetition(m.competitionId) !== competition) return false;
        if (needle && !normalize(`${m.homeTeam} ${m.awayTeam}`).includes(needle)) return false;
        return true;
      }),
    }))
    .filter((d) => d.matches.length > 0);
}

export function FilterBar({
  boLoc,
  onDoi,
  competitions,
  dateOptions,
}: {
  boLoc: BoLoc;
  onDoi: (v: Partial<BoLoc>) => void;
  competitions: string[];
  dateOptions: Array<{ dateKey: string; label: string }>;
}) {
  return (
    <div className="mb-6 rounded-card border border-line bg-card px-4 py-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={boLoc.search}
          onChange={(e) => onDoi({ search: e.target.value })}
          placeholder="Tìm tên đội bóng"
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <select
          value={boLoc.competition}
          onChange={(e) => onDoi({ competition: e.target.value })}
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Bộ lọc giải đấu</option>
          {competitions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="radio"
            name="odds-date"
            checked={boLoc.dateKey === ""}
            onChange={() => onDoi({ dateKey: "" })}
            className="accent-brand"
          />
          Tất cả
        </label>
        {dateOptions.map((d) => (
          <label key={d.dateKey} className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              name="odds-date"
              checked={boLoc.dateKey === d.dateKey}
              onChange={() => onDoi({ dateKey: d.dateKey })}
              className="accent-brand"
            />
            {d.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Nhà cái ra tới ~20 mức chấp và ~20 mức tài xỉu mỗi trận. Đổ hết thì một trận
 *  chiếm gần 40 dòng. Bảng nhà cái thật chỉ hiện mức CHUẨN và vài mức kề.
 *
 *  Mức chuẩn = mức hai bên gần ngang giá nhất; đó là mức nhà cái coi là cân bằng.
 *  Lấy cửa sổ quanh nó, giữ nguyên thứ tự mức chấp để đọc theo hàng dọc. */
export function locMucChinh(lines: MarketLine[], soDong = 4): MarketLine[] {
  if (lines.length <= soDong) return lines;
  const lech = (l: MarketLine) => {
    const c = l.current;
    const a = c.home_odds ?? c.over_odds;
    const b = c.away_odds ?? c.under_odds;
    return a == null || b == null ? Number.POSITIVE_INFINITY : Math.abs(a - b);
  };
  let iChuan = 0;
  lines.forEach((l, i) => {
    if (lech(l) < lech(lines[iChuan])) iChuan = i;
  });
  const tu = Math.max(0, Math.min(iChuan - Math.floor(soDong / 2), lines.length - soDong));
  return lines.slice(tu, tu + soDong);
}

/** Sáu cột bảng đang hiện. European Handicap KHÔNG nằm trong bảng. */
const THI_TRUONG_TREN_BANG = ["ML", "Spread", "Totals", "ML HT", "Spread HT", "Totals HT"] as const;

/** ĐÚNG những mức mà bảng phía trên đang hiện — không hơn.
 *
 *  Nick 25/8: "sao nhiều kèo không có ở trên lại có ở chi tiết, chỉ show đúng
 *  các kèo ở trên thôi". Trước đây phần chi tiết đổ nguyên ~40 mức từ -1.5 tới
 *  +1 trong khi bảng chỉ hiện 4 mức. */
export function mucTheoBang(
  markets: Record<string, MarketLine[]>,
): Array<{ market: string; lines: MarketLine[] }> {
  const ra: Array<{ market: string; lines: MarketLine[] }> = [];
  for (const m of THI_TRUONG_TREN_BANG) {
    const lines = markets[m] ?? [];
    if (lines.length === 0) continue;
    // Cột 1X2 trong bảng chỉ lấy dòng đầu, không có mức chấp.
    ra.push({ market: m, lines: m === "ML" || m === "ML HT" ? lines.slice(0, 1) : locMucChinh(lines) });
  }
  return ra;
}

/** Đổi giá thập phân sang kiểu Malay — kiểu số mà bảng kèo VN quen dùng.
 *
 *  Nick 25/8: "odd số âm màu đỏ". Giá thập phân KHÔNG BAO GIỜ âm nên nếu cứ để
 *  thập phân thì không có số nào đỏ; muốn có dấu âm thì phải đổi hệ.
 *
 *  Quy tắc: cửa dễ ăn (thập phân < 2) ra số DƯƠNG = đặt 1 ăn bấy nhiêu.
 *  Cửa khó ăn (>= 2) ra số ÂM = phải đặt bấy nhiêu mới ăn 1.
 */
export function sangMalay(d: number): number {
  const loi = d - 1;
  return loi <= 1 ? loi : -1 / loi;
}

