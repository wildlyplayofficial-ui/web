import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "@/components/local-kickoff-time";
import { ScrollRow } from "@/components/scroll-row";
import type { RailTran } from "@/lib/rail-tran";
import { tenDoiViet, tenGiaiViet } from "@/lib/ten-viet";

/* eslint-disable @next/next/no-img-element */

/**
 * Top scoreboard rail — the ESPN-style strip that sits under the header, above
 * the hero. Full-bleed row of compact match cards: recently-finished scores +
 * near-upcoming kickoffs across every competition. Distinct from LiveTicker
 * (live-only headline scores): this is the always-on scores & fixtures strip.
 *
 * Reuses the SAME `stripMatches` the homepage used to feed HomeNextMatches — no
 * extra fetch.
 *
 * 12/11: thẻ KHÔNG còn link sang /match/{slug}. Trang /match chỉ-có-lịch là trang
 * khuôn mỏng tự noindex; trang chủ (trang duy nhất Google còn giữ) đẩy 11 link vào
 * đó là mời Google bò đúng nhóm không muốn index. Băng chỉ còn là băng tỉ số.
 */
export function ScoreboardRail({
  matches,
  labels,
}: {
  matches: RailTran[];
  labels: { title: string; finished: string };
}) {
  if (matches.length === 0) return null;

  // Thẻ đầu tiên CHƯA đá — băng cuộn tới đúng chỗ này khi mở trang (Nick 29/8).
  // Trận đã KT vẫn giữ, chỉ nằm bên trái. Không có trận nào chưa đá thì không neo,
  // băng đứng ở đầu như cũ.
  const neoTaiId = matches.find((m) => !m.that)?.id ?? null;

  return (
    <div className="border-b border-line bg-card" aria-label={labels.title}>
      <div className="mx-auto max-w-[1100px] px-5 py-2.5">
        <ScrollRow tuChay className="flex items-stretch gap-2">
          <span className="flex shrink-0 items-center pr-1 font-display text-[11px] font-bold uppercase tracking-wide text-muted">
            {labels.title}
          </span>
          {matches.map((m) => {
            const status = m.that ? (
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-brand">
                {labels.finished}
              </span>
            ) : m.dangDa ? (
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-brand">Đang đá</span>
            ) : (
              <LocalKickoffTime iso={m.kickoffUtc} className="text-[10px] tabular-nums text-muted" />
            );
            const dong = (ten: string, logo: string | null, diem: number | undefined) => (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                {logo ? (
                  <img src={logo} alt="" width={20} height={20} loading="lazy" className="mr-1.5 inline-block h-5 w-5 shrink-0 object-contain" />
                ) : (
                  <TeamCrest name={ten} />
                )}
                <span className="flex-1 truncate">{tenDoiViet(ten)}</span>
                {diem !== undefined && <span className="font-display font-bold tabular-nums">{diem}</span>}
              </div>
            );
            const body = (
              <>
                <div className="flex items-center gap-1">
                  <span className="truncate text-[10px] text-muted">{tenGiaiViet(m.giai)}</span>
                  <span className="ml-auto shrink-0 pl-1">{status}</span>
                </div>
                {dong(m.nha, m.logoNha, m.that?.[0])}
                {dong(m.khach, m.logoKhach, m.that?.[1])}
              </>
            );
            const cls =
              "flex w-[168px] shrink-0 flex-col rounded-md border border-line bg-bg px-2.5 py-1.5 transition-colors";
            const neo = m.id === neoTaiId ? { "data-neo": "" } : {};
            return (
              <div key={m.id} className={cls} {...neo}>
                {body}
              </div>
            );
          })}
        </ScrollRow>
      </div>
    </div>
  );
}
