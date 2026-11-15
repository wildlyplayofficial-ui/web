import type { Metadata } from "next";
import Link from "next/link";
import { FaqHub, type CauHoiHub } from "@/components/giai-hub/faq";
import { OG_VERSION } from "@/lib/brand";
import { GIAI_TRANG } from "@/lib/du-doan-loc";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { dongFormGiai, tepXgDoi, xepTheoChenh, type GiaiXg } from "@/lib/xg-doi";
import { BangFormGiai, LuoiBangXep } from "./bang-form";
import { BangXg } from "./bang-xg";
import { ChipGiai, KhungTrang } from "./khung";

/** Trang /thong-so, /thong-so/{giai}, /form, /form/{giai} (Peter giao 15/11, mẫu Statistics + Form của PredictZ, thêm xG). */

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
function LinkGiai({ g, lang }: { g: GiaiXg; lang: Lang }) {
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

export const metaThongSo = (lang: Lang) =>
  meta("/thong-so", "Thông số xG các đội bóng châu Âu mùa này", `xG, xGA, chênh lệch xG, bàn thắng mỗi trận, sút trúng đích và kiểm soát bóng của từng đội ở ${tepXgDoi().giai.length} giải vô địch: Ngoại hạng Anh, La Liga, Serie A, Bundesliga, Ligue 1 và hơn nữa.`, lang);

export function TrangThongSo({ lang }: { lang: Lang }) {
  const tep = tepXgDoi();
  const soDoi = tep.giai.reduce((a, g) => a + g.doi.length, 0);
  return (
    <KhungTrang
      duong={[{ ten: "Thông số", url: "/thong-so" }]}
      h1="Thông số xG các đội bóng"
      mo={<p>{`xG (bàn thắng kỳ vọng) cho biết một đội tạo ra cơ hội tốt đến đâu, không phụ thuộc may rủi lúc dứt điểm. Trang này theo dõi ${soDoi} đội ở ${tep.giai.length} giải: xG và xGA mỗi trận, chênh lệch xG, số bàn thật so với xG, sút trúng đích và kiểm soát bóng. Mỗi giải xếp theo chênh lệch xG, đội đứng trên là đội áp đảo đối thủ nhiều nhất.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/thong-so" giai={tep.giai} dang={null} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      {tep.giai.map((g) => <BangXg key={g.slug} g={g} lang={lang} link />)}
      <p className="text-xs text-muted">Chênh = xG trừ xGA mỗi trận. Số trong ngoặc ở cột bàn thắng: bàn thật nhiều (xanh) hay ít (hồng) hơn xG. Nội dung mang tính tham khảo.</p>
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
  meta(`/thong-so/${g.slug}`, `Thông số xG ${g.ten}: xG, xGA từng đội mùa này`, `Bảng xG ${g.ten} cho cả ${g.doi.length} đội: xG và xGA mỗi trận, chênh lệch xG, bàn thắng so với xG, sút trúng đích, kiểm soát bóng. Nguồn FotMob, cập nhật hằng ngày.`, lang);

export function TrangThongSoGiai({ g, lang }: { g: GiaiXg; lang: Lang }) {
  const tep = tepXgDoi();
  const top = xepTheoChenh(g.doi)[0];
  return (
    <KhungTrang
      duong={[{ ten: "Thông số", url: "/thong-so" }, { ten: g.ten, url: `/thong-so/${g.slug}` }]}
      h1={`Thông số xG ${g.ten}`}
      mo={<p>{`Bảng xG của ${g.doi.length} đội ${g.ten} mùa này, xếp theo chênh lệch xG mỗi trận. ${top.ten} đang đứng đầu: tạo ${so(top.xg)} xG và chỉ để đối thủ tạo ${so(top.xga)} xG mỗi trận.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/thong-so" giai={tep.giai} dang={g.slug} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      <BangXg g={g} lang={lang} tieuDe={false} />
      <LinkGiai g={g} lang={lang} />
      <section aria-labelledby="hoi-dap-h">
        <h2 id="hoi-dap-h" className="font-display text-xl font-bold">Hỏi đáp xG {g.ten}</h2>
        <div className="mt-3"><FaqHub ds={faqThongSo(g)} /></div>
      </section>
    </KhungTrang>
  );
}

// ---------- /form ----------

export const metaForm = (lang: Lang) =>
  meta("/form", "Phong độ các đội bóng: bảng form 5 trận gần nhất", "Đội phong độ tốt nhất, sân nhà và sân khách tốt nhất, ghi bàn nhiều nhất, thủng lưới ít nhất, chuỗi bất bại: xếp từ 5 trận giải gần nhất của các đội ở Ngoại hạng Anh, La Liga, Serie A, Bundesliga, Ligue 1 và hơn nữa.", lang);

export function TrangForm({ lang }: { lang: Lang }) {
  const tep = tepXgDoi();
  const ds = tep.giai.flatMap(dongFormGiai);
  return (
    <KhungTrang
      duong={[{ ten: "Form", url: "/form" }]}
      h1="Phong độ các đội bóng (Form)"
      mo={<p>{`Đội nào đang có phong độ tốt nhất, đội nào mạnh nhất trên sân nhà hay sân khách, hàng công nào nổ súng đều nhất? Các bảng dưới xếp ${ds.length} đội ở ${tep.giai.length} giải theo 5 trận giải gần nhất, kèm bảng phong độ riêng từng giải.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/form" giai={tep.giai} dang={null} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      <section aria-labelledby="bang-xep-h">
        <h2 id="bang-xep-h" className="font-display text-xl font-bold">Bảng xếp phong độ mọi giải</h2>
        <div className="mt-3"><LuoiBangXep ds={ds} n={10} nhieuGiai /></div>
      </section>
      {tep.giai.map((g) => <BangFormGiai key={g.slug} g={g} ds={dongFormGiai(g)} lang={lang} link />)}
      <ChuThich />
    </KhungTrang>
  );
}

export const metaFormGiai = (g: GiaiXg, lang: Lang) =>
  meta(`/form/${g.slug}`, `Phong độ ${g.ten}: form 5 trận gần nhất từng đội`, `Bảng phong độ ${g.doi.length} đội ${g.ten}: 5 trận gần nhất, điểm, bàn ghi và bàn thua, phong độ sân nhà và sân khách, chuỗi bất bại. Cập nhật hằng ngày.`, lang);

export function TrangFormGiai({ g, lang }: { g: GiaiXg; lang: Lang }) {
  const tep = tepXgDoi();
  const ds = dongFormGiai(g);
  const top = [...ds].sort((a, b) => b.diem - a.diem || b.ghi - b.thua - (a.ghi - a.thua))[0];
  return (
    <KhungTrang
      duong={[{ ten: "Form", url: "/form" }, { ten: g.ten, url: `/form/${g.slug}` }]}
      h1={`Phong độ ${g.ten}`}
      mo={<p>{`Phong độ 5 trận giải gần nhất của ${g.doi.length} đội ${g.ten}. ${top.doi.ten} đang có phong độ tốt nhất với ${top.diem}/15 điểm, ghi ${top.ghi} và thủng lưới ${top.thua} bàn.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/form" giai={tep.giai} dang={g.slug} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      <BangFormGiai g={g} ds={ds} lang={lang} />
      <section aria-labelledby="bang-xep-h">
        <h2 id="bang-xep-h" className="font-display text-xl font-bold">Bảng xếp phong độ {g.ten}</h2>
        <div className="mt-3"><LuoiBangXep ds={ds} n={5} nhieuGiai={false} /></div>
      </section>
      <LinkGiai g={g} lang={lang} />
      <ChuThich />
    </KhungTrang>
  );
}

function ChuThich() {
  return <p className="text-xs text-muted">T thắng · H hòa · B thua, ô bên phải là trận gần đây nhất. Chỉ tính trận giải vô địch quốc gia. Nội dung mang tính tham khảo.</p>;
}
