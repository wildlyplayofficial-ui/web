/**
 * banhbong.net brand mark — two lowercase "b" glyphs, the second bowl is a football.
 * Pure SVG (no asset), inherits text colour via currentColor; ball uses brand green.
 * Aspect 68:44. Pass `size` = rendered height in px.
 */
export function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const w = Math.round((size * 68) / 44);
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 68 44"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="3" y="2" width="8.5" height="40" rx="2.5" fill="currentColor" />
      <circle cx="19" cy="29" r="10" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="35" y="2" width="8.5" height="40" rx="2.5" fill="currentColor" />
      <circle cx="51" cy="29" r="13.5" fill="#22c55e" />
      <circle cx="51" cy="29" r="13.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <polygon points="51,22.5 56.5,26.5 54.5,33 47.5,33 45.5,26.5" fill="#0b0d12" />
      <g stroke="#0b0d12" strokeWidth="2" strokeLinecap="round" fill="none">
        <line x1="51" y1="22.5" x2="51" y2="16" />
        <line x1="56.5" y1="26.5" x2="63" y2="24" />
        <line x1="54.5" y1="33" x2="58" y2="39" />
        <line x1="47.5" y1="33" x2="44" y2="39" />
        <line x1="45.5" y1="26.5" x2="39" y2="24" />
      </g>
    </svg>
  );
}
