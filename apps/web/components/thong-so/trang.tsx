import type { Metadata } from "next";
import Link from "next/link";
import { FaqHub, type CauHoiHub } from "@/components/giai-hub/faq";
import { OG_VERSION } from "@/lib/brand";
import { GIAI_TRANG } from "@/lib/du-doan-loc";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { CHI_SO, NHOM, xepChiSo, type Nhom } from "@/lib/chi-so-doi";
import { tepXgDoi, xepTheoChenh, type GiaiXg } from "@/lib/xg-doi";
import { ChipGiai, KhungTrang } from "./khung";
import { TheChiSo } from "./the-chi-so";

/** Trang /thong-so, /thong-so/{giai} (Peter giao 15/11; 16/11 gật mẫu chia nhóm kiểu FotMob). /form ở trang-form.tsx. */

const so = (x: number) => x.toFixed(2);

export function meta(duong: string, title: string, description: string, lang: Lang): Metadata {
  return {
    title,
    description,
    alternates: buildAlternates(duong, lang),
    openGraph: { locale: "vi_VN", title: `${title} | banhbong.net`, description, images: [{ url: `/api/og/editorial?title=${encodeURIComponent(title)}&v=${OG_VERSION}`, width: 1200, height: 630 }] },
  };
}

/** Link sang trang dự đoán / BXH của giải nếu web có. */
export function LinkGiai({ g, lang }: { g: GiaiXg; lang: Lang }) {
  const t = GIAI_TRANG.find((x) => x.slug === g.slug);
  if (!t) return null;
  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      <Link href={withLang(`/du-doan/${t.slug}`, lang)} className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Dự đoán {t.ten} vòng tới ›</Link>
      {t.bxh && <Link href={withLang(`/competitions/${t.bxh}`, lang)} className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Bảng xếp hạng {t.ten} ›</Link>}
    </p>
  );
}

// ---------- /thong-so ----------

/** Hàng chip nhảy tới từng nhóm (neo trong trang, không tách URL). */
function ChipNhom() {
  return (
    <nav aria-label="Nhóm chỉ số" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {NHOM.map((n) => (
        <a key={n.id} href={`#nhom-${n.id}`} className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-line px-4 text-sm font-semibold text-muted transition-[background-color,transform] duration-150 active:scale-[0.97] active:bg-card-hover">
          {n.ten}
        </a>
      ))}
    </nav>
  );
}

function NhomChiSo({ nhom, ten, g }: { nhom: Nhom; ten: string; g: GiaiXg }) {
  const ds = CHI_SO.filter((c) => c.nhom === nhom);
  return (
    <section id={`nhom-${nhom}`} aria-labelledby={`nhom-${nhom}-h`} className="scroll-mt-24">
      <h2 id={`nhom-${nhom}-h`} className="font-display text-xl font-bold">{ten}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{ds.map((c) => <TheChiSo key={c.id} c={c} ds={g.doi} />)}</div>
    </section>
  );
}

export const metaThongSo = (lang: Lang) =>
  meta("/thong-so", "Thông số các đội bóng châu Âu mùa này: xG, bàn thắng, sạch lưới", `xG, xGA, chênh lệch xG, bàn thắng, giữ sạch lưới, tỷ lệ Over 2.5 và cả 2 đội ghi bàn của từng đội ở ${tepXgDoi().giai.length} giải vô địch: Ngoại hạng Anh, La Liga, Serie A, Bundesliga, Ligue 1 và hơn nữa.`, lang);

export function TrangThongSo({ lang }: { lang: Lang }) {
  const tep = tepXgDoi();
  const soDoi = tep.giai.reduce((a, g) => a + g.doi.length, 0);
  return (
    <KhungTrang
      duong={[{ ten: "Thông số", url: "/thong-so" }]}
      h1="Thông số các đội bóng"
      mo={<p>{`xG (bàn thắng kỳ vọng) cho biết một đội tạo ra cơ hội tốt đến đâu, không phụ thuộc may rủi lúc dứt điểm. Trang này theo dõi ${soDoi} đội ở ${tep.giai.length} giải. Dưới đây là đội dẫn đầu từng giải; chọn một giải để xem đủ các nhóm chỉ số: tấn công, phòng ngự, bàn thắng, kiểm soát bóng.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/thong-so" giai={tep.giai} dang={null} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {tep.giai.map((g) => {
          const dong = [
            { nhan: "Chênh lệch xG", c: CHI_SO.find((c) => c.id === "chenh-xg") },
            { nhan: "xG mỗi trận", c: CHI_SO.find((c) => c.id === "xg") },
            { nhan: "xGA thấp nhất", c: CHI_SO.find((c) => c.id === "xga") },
          ].map((x) => ({ nhan: x.nhan, dau: x.c ? xepChiSo(x.c, g.doi)[0] : undefined }));
          return (
            <li key={g.slug} className="rounded-card border border-line bg-card">
              <h2 className="px-3.5 pt-3 text-[15px] font-bold">{g.ten}</h2>
              <dl className="px-3.5 py-1.5">
                {dong.map((x) => x.dau && (
                  <div key={x.nhan} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                    <dt className="text-muted">{x.nhan}</dt>
                    <dd className="min-w-0 truncate text-right"><span className="font-semibold">{x.dau.doi.ten}</span> <span className="font-display font-bold tabular-nums text-brand">{x.dau.chu}</span></dd>
                  </div>
                ))}
              </dl>
              <Link href={withLang(`/thong-so/${g.slug}`, lang)} className="flex min-h-11 items-center justify-center border-t border-line text-sm font-semibold text-brand active:bg-card-hover">
                Xem đủ thông số {g.ten} ›
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">Chênh = xG trừ xGA mỗi trận. Nội dung mang tính tham khảo.</p>
    </KhungTrang>
  );
}

function faqThongSo(g: GiaiXg): CauHoiHub[] {
  const ds = xepTheoChenh(g.doi);
  const xg = [...g.doi].sort((a, b) => b.xg - a.xg)[0];
  const xga = [...g.doi].sort((a, b) => a.xga - b.xga)[0];
  const may = [...g.doi].sort((a, b) => b.bt - b.xg - (a.bt - a.xg))[0];
  return [
    { hoi: `Đội nào tạo ra nhiều cơ hội nhất ${g.ten}?`, dap: `${xg.ten} có xG cao nhất giải: ${so(xg.xg)} mỗi trận sau ${xg.tran} trận. Xét cả công lẫn thủ, ${ds[0].ten} dẫn đầu với chênh lệch xG ${so(ds[0].chenh)} mỗi trận.` },
    { hoi: `Hàng thủ nào chắc nhất ${g.ten} theo xG?`, dap: `${xga.ten} để đối thủ tạo ra ít cơ hội nhất: xGA ${so(xga.xga)} mỗi trận, thực tế thủng lưới ${so(xga.bb)} bàn mỗi trận.` },
    { hoi: `Đội nào ghi bàn vượt xG nhiều nhất ${g.ten}?`, dap: `${may.ten} ghi ${so(may.bt)} bàn mỗi trận trong khi xG chỉ ${so(may.xg)}, tức hơn ${so(may.bt - may.xg)} bàn mỗi trận. Khoảng chênh lớn thường không giữ được lâu.` },
  ];
}

export const metaThongSoGiai = (g: GiaiXg, lang: Lang) =>
  meta(`/thong-so/${g.slug}`, `Thông số ${g.ten}: xG, bàn thắng, sạch lưới từng đội`, `Thông số ${g.doi.length} đội ${g.ten} chia nhóm: chênh lệch xG, xG và xGA mỗi trận, bàn thắng so với xG, sút trúng đích, giữ sạch lưới, tỷ lệ Over 2.5, cả 2 đội ghi bàn, kiểm soát bóng. Cập nhật hằng ngày.`, lang);

export function TrangThongSoGiai({ g, lang }: { g: GiaiXg; lang: Lang }) {
  const tep = tepXgDoi();
  const top = xepTheoChenh(g.doi)[0];
  return (
    <KhungTrang
      duong={[{ ten: "Thông số", url: "/thong-so" }, { ten: g.ten, url: `/thong-so/${g.slug}` }]}
      h1={`Thông số ${g.ten}`}
      mo={<p>{`Thông số của ${g.doi.length} đội ${g.ten} mùa này, chia theo nhóm. ${top.ten} đang áp đảo nhất: tạo ${so(top.xg)} xG và chỉ để đối thủ tạo ${so(top.xga)} xG mỗi trận. Mỗi thẻ hiện 3 đội dẫn đầu, bấm "Xem đủ" để thấy cả giải.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/thong-so" giai={tep.giai} dang={g.slug} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      <ChipNhom />
      {NHOM.map((n) => <NhomChiSo key={n.id} nhom={n.id} ten={n.ten} g={g} />)}
      <LinkGiai g={g} lang={lang} />
      <section aria-labelledby="hoi-dap-h">
        <h2 id="hoi-dap-h" className="font-display text-xl font-bold">Hỏi đáp thông số {g.ten}</h2>
        <div className="mt-3"><FaqHub ds={faqThongSo(g)} /></div>
      </section>
      <p className="text-xs text-muted">Sạch lưới, Over 2.5 và cả 2 đội ghi bàn đếm trên tối đa 20 trận giải gần nhất của mỗi đội. Nội dung mang tính tham khảo.</p>
    </KhungTrang>
  );
}
