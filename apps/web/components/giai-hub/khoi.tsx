import type { ReactNode } from "react";
import { DoiLogo } from "@/components/doi-logo";
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

/** Logo theo bảng logo của web; thiếu thì logo dự phòng của nguồn (FotMob); vẫn thiếu thì chữ cái đầu. */
export function LogoDoi({ ten, du, size = 22 }: { ten: string; du?: Record<string, string>; size?: number }) {
  return <DoiLogo src={badgeNho(teamBadge(ten)) ?? du?.[ten] ?? null} ten={ten} size={size} />;
}
