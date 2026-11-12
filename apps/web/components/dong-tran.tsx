import Link from "next/link";
import { DoiLogo } from "@/components/doi-logo";
import { Keo1X2, PhongDoNho } from "@/components/phong-do-dong";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { getDict, withLang, type Lang } from "@/lib/i18n";

/**
 * MỘT dòng trận dùng chung trang chủ, /du-doan và trang trận (mẫu Peter duyệt 10/11).
 * Cả dòng là một link sang trang riêng của trận /du-doan/{slug}.
 * Điện thoại: giờ | giải + hai đội xếp dọc | ô tỷ số | ›.
 * Máy tính (lg): giờ (+giải) | đội nhà | ô tỷ số | đội khách | 1·X·2 | Tài/Xỉu | ›.
 * `phongDo` (bảng /du-doan, Peter gật 11/11): ô phong độ 5 trận dưới tên đội + 1·X·2 ở cả điện thoại
 *   (một hàng nhỏ dưới hai đội). Trang chủ / trang trận không bật → giữ nguyên dòng cũ.
 * Không dùng hook → gọi được từ trang server lẫn bảng client.
 */

const LOGO = "h-6 w-6 lg:h-[26px] lg:w-[26px]";
const O_KEO = "flex-1 rounded border py-1 text-center text-[13px] tabular-nums";
const DOC = "row-span-3 lg:row-span-1";

export function DongTran({ h, lang, hienGiai = false, phongDo = false }: { h: HangDuDoan; lang: Lang; hienGiai?: boolean; phongDo?: boolean }) {
  const t = getDict(lang).duDoan;
  // 0 = chủ nhà thắng, 1 = hòa, 2 = khách thắng (trùng thứ tự ô 1·X·2).
  const chieu = h.du ? (h.du[0] > h.du[1] ? 0 : h.du[0] === h.du[1] ? 1 : 2) : null;
  const chuDai = chieu === null ? "" : chieu === 1 ? t.draw : t.teamWins.replace("{team}", chieu === 0 ? h.nha : h.khach);
  const chuNgan = chieu === null ? "" : [t.homeSide, t.draw, t.awayShort][chieu];
  // Peter 13/11 "phong độ k đều": chỉ hiện khi CẢ HAI đội có phong độ, không để hàng lệch một bên.
  const coPhongDo = phongDo && !!h.formNha && !!h.formKhach;
  const keoDong = phongDo && h.mot !== null;
  const giaiDong = [hienGiai ? h.giai : null, h.coBai ? t.hasArticle.toLowerCase() : null].filter(Boolean).join(" · ");
  return (
    <Link
      href={withLang(`/du-doan/${h.slug}`, lang)}
      className={`grid min-h-[68px] grid-cols-[44px_minmax(0,1fr)_auto_12px] items-center gap-x-2.5 border-b border-line/60 px-0.5 py-2.5 transition-colors hover:bg-card-hover lg:min-h-[60px] lg:gap-x-3 lg:px-1.5 ${
        hienGiai ? "lg:grid-cols-[150px_minmax(0,1fr)_150px_minmax(0,1fr)_176px_78px_16px]" : "lg:grid-cols-[58px_minmax(0,1fr)_150px_minmax(0,1fr)_176px_78px_16px]"
      } ${h.coBai ? "bg-brand/[.06] pl-2 shadow-[inset_3px_0_var(--color-brand)]" : ""}`}
    >
      <div className={`col-start-1 row-start-1 min-w-0 ${DOC}`}>
        <p className="text-sm font-semibold tabular-nums lg:text-[15px]">{h.gio}</p>
        {hienGiai && <p className="hidden truncate text-[13px] text-muted lg:block">{h.giai}</p>}
      </div>
      {giaiDong && <p className="col-start-2 row-start-1 mb-1 truncate text-xs text-muted lg:hidden">{giaiDong}</p>}
      <div className="col-start-2 row-start-2 min-w-0 lg:row-start-1">
        <div className="flex min-w-0 items-center gap-2.5 lg:flex-row-reverse lg:text-right">
          <DoiLogo src={h.logoNha} ten={h.nha} lop={LOGO} />
          <span className="truncate text-[15px] font-semibold">{h.nha}</span>
        </div>
        {coPhongDo && h.formNha && (
          <div className="mt-1 flex pl-[34px] lg:justify-end lg:pl-0 lg:pr-9">
            <PhongDoNho kq={h.formNha} doi={h.nha} />
          </div>
        )}
      </div>
      <div className="col-start-2 row-start-3 mt-1 min-w-0 lg:col-start-4 lg:row-start-1 lg:mt-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <DoiLogo src={h.logoKhach} ten={h.khach} lop={LOGO} />
          <span className="truncate text-[15px] font-semibold">{h.khach}</span>
        </div>
        {coPhongDo && h.formKhach && (
          <div className="mt-1 flex pl-[34px] lg:pl-9">
            <PhongDoNho kq={h.formKhach} doi={h.khach} />
          </div>
        )}
      </div>
      {keoDong && (
        <div className="col-span-3 col-start-2 row-start-4 mt-1.5 lg:hidden">
          <Keo1X2 mot={h.mot!} chieu={chieu} />
        </div>
      )}
      <div className={`col-start-3 row-start-1 min-w-0 text-center ${DOC}`}>
        <span
          className={`inline-block min-w-[50px] rounded-md border-2 px-2 py-px font-display text-base font-bold tabular-nums lg:min-w-[58px] lg:px-3 lg:text-lg ${
            h.du ? "border-brand text-brand" : "border-line text-muted"
          }`}
        >
          {h.du ? `${h.du[0]}-${h.du[1]}` : "?"}
        </span>
        {h.that ? (
          <p className={`mt-0.5 whitespace-nowrap text-xs ${h.dung === null ? "text-muted" : h.dung ? "text-brand" : "text-loss"}`}>
            {t.result} {h.that[0]}-{h.that[1]}
            {h.dung !== null && ` · ${h.dung ? t.correct : t.wrong}`}
          </p>
        ) : (
          chieu !== null && (
            <p className="mt-0.5 text-xs text-muted">
              <span className="lg:hidden">{chuNgan}</span>
              <span className="hidden truncate lg:block">{chuDai}</span>
            </p>
          )
        )}
      </div>
      <div className="hidden lg:col-start-5 lg:row-start-1 lg:flex lg:gap-1" aria-label={h.mot ? "1·X·2" : undefined}>
        {h.mot && phongDo ? (
          <Keo1X2 mot={h.mot} chieu={chieu} />
        ) : h.mot
          ? h.mot.map((x, i) => (
              <span key={i} className={`${O_KEO} ${i === chieu ? "border-brand font-bold text-brand" : "border-line bg-card"}`}>
                {x.toFixed(2)}
              </span>
            ))
          : h.coBai && (
              <span className="mx-auto whitespace-nowrap rounded-full border border-brand/50 px-2.5 py-0.5 text-xs text-brand">{t.hasArticle}</span>
            )}
      </div>
      <span className="hidden whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-center text-xs lg:col-start-6 lg:row-start-1 lg:block">
        {h.taiXiu ?? "—"}
      </span>
      <span aria-hidden className={`col-start-4 row-start-1 text-right text-lg text-muted lg:col-start-7 ${DOC}`}>
        ›
      </span>
    </Link>
  );
}
