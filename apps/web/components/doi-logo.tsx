/** Logo đội; thiếu logo thì vòng tròn chữ cái đầu — không bao giờ để ô trống. */
export function DoiLogo({ src, ten, size = 28 }: { src: string | null; ten: string; size?: number }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo ngoài (flagcdn/Wikimedia), cùng kiểu trang trận
      <img src={src} alt={ten} width={size} height={size} loading="lazy" className="shrink-0 object-contain" style={{ width: size, height: size }} />
    );
  }
  const chu = ten
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-label={ten}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-card-hover font-display text-[10px] font-bold text-muted"
      style={{ width: size, height: size }}
    >
      {chu}
    </span>
  );
}
