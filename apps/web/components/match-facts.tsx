import Link from "next/link";
import type { MatchContext } from "@/lib/match-context";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * Khối dữ liệu thật cho trang trận: giờ Việt Nam, bảng xếp hạng, phong độ,
 * đối đầu, xác suất thị trường.
 *
 * Dùng cho trận CHƯA có nội dung biên tập — trước đây những trang này chỉ có
 * tên hai đội và một dòng "chưa có nội dung" (96 chữ, đo 23/8). Google phạt tay
 * site có nhiều trang mỏng, mà trận sắp đá lại là trận người ta tìm nhiều nhất.
 *
 * Mọi số ở đây tính từ bảng fixtures + odds_snapshots. Khối nào thiếu dữ liệu
 * thì không render — thà ngắn còn hơn bịa.
 */

const RESULT_LABEL: Record<"T" | "H" | "B", { text: string; cls: string }> = {
  T: { text: "T", cls: "bg-brand/15 text-brand" },
  H: { text: "H", cls: "bg-muted/20 text-muted" },
  B: { text: "B", cls: "bg-loss/15 text-loss" },
};

function FormRow({ label, form }: { label: string; form: NonNullable<MatchContext["homeForm"]> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
      <span className="min-w-[9rem] font-semibold">{label}</span>
      <span className="text-sm text-muted">
        {form.played} trận · {form.won}T {form.drawn}H {form.lost}B · ghi {form.goalsFor}, thủng {form.goalsAgainst}
      </span>
      <span className="flex gap-1">
        {form.recent.map((r, i) => (
          <span key={i} className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${RESULT_LABEL[r].cls}`}>
            {RESULT_LABEL[r].text}
          </span>
        ))}
      </span>
    </div>
  );
}

export function MatchFacts({ ctx, lang }: { ctx: MatchContext; lang: Lang }) {
  const kickoffVn = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(ctx.kickoffUtc));

  const played = ctx.homeScore !== null && ctx.awayScore !== null;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Giờ + sân — thứ người ta tìm nhiều nhất ở trận sắp đá */}
      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-lg font-bold">
          {played ? "Kết quả" : `${ctx.homeTeam} vs ${ctx.awayTeam} mấy giờ?`}
        </h2>
        <p className="mt-2 text-ink/90">
          {played ? (
            <>Chung cuộc <strong>{ctx.homeTeam} {ctx.homeScore}-{ctx.awayScore} {ctx.awayTeam}</strong>, đá lúc {kickoffVn} giờ Việt Nam{ctx.venue ? ` trên sân ${ctx.venue}` : ""}.</>
          ) : (
            <><strong>{ctx.homeTeam}</strong> gặp <strong>{ctx.awayTeam}</strong> lúc <strong>{kickoffVn}</strong> giờ Việt Nam{ctx.venue ? `, trên sân ${ctx.venue}` : ""}.</>
          )}
        </p>
      </section>

      {/* Vị trí trên bảng xếp hạng */}
      {(ctx.homeStanding || ctx.awayStanding) && (
        <section className="rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-lg font-bold">Vị trí trên bảng xếp hạng</h2>
          <div className="mt-3 flex flex-col divide-y divide-line">
            {[ctx.homeStanding, ctx.awayStanding].filter(Boolean).map((s) => (
              <div key={s!.team} className="flex flex-wrap items-center gap-x-3 py-2">
                <span className="min-w-[9rem] font-semibold">{s!.team}</span>
                <span className="text-sm text-muted">
                  hạng {s!.position}/{ctx.standingsSize} · {s!.points} điểm sau {s!.played} trận · hiệu số {s!.goalDiff > 0 ? "+" : ""}{s!.goalDiff}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phong độ */}
      {(ctx.homeForm || ctx.awayForm) && (
        <section className="rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-lg font-bold">Phong độ gần đây</h2>
          <p className="mt-1 text-xs text-muted">T = thắng · H = hòa · B = bại, tính từ các trận đã đá mùa này</p>
          <div className="mt-2 flex flex-col divide-y divide-line">
            {ctx.homeForm && <FormRow label={ctx.homeTeam} form={ctx.homeForm} />}
            {ctx.awayForm && <FormRow label={ctx.awayTeam} form={ctx.awayForm} />}
          </div>
        </section>
      )}

      {/* Đối đầu */}
      {ctx.h2h.length > 0 && (
        <section className="rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-lg font-bold">Lịch sử đối đầu</h2>
          <div className="mt-3 flex flex-col divide-y divide-line">
            {ctx.h2h.map((m, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-3 py-2 text-sm">
                <span className="min-w-[5.5rem] text-muted">{m.date}</span>
                <span>{m.homeTeam} <strong>{m.homeScore}-{m.awayScore}</strong> {m.awayTeam}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Các trận cùng vòng — vừa là dữ liệu thật, vừa nối trang trận với nhau
          để Google không phải bò từng trang rời rạc */}
      {ctx.sameRound.length > 0 && (
        <section className="rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-lg font-bold">
            {ctx.round ? `Các trận khác vòng ${ctx.round}` : "Các trận khác cùng vòng"}
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-line text-sm">
            {ctx.sameRound.map((m) => (
              <li key={m.slug} className="flex flex-wrap items-center gap-x-3 py-2">
                <span className="min-w-[5.5rem] text-muted">{m.kickoffUtc.slice(0, 10)}</span>
                <Link href={withLang(`/match/${m.slug}`, lang)} className="transition-colors hover:text-brand">
                  {m.homeTeam} <span className="text-muted">vs</span> {m.awayTeam}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Xác suất thị trường — chỉ số liệu, không tên nhà cái, không link, không mời chào */}
      {ctx.odds?.prob && (
        <section className="rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-lg font-bold">Thị trường đánh giá thế nào</h2>
          <p className="mt-1 text-xs text-muted">
            Xác suất suy ra từ tỷ lệ thị trường, đã loại phần chênh lệch của thị trường ({pct(ctx.odds.prob.margin)}). Chỉ mang tính tham khảo.
          </p>
          <div className="mt-3 flex flex-col divide-y divide-line text-sm">
            <div className="flex justify-between py-2"><span>{ctx.homeTeam} thắng</span><strong>{pct(ctx.odds.prob.home)}</strong></div>
            <div className="flex justify-between py-2"><span>Hòa</span><strong>{pct(ctx.odds.prob.draw)}</strong></div>
            <div className="flex justify-between py-2"><span>{ctx.awayTeam} thắng</span><strong>{pct(ctx.odds.prob.away)}</strong></div>
          </div>
        </section>
      )}
    </div>
  );
}
