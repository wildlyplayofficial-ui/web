import type { ReactNode } from "react";
import { badgeNho, teamBadge } from "@/lib/team-badges";

/** Một khối của hub: thẻ + H2 (mỗi khối một H2 cho Google đọc cấu trúc trang). */
export function Khoi({ id, tieuDe, phu, children }: { id: string; tieuDe: string; phu?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28">
      <h2 id={`${id}-h`} className="font-display text-xl font-bold">{tieuDe}</h2>
      {phu && <p className="mt-1 text-sm text-muted">{phu}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Logo theo bảng logo của web; thiếu thì logo dự phòng của nguồn (FotMob); vẫn thiếu thì chữ cái đầu.
 * Dựng ở server (không client component từng logo, đỡ hydrate + payload); ảnh lỗi do <LogoLoi /> xử lý chung.
 */
export function LogoDoi({ ten, du, size = 22 }: { ten: string; du?: Record<string, string>; size?: number }) {
  const src = badgeNho(teamBadge(ten)) ?? du?.[ten] ?? null;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo ngoài, cùng kiểu DoiLogo
      <img src={src} alt={ten} width={size} height={size} loading="lazy" data-logo="" className="shrink-0 object-contain" style={{ width: size, height: size }} />
    );
  }
  const chu = ten.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <span
      role="img"
      aria-label={ten}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-card-hover font-display text-xs font-bold leading-none tracking-tighter text-muted"
      style={{ width: size, height: size }}
    >
      {chu}
    </span>
  );
}
