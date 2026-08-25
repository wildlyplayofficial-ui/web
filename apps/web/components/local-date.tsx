"use client";

import { useEffect, useState } from "react";

interface LocalDateProps {
  iso: string;
  /** BCP 47 locale for the active site language (e.g. locales[lang]). */
  locale: string;
  /** "long" = 12 July 2026 (article detail), "short" = 12 Jul (feed fallback). */
  format?: "long" | "short";
  /**
   * Pin the date to one timezone instead of following the viewer's clock.
   *
   * Ngày ĐĂNG BÀI phải cố định theo giờ toà soạn: nếu để nó chạy theo máy người
   * xem thì máy chủ in một ngày, trình duyệt in ngày khác — Google đọc bản máy
   * chủ nên bài đăng 05:12 sáng 25/8 giờ VN bị ghi nhận thành 24/8, mất một
   * ngày tươi mới. Giờ trận đấu thì ngược lại, vẫn nên theo máy người xem.
   */
  timeZone?: string;
  className?: string;
}

const FORMATS = {
  long: { day: "numeric", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short" },
} as const;

/** Shows a date in the viewer's local timezone (same pattern as LocalKickoffTime). */
export function LocalDate({ iso, locale, format = "long", timeZone, className }: LocalDateProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!iso || timeZone) return;   // đã ghim múi giờ thì không đổi theo máy người xem
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;
    setLabel(new Intl.DateTimeFormat(locale, FORMATS[format]).format(d));
  }, [iso, locale, format, timeZone]);

  // Ghim múi giờ: máy chủ và trình duyệt in RA CÙNG MỘT NGÀY, không đổi sau hydrate.
  // Không ghim: máy chủ in UTC trước, hydrate xong đổi sang giờ máy người xem.
  if (!label) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const co_dinh = new Intl.DateTimeFormat(locale, {
      ...FORMATS[format],
      timeZone: timeZone ?? "UTC",
    }).format(d);
    return (
      <time dateTime={iso} className={className}>{co_dinh}</time>
    );
  }

  return (
    <time dateTime={iso} className={className}>{label}</time>
  );
}
