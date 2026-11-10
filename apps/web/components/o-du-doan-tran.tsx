import Link from "next/link";
import { DoiLogo } from "@/components/doi-logo";
import { OPhongDo } from "@/components/phong-do";
import { cauKetQua, type HangDuDoan } from "@/lib/du-doan-hang";
import { chieuDuDoan, mauChieu } from "@/lib/phong-do";
import { getDict, withLang, type Lang } from "@/lib/i18n";

/** "T4 11/11" theo giờ VN. */
function thuNgay(iso: string): string {
  const p = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(new Date(iso));
  const lay = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${lay("weekday")} ${lay("day")}/${lay("month")}`;
}

function Doi({ ten, logo }: { ten: string; logo: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <DoiLogo src={logo} ten={ten} size={40} />
      <span className="font-display text-xs font-bold leading-tight sm:text-sm">{ten}</span>
    </div>
  );
}

function CauThu({ src, ten, ben }: { src: string | null; ten: string; ben: "trai" | "phai" }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh nền trong, cắt sát mép thẻ
    <img
      src={src}
      alt={ten}
      width={480}
      height={660}
      className={`pointer-events-none absolute bottom-0 h-[85%] w-auto max-w-[24%] object-contain object-bottom ${ben === "trai" ? "left-0" : "right-0"}`}
    />
  );
}

/**
 * Ô dự đoán lớn (đầu bài phân tích + trận nổi bật trang chủ): tỷ số to, logo hai
 * đội, giờ VN. Có ảnh cầu thủ thì đứng hai mép (trái nhà, phải khách); thiếu ảnh
 * thì chỉ logo, không chừa ô trống.
 */
export function ODuDoanTran({ h, lang, lienKet = false }: { h: HangDuDoan; lang: Lang; lienKet?: boolean }) {
  const t = getDict(lang).duDoan;
  const coAnh = Boolean(h.anhNha || h.anhKhach);
  const than = (
    <div className="relative overflow-hidden rounded-card border border-brand/40 bg-gradient-to-b from-brand/15 to-card shadow-card">
      <p className="relative px-4 pt-4 text-center font-display text-[11px] font-bold uppercase tracking-wider text-brand">
        {t.label} · {h.giai}
      </p>
      <div className="relative">
      <CauThu src={h.anhNha} ten={h.nha} ben="trai" />
      <CauThu src={h.anhKhach} ten={h.khach} ben="phai" />
      <div className={`relative pb-5 pt-3 ${coAnh ? "px-[22%]" : "px-5"}`}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Doi ten={h.nha} logo={h.logoNha} />
          <p
            className={`rounded-lg border-2 bg-card/60 px-3 py-1 font-display text-4xl font-bold tabular-nums sm:text-5xl ${h.du ? mauChieu(chieuDuDoan(h.du)) : "border-line"}`}
          >
            {h.du ? `${h.du[0]}-${h.du[1]}` : "?"}
          </p>
          <Doi ten={h.khach} logo={h.logoKhach} />
        </div>
        {(h.formNha || h.formKhach) && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span>{h.formNha && <OPhongDo kq={h.formNha} nhan={`${t.form} · ${h.nha}`} />}</span>
            <span>{h.formKhach && <OPhongDo kq={h.formKhach} nhan={`${t.form} · ${h.khach}`} />}</span>
          </div>
        )}
        {h.du && (
          <p className={`mt-2 text-center text-sm font-semibold ${mauChieu(chieuDuDoan(h.du)).split(" ")[1]}`}>
            {cauKetQua(h, t.win, t.draw)}
          </p>
        )}
        <p className="mt-1 text-center text-xs text-muted">
          {h.gio} · {thuNgay(h.kickoffUtc)}
        </p>
        {h.that && (
          <p className="mt-2 text-center text-xs">
            {h.that[0]}-{h.that[1]} ·{" "}
            <span className={h.dung ? "font-bold text-brand" : "font-bold text-loss"}>{h.dung ? t.correct : t.wrong}</span>
          </p>
        )}
      </div>
      </div>
    </div>
  );
  return (
    <div>
      {lienKet ? (
        <Link href={withLang(`/analysis/${h.slug}`, lang)} className="block transition-opacity hover:opacity-90">
          {than}
        </Link>
      ) : (
        than
      )}
      {coAnh && h.creditAnh && <p className="mt-1 text-right text-[10px] text-muted/70">{h.creditAnh}</p>}
    </div>
  );
}
