import Link from "next/link";
import { DoiLogo } from "@/components/doi-logo";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { cauHaiDoiGhi, giaiThichTaiXiu, thuVN } from "@/lib/du-doan-tran";
import { getDict, withLang, type Lang } from "@/lib/i18n";
import { mauKQ, type KQ } from "@/lib/phong-do";

/**
 * Các khối trên trang riêng một trận /du-doan/{slug} (mẫu Peter duyệt 10/11).
 * Khối nào thiếu số thì KHÔNG vẽ — không ô "chưa có số", không ô rỗng.
 */

const LOGO = "h-14 w-14 text-xl! lg:h-[72px] lg:w-[72px]";
const O = "rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";

/** 0 = chủ nhà thắng, 1 = hòa, 2 = khách thắng (trùng thứ tự ô 1·X·2). */
const chieuCua = (du: [number, number] | null) => (du ? (du[0] > du[1] ? 0 : du[0] === du[1] ? 1 : 2) : null);

function Doi({ ten, logo }: { ten: string; logo: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <DoiLogo src={logo} ten={ten} lop={LOGO} />
      <p className="max-w-full break-words font-display text-[15px] font-bold leading-tight lg:text-xl">{ten}</p>
    </div>
  );
}

/** Ô lớn đầu trang: giải, hai đội, tỷ số dự đoán, giờ đá; đá xong thêm tỷ số thật + ĐÚNG/SAI. */
export function TranHero({ h, lang, tacGia }: { h: HangDuDoan; lang: Lang; /** Byline bài nhận định, nếu trận có bài. */ tacGia: string | null }) {
  const t = getDict(lang).duDoan;
  const chieu = chieuCua(h.du);
  const ketLuan = chieu === null ? null : chieu === 1 ? t.draw : t.teamWins.replace("{team}", chieu === 0 ? h.nha : h.khach);
  const [y, m, d] = h.ngay.split("-").map(Number);
  const luc = [`${thuVN(h.ngay)} ${d}/${m}/${y}`, /^\d/.test(h.gio) ? `${h.gio} giờ Việt Nam` : null, h.san].filter(Boolean).join(" · ");
  const cham = h.dung === null ? null : h.dungTySo ? t.exactScore : h.dung ? t.correct : t.wrong;
  return (
    <section className="mt-4 rounded-card border border-brand/50 bg-brand/[.06] px-3 py-5 text-center lg:px-8 lg:py-7">
      <p className="text-xs font-semibold uppercase tracking-[.12em] text-brand">Dự đoán tỷ số · {h.giai}</p>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:gap-6">
        <Doi ten={h.nha} logo={h.logoNha} />
        <span
          className={`rounded-xl border-[3px] px-3.5 py-1 font-display text-[40px] font-bold leading-tight tabular-nums lg:px-7 lg:text-[56px] ${
            h.du ? "border-brand text-brand" : "border-line text-muted"
          }`}
        >
          {h.du ? `${h.du[0]}-${h.du[1]}` : "?"}
        </span>
        <Doi ten={h.khach} logo={h.logoKhach} />
      </div>
      {ketLuan && <p className="mt-3 font-display text-lg font-bold text-brand lg:text-xl">{ketLuan}</p>}
      <p className="mt-1 text-sm text-muted">{luc}</p>
      {h.that && (
        <p className="mt-4 border-t border-line pt-4 text-[15px]">
          Kết quả: <b className="font-display text-lg tabular-nums">{h.nha} {h.that[0]}-{h.that[1]} {h.khach}</b>
          {cham && (
            <span className={`ml-2.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${h.dung ? "border-brand text-brand" : "border-loss text-loss"}`}>
              {cham}
            </span>
          )}
        </p>
      )}
      {h.coBai && (
        <Link
          href={withLang(`/analysis/${h.slug}`, lang)}
          className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-brand px-4 font-display text-[15px] font-bold text-bg transition-colors hover:bg-brand-hover"
        >
          Đọc nhận định{tacGia ? ` của ${tacGia}` : ""} →
        </Link>
      )}
    </section>
  );
}

/** Ba ô số kèm theo: tỷ lệ 1·X·2 · tài/xỉu · cả hai đội ghi bàn. Ô nào thiếu số thì bỏ ô đó. */
export function TranBaO({ h, lang }: { h: HangDuDoan; lang: Lang }) {
  const t = getDict(lang).duDoan;
  const chieu = chieuCua(h.du);
  const tx = h.taiXiu ? giaiThichTaiXiu(h.taiXiu) : null;
  const ghi = cauHaiDoiGhi(h);
  if (!h.mot && !h.taiXiu && ghi === null) return null;
  const nhan = [t.teamWins.replace("{team}", h.nha), t.draw, t.teamWins.replace("{team}", h.khach)];
  // Điện thoại ô hẹp: nhãn ngắn (tên đội đã có ngay ô lớn phía trên) thay vì cắt chữ.
  const nhanNgan = [t.homeSide, t.draw, t.awayShort];
  return (
    <div className="mt-3 grid gap-3 lg:grid-flow-col lg:auto-cols-fr">
      {h.mot && (
        <section className={`${O} lg:col-span-2`}>
          <h2 className={NHAN}>Tỷ lệ 1 · X · 2</h2>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {h.mot.map((x, i) => (
              <p key={i} className={`min-w-0 rounded-lg border px-1.5 py-2 text-center ${i === chieu ? "border-brand" : "border-line"}`}>
                <span className="block text-xs leading-tight text-muted sm:hidden">{nhanNgan[i]}</span>
                <span className="hidden text-xs leading-tight text-muted sm:block">{nhan[i]}</span>
                <b className={`font-display text-xl tabular-nums ${i === chieu ? "text-brand" : ""}`}>{x.toFixed(2)}</b>
              </p>
            ))}
          </div>
        </section>
      )}
      {h.taiXiu && (
        <section className={O}>
          <h2 className={NHAN}>Tài / Xỉu</h2>
          <p className="mt-2 font-display text-2xl font-bold">{h.taiXiu}</p>
          {tx && <p className="mt-0.5 text-sm text-muted">{tx}</p>}
        </section>
      )}
      {ghi !== null && (
        <section className={O}>
          <h2 className={NHAN}>Cả hai đội ghi bàn</h2>
          <p className="mt-2 font-display text-2xl font-bold">{h.haiDoiGhi ? "Có" : "Không"}</p>
          <p className="mt-0.5 text-sm text-muted">dự đoán {ghi}</p>
        </section>
      )}
    </div>
  );
}

/** Dải T/H/B: TRÁI = trận cũ nhất, PHẢI = trận mới nhất (quy ước chung cả site). */
export function DaiPhongDo({ kq, nhan }: { kq: readonly KQ[]; nhan: string }) {
  return (
    <span className="flex shrink-0 gap-1" role="img" aria-label={`${nhan}: ${kq.join(" ")} (cũ nhất trước)`}>
      {kq.map((k, i) => (
        <span key={i} aria-hidden className={`inline-flex h-6 w-6 items-center justify-center rounded border font-display text-xs font-bold leading-none ${mauKQ(k)}`}>
          {k}
        </span>
      ))}
    </span>
  );
}

/** Phong độ 5 trận của hai đội — chỉ hiện khi CẢ HAI đội có số. */
export function TranPhongDo({ h, lang }: { h: HangDuDoan; lang: Lang }) {
  const t = getDict(lang).duDoan;
  if (!h.formNha || !h.formKhach) return null;
  const doi: [string, KQ[]][] = [[h.nha, h.formNha], [h.khach, h.formKhach]];
  return (
    <section className={`mt-3 ${O}`}>
      <h2 className={NHAN}>{t.form}</h2>
      <ul className="mt-2.5 space-y-2">
        {doi.map(([ten, kq]) => (
          <li key={ten} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-semibold">{ten}</span>
            <DaiPhongDo kq={kq} nhan={`${t.form} ${ten}`} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">T thắng · H hòa · B thua. Ô bên phải là trận gần đây nhất.</p>
    </section>
  );
}

