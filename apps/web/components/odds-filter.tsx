"use client";

/**
 * Bộ lọc dùng CHUNG cho cả bảng lớn lẫn danh sách điện thoại.
 *
 * Trước đây bộ lọc nằm bên trong odds-board-list, mà cả component đó bị ẩn ở
 * màn hình rộng — nên trên máy tính KHÔNG có ô tìm kiếm nào (Nick 25/8 báo
 * "cho tìm kiếm và filter"; nó có sẵn nhưng chỉ hiện trên điện thoại).
 * Tách ra đây để một bộ lọc điều khiển cả hai kiểu hiển thị.
 */
import { leagueLabelForCompetition, type OddsBoardMatch } from "@/lib/odds-data";

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
