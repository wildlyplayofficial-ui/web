"use client";

import Link from "next/link";
import { useState } from "react";
import { DoiLogo } from "@/components/doi-logo";
import type { HangDuDoan, NhanTran } from "@/lib/du-doan-hang";
import { chieuDuDoan, type KQ } from "@/lib/phong-do";
import { getDict, withLang, type Lang } from "@/lib/i18n";

/**
 * Danh sách dự đoán bố cục PredictZ bản điện thoại (đo từng ô bằng reanimate 10/11/2026,
 * /tmp/reanim/predictz): hàng nút ngày cuộn ngang → ô chọn giải → h1 → khối giải
 * (cờ + "Dự đoán {giải}") → mỗi trận: đội nhà, 5 ô phong độ, ô dự đoán 200×40,
 * nút XEM NHẬN ĐỊNH (chỉ khi có bài), đội khách, 5 ô phong độ. Có dòng tỷ lệ 1·X·2, không quảng cáo.
 */

const lechNgay = (khoa: string, n: number) =>
  new Date(Date.parse(`${khoa}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Thứ viết tay (Intl của Node và trình duyệt ra chữ khác nhau → lỗi hydrate). */
const THU = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const thu = (khoa: string) => THU[new Date(`${khoa}T00:00:00Z`).getUTCDay()];
const ddmm = (khoa: string) => `${khoa.slice(8, 10)}/${khoa.slice(5, 7)}`;

/** Tên nước đứng đầu tên giải ("England League One") → cờ. Bắc Ireland xét trước Anh. */
const NUOC_GIAI: [RegExp, string][] = [
  [/^northern ireland/, "gb-nir"], [/^scotland/, "gb-sct"], [/^wales/, "gb-wls"], [/^england/, "gb-eng"],
  [/^germany/, "de"], [/^italy/, "it"], [/^spain/, "es"], [/^france/, "fr"], [/^brazil/, "br"], [/^colombia/, "co"],
  [/^algeria/, "dz"], [/^india/, "in"], [/^montenegro/, "me"], [/^serbia/, "rs"], [/^slovenia/, "si"],
  [/^uganda/, "ug"], [/^ukraine/, "ua"], [/^uruguay/, "uy"], [/^uefa|nations league|euro/, "eu"],
];

/** Cờ tròn đầu khối giải: theo tên giải, không đoán được thì logo đội nhà trận đầu. */
function coGiai(giai: string, dau: HangDuDoan): string | null {
  const g = giai.toLowerCase();
  const nuoc = NUOC_GIAI.find(([re]) => re.test(g));
  if (nuoc) return `https://flagcdn.com/w40/${nuoc[1]}.png`;
  if (/premier league|ngoại hạng anh|fa cup|championship/.test(g)) return "https://flagcdn.com/w40/gb-eng.png";
  if (/v-league|vtv cup|casper|việt nam|vietnam|aff/.test(g)) return "https://flagcdn.com/w40/vn.png";
  if (/la liga|laliga/.test(g)) return "https://flagcdn.com/w40/es.png";
  if (/serie a/.test(g)) return "https://flagcdn.com/w40/it.png";
  if (/bundesliga/.test(g)) return "https://flagcdn.com/w40/de.png";
  if (/ligue 1/.test(g)) return "https://flagcdn.com/w40/fr.png";
  return dau.logoNha;
}

const NHAN: Record<NhanTran, { chu: string; mau: string }> = {
  vn: { chu: "Tuyển Việt Nam", mau: "border-[#ff4d4f] bg-[#ff4d4f]/10 text-[#ff8a8c]" },
  hot: { chu: "Trận hot", mau: "border-[#ffb547] bg-[#ffb547]/10 text-[#ffc670]" },
  nguocKeo: { chu: "Dự đoán ngược kèo", mau: "border-[#8fa7ff] bg-[#8fa7ff]/10 text-[#b4c4ff]" },
};

/** Câu dự đoán cho đoạn tóm tắt: "Belgium thắng 2-1" / "hòa 1-1". */
function cauNgan(h: HangDuDoan): string {
  if (!h.du) return "";
  const [a, b] = h.du;
  if (a === b) return `hòa ${a}\u2011${b}`;
  return a > b ? `${h.nha} thắng ${a}\u2011${b}` : `${h.khach} thắng ${b}\u2011${a}`;
}

/**
 * Đoạn tóm tắt đầu ngày (cho người đọc lướt + AI trích): số trận, số giải, chia kết quả dự đoán,
 * và tối đa 3 trận đáng chú ý (tuyển VN → giải lớn → ngược kèo).
 */
function TomTat({ ds, ngay }: { ds: HangDuDoan[]; ngay: string }) {
  if (ds.length === 0) return null;
  const giai = new Set(ds.map((h) => h.giai)).size;
  const co = ds.filter((h) => h.du);
  const hoa = co.filter((h) => h.du![0] === h.du![1]).length;
  const nha = co.filter((h) => h.du![0] > h.du![1]).length;
  const diem = (h: HangDuDoan) => (h.nhan.includes("vn") ? 4 : 0) + (h.nhan.includes("hot") ? 2 : 0) + (h.nhan.includes("nguocKeo") ? 1 : 0);
  const noiBat = co.filter((h) => diem(h) > 0).sort((a, b) => diem(b) - diem(a)).slice(0, 3);
  const [y, m, d] = ngay.split("-");
  return (
    <div className="mx-auto mb-5 w-[96%] rounded-md border border-line bg-card px-4 py-3 text-left text-sm leading-[22px]">
      <p>
        <strong>Dự đoán bóng đá {thu(ngay)} {d}/{m}/{y}</strong>: banhbong.net có <strong>{ds.length} trận</strong> ở{" "}
        <strong>{giai} giải</strong>. Trong đó {nha} trận chọn chủ nhà thắng, {hoa} trận hòa, {co.length - nha - hoa} trận
        chọn đội khách thắng.
      </p>
      {noiBat.length > 0 && (
        <p className="mt-2">
          Đáng chú ý:{" "}
          {noiBat.map((h, i) => (
            <span key={h.slug}>
              {i > 0 && "; "}
              <strong>{h.nha} vs {h.khach}</strong> ({h.giai}
              {h.gio !== "--:--" && `, ${h.gio}`}): dự đoán {cauNgan(h)}
            </span>
          ))}
          .
        </p>
      )}
    </div>
  );
}

const MAU_KQ: Record<KQ, string> = {
  T: "border-[#00e676] text-[#00e676]",
  H: "border-[#ffdb75] text-[#ffdb75]",
  B: "border-[#ff669b] text-[#ff669b]",
};

function PhongDo({ kq, nhan }: { kq: KQ[] | null; nhan: string }) {
  // Không có dữ liệu vẫn giữ chỗ 27px để các trận thẳng hàng như PredictZ.
  return (
    <div className="h-[27px] pt-2.5">
      {kq && (
        <div className="mx-auto flex h-5 w-[130px] gap-[5px]" aria-label={`${nhan}: ${kq.join(" ")}`}>
          {kq.map((k, i) => (
            <span key={i} className={`box-content h-4 w-4 rounded-[5px] border-2 text-center text-[13px] leading-4 ${MAU_KQ[k]}`}>
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Doi({ ten, logo }: { ten: string; logo: string | null }) {
  return (
    <div className="flex h-7 items-center justify-center gap-2 text-lg leading-7">
      <DoiLogo src={logo} ten={ten} size={20} />
      <span className="truncate">{ten}</span>
    </div>
  );
}

function Tran({ h, lang }: { h: HangDuDoan; lang: Lang }) {
  const t = getDict(lang).duDoan;
  const c = h.du ? chieuDuDoan(h.du) : null;
  // Ô dự đoán một màu riêng (xanh thương hiệu), không mượn màu T/H/B của phong độ —
  // trước đây đội khách thắng ra viền hồng = "Thua" trong chú thích (Jane 10/11).
  const mau = c ? "border-[#00e676] text-[#00e676] bg-[#00e676]/[.06]" : "border-line text-muted";
  // Ghi rõ đội thắng ("U23 Việt Nam thắng 2-1") thay vì "Nhà/Khách" — góp ý Jane 10/11.
  const nhanDu = c === "hoa" ? t.draw : c ? t.teamWins.replace("{team}", c === "nha" ? h.nha : h.khach) : "";
  return (
    <article className="relative border-b border-[#2c3a46] py-2 text-center">
      <div className="absolute left-0 top-2 text-xs leading-7 tracking-wide text-muted">
        {h.gio} · {ddmm(h.ngay)}
      </div>
      <Doi ten={h.nha} logo={h.logoNha} />
      <PhongDo kq={h.formNha} nhan={t.form} />
      {h.nhan.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {h.nhan.map((n) => (
            <span key={n} className={`rounded-full border px-2 py-px text-[11px] leading-4 ${NHAN[n].mau}`}>{NHAN[n].chu}</span>
          ))}
        </div>
      )}
      <div className="py-2.5">
        <div className={`inline-block min-h-10 min-w-[200px] max-w-full rounded-[5px] border-2 px-3 py-[5px] text-base leading-[26px] tabular-nums ${mau}`}>
          {/* Đội khách thắng thì ghi số bàn đội thắng trước: "U23 Việt Nam thắng 2-0". */}
          {h.du ? `${nhanDu} ${c === "khach" ? `${h.du[1]}-${h.du[0]}` : `${h.du[0]}-${h.du[1]}`}` : "–"}
        </div>
        {h.that && (
          <p className={`mt-1 text-xs ${h.dung === null ? "text-muted" : h.dung ? "text-[#00e676]" : "text-[#ff669b]"}`}>
            {t.result} {h.that[0]}-{h.that[1]}
            {h.dung !== null && (h.dung ? ` · ✓ ${t.correct}` : ` · ✗ ${t.wrong}`)}
            {h.dungTySo && ` · ${t.exactScore}`}
          </p>
        )}
        {h.mot && (
          <p className="mt-1.5 text-xs tabular-nums text-muted" aria-label="Tỷ lệ 1 X 2">
            1: {h.mot[0].toFixed(2)} · X: {h.mot[1].toFixed(2)} · 2: {h.mot[2].toFixed(2)}
          </p>
        )}
        {h.coBai && (
        <div className="my-2.5 h-[25px]">
          <Link
            href={withLang(`/analysis/${h.slug}`, lang)}
            className="inline-block rounded-md border border-muted px-[15px] py-[3px] text-xs uppercase leading-[19px] text-muted hover:border-ink hover:text-ink"
          >
            {t.preview}
          </Link>
        </div>
        )}
      </div>
      <Doi ten={h.khach} logo={h.logoKhach} />
      <PhongDo kq={h.formKhach} nhan={t.form} />
    </article>
  );
}

const NUT = "shrink-0 whitespace-nowrap rounded-md border px-3 py-[3px] text-center text-sm leading-[22px]";

export function DuDoanPZ({
  rows,
  homNay,
  lang,
  tieuDe,
}: {
  rows: HangDuDoan[];
  homNay: string;
  lang: Lang;
  /** h1 dựng ở server (ngày giờ VN) để HTML server và client trùng nhau. */
  tieuDe: string;
}) {
  const t = getDict(lang).duDoan;
  const coDuLieu = new Set(rows.map((r) => r.ngay));
  // Hôm qua (xem chấm đúng/sai) + hôm nay + 4 ngày tới, như hàng nút ngày PredictZ.
  const ngays = [-1, 0, 1, 2, 3, 4].map((n) => lechNgay(homNay, n));
  const macDinh = coDuLieu.has(homNay) ? homNay : ngays.find((n) => n > homNay && coDuLieu.has(n)) ?? homNay;
  const [ngay, setNgay] = useState(macDinh);
  const [giai, setGiai] = useState("");

  const trongNgay = rows.filter((r) => r.ngay === ngay).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  const cacGiai = [...new Set(trongNgay.map((r) => r.giai))];
  const nhom = cacGiai.filter((g) => !giai || g === giai).map((g) => [g, trongNgay.filter((r) => r.giai === g)] as const);
  const nhan = (n: string) =>
    n === homNay ? `${t.today} (${ddmm(n)})` : n === lechNgay(homNay, 1) ? `${t.tomorrow} (${ddmm(n)})`
      : n === lechNgay(homNay, -1) ? `${t.yesterday} (${ddmm(n)})` : `${thu(n)} (${ddmm(n)})`;

  return (
    <div className="text-center">
      {/* 1 hàng cuộn ngang thay 6 nút xếp dọc (ăn nửa màn điện thoại) — góp ý Jane 10/11. */}
      <div className="-mx-1 my-2.5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {ngays.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === ngay}
            onClick={() => { setNgay(n); setGiai(""); }}
            className={`${NUT} ${n === ngay ? "border-ink text-ink" : "border-muted text-muted hover:text-ink"}`}
          >
            {nhan(n)}
            {coDuLieu.has(n) && n !== ngay && <span className="ml-1 text-[#00e676]">•</span>}
          </button>
        ))}
      </div>
      <div className="mb-2.5 mt-5">
        <select
          aria-label="Chọn giải đấu"
          value={giai}
          onChange={(e) => setGiai(e.target.value)}
          className="h-[39px] w-[337px] max-w-full border border-line bg-card px-2.5 text-[13px] text-ink"
        >
          <option value="">Chọn giải đấu để xem dự đoán</option>
          {cacGiai.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <h1 className="mb-2.5 ml-2.5 mt-5 text-left font-display text-[30px] leading-[47px]">
        {ngay === homNay ? tieuDe : `Dự đoán bóng đá ${thu(ngay)}, ngày ${Number(ngay.slice(8))} tháng ${Number(ngay.slice(5, 7))} năm ${ngay.slice(0, 4)}`}
      </h1>
      <div className="mb-5 pl-2.5 text-left text-sm leading-[22px]">
        <p className="p-2.5">
          Toàn bộ <strong>dự đoán bóng đá hôm nay</strong> và tối nay của banhbong.net, giờ Việt Nam.
        </p>
        <p className="p-2.5">
          Mỗi trận có <strong>tỷ số dự đoán</strong>, <strong>phong độ 5 trận gần nhất</strong> của hai đội và tỷ lệ
          1·X·2. Trận có bài <strong>nhận định</strong> thì bấm xem chi tiết; đá xong, ô kết quả cho biết dự đoán đúng hay sai.
        </p>
        <p className="p-2.5">Ký hiệu phong độ 5 trận:</p>
        <div className="flex items-center">
          {(["T", "H", "B"] as KQ[]).map((k, i) => (
            <span key={k} className="flex items-center">
              <span className={`ml-2.5 mr-[5px] box-content h-[22px] w-[22px] rounded-[5px] border-2 text-center text-base leading-[22px] ${MAU_KQ[k]}`}>{k}</span>
              {["Thắng", "Hòa", "Thua"][i]}
            </span>
          ))}
        </div>
      </div>

      <TomTat ds={trongNgay} ngay={ngay} />
      {nhom.length === 0 ? (
        <p className="mx-auto w-[96%] border-y border-line py-6 text-sm text-muted">{t.empty}</p>
      ) : (
        nhom.map(([g, ds]) => (
          <section key={g} className="mx-auto mb-[30px] w-[96%] text-left">
            <div className="flex items-center border-b border-ink py-2">
              <span className="mr-2.5 inline-block h-5 w-5 shrink-0 overflow-hidden rounded-full [&_img]:object-cover">
                <DoiLogo src={coGiai(g, ds[0])} ten={g} size={20} />
              </span>
              <h2 className="ml-2.5 font-display text-[22px] leading-[35px]">Dự đoán {g} ngày {ddmm(ngay)}</h2>
            </div>
            {ds.map((h) => (
              <Tran key={h.slug} h={h} lang={lang} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
