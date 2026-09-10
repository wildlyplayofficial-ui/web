"use client";

/**
 * Khung ngoài của bảng kèo: giữ trạng thái bộ lọc và đổ dữ liệu ĐÃ LỌC vào cả
 * hai kiểu hiển thị — bảng 6 cột (màn rộng) và danh sách bấm-mở (điện thoại).
 *
 * Trước đây bộ lọc nằm trong danh sách điện thoại, mà cả danh sách đó bị ẩn ở
 * màn rộng, nên người dùng máy tính không có ô tìm kiếm nào (Nick 25/8).
 */
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { OddsTable } from "./odds-table";
import { OddsBoardList } from "./odds-board-list";
import { FilterBar, danhSachGiai, danhSachNgay, locNgay, type BoLoc, type DayGroup } from "./odds-filter";

export function OddsBoard({ days, lang }: { days: DayGroup[]; lang: Lang }) {
  const [boLoc, setBoLoc] = useState<BoLoc>({ search: "", competition: "", dateKey: "" });
  const doi = (v: Partial<BoLoc>) => setBoLoc((cu) => ({ ...cu, ...v }));
  const dayLoc = locNgay(days, boLoc);

  // Cuộn tới trận được deep-link. Trang dựng CẢ HAI kiểu hiển thị rồi ẩn một
  // cái bằng CSS, nên cùng một mã trận có hai chỗ trong DOM — dùng id thì trình
  // duyệt nhảy vào cái ĐANG ẨN và người dùng máy tính thấy trang đứng yên,
  // không có lỗi nào báo ra. Vì vậy đánh dấu bằng data-tran rồi tự chọn cái có
  // offsetParent (tức đang hiện).
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash).slice(1);
    if (!hash.startsWith("tran-")) return;
    const id = requestAnimationFrame(() => {
      const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-tran="${CSS.escape(hash)}"]`))
        .find((e) => e.offsetParent !== null);
      el?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div>
      <FilterBar
        boLoc={boLoc}
        onDoi={doi}
        competitions={danhSachGiai(days)}
        dateOptions={danhSachNgay(days)}
      />

      {dayLoc.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Không có trận nào khớp bộ lọc.</p>
      ) : (
        <>
          <OddsTable days={dayLoc} />
          <div className="lg:hidden">
            <OddsBoardList days={dayLoc} lang={lang} />
          </div>
        </>
      )}
    </div>
  );
}
