/**
 * banhbong.net brand mark (bb + football) — PNG từ brand kit gốc (chưa có SVG).
 * Hai bản: trắng cho nền tối, mực (ink) cho nền sáng — chuyển bằng lớp `.dark` trên <html>
 * (xem globals.css `.bb-mark-*`). `size` = chiều cao render (px); tỉ lệ gốc 606:580.
 */
export function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const w = Math.round((size * 606) / 580);
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} style={{ width: w, height: size }} aria-hidden="true">
      <img src="/brand/bb-mark-white.png" alt="" width={w} height={size} className="bb-mark-white" decoding="async" />
      <img src="/brand/bb-mark-ink.png" alt="" width={w} height={size} className="bb-mark-ink" decoding="async" />
    </span>
  );
}
