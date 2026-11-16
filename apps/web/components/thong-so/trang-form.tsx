import Link from "next/link";
import { demTran } from "@/lib/chi-so-doi";
import { withLang, type Lang } from "@/lib/i18n";
import { badgeNho, teamBadge } from "@/lib/team-badges";
import { BANG_XEP, dongFormGiai, tepXgDoi, topBang, xepForm, type DoiXg, type DongForm, type GiaiXg } from "@/lib/xg-doi";
import { BangXepChip, type BangXepGon } from "./bang-xep-chip";
import { FormBang } from "./form-bang";
import { ChipGiai, KhungTrang } from "./khung";
import { LinkGiai, meta } from "./trang";

/** /form và /form/{giai} — kiểu Flashscore (Peter gật mẫu 16/11/2026): 3 thẻ đáng chú ý, bảng đổi Tổng/Nhà/Khách, bảng xếp phụ gom chip. */

const logoCua = (d: DoiXg) => badgeNho(teamBadge(d.ten)) ?? d.logo;

function gonBang(ds: readonly DongForm[], n: number, ids: readonly string[] | null, nhieuGiai: boolean): BangXepGon[] {
  return BANG_XEP.filter((b) => !ids || ids.includes(b.id))
    .map((b) => ({
      id: b.id,
      tieuDe: b.tieuDe,
      moTa: b.moTa,
      dong: topBang(b, ds, n).map((d) => ({ id: d.doi.id, ten: d.doi.ten, logo: logoCua(d.doi), phu: nhieuGiai ? d.giai.ten : undefined, gt: b.gt(d), kq: b.kq(d) })),
    }))
    .filter((b) => b.dong.length > 0);
}

/** 3 thẻ đầu trang: phong độ tốt nhất, giữ sạch lưới nhiều nhất, phong độ tệ nhất. */
function DangChuY({ ds, nhieuGiai }: { ds: readonly DongForm[]; nhieuGiai: boolean }) {
  const du = xepForm(ds.filter((d) => d.du));
  if (du.length === 0) return null;
  const sach = [...ds].map((d) => ({ d, s: demTran(d.doi.gan) })).sort((a, b) => b.s.sachLuoi - a.s.sachLuoi || a.s.n - b.s.n)[0];
  const giai = (d: DongForm) => (nhieuGiai ? ` · ${d.giai.ten}` : "");
  const the = [
    { so: `${du[0].diem}/15`, ten: du[0].doi.ten, chu: `phong độ tốt nhất 5 trận gần đây${giai(du[0])}` },
    { so: `${sach.s.sachLuoi}/${sach.s.n} trận`, ten: sach.d.doi.ten, chu: `giữ sạch lưới nhiều nhất${giai(sach.d)}` },
    { so: `${du[du.length - 1].diem}/15`, ten: du[du.length - 1].doi.ten, chu: `phong độ tệ nhất 5 trận gần đây${giai(du[du.length - 1])}` },
  ];
  return (
    <section aria-labelledby="chu-y-h">
      <h2 id="chu-y-h" className="text-xs font-semibold uppercase tracking-wider text-muted">Đáng chú ý</h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {the.map((t) => (
          <li key={t.chu} className="rounded-card border border-line bg-card px-3.5 py-3">
            <p className="font-display text-[22px] font-bold leading-tight tabular-nums text-brand">{t.so}</p>
            <p className="font-semibold">{t.ten}</p>
            <p className="text-xs text-muted">{t.chu}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChuThich() {
  return <p className="text-xs text-muted">T thắng · H hòa · B thua. Chỉ tính trận giải vô địch quốc gia. Nội dung mang tính tham khảo.</p>;
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
      mo={<p>{`Đội nào đang có phong độ tốt nhất, đội nào mạnh nhất trên sân nhà hay sân khách, hàng công nào nổ súng đều nhất? Các bảng dưới xếp ${ds.length} đội ở ${tep.giai.length} giải theo 5 trận giải gần nhất. Chọn một giải để xem bảng phong độ đủ các đội.`}</p>}
      lang={lang}
      chip={<ChipGiai goc="/form" giai={tep.giai} dang={null} lang={lang} />}
      nguon={tep.nguon}
      capNhat={tep.capNhat}
    >
      <DangChuY ds={ds} nhieuGiai />
      <section aria-labelledby="bang-xep-h">
        <h2 id="bang-xep-h" className="font-display text-xl font-bold">Bảng xếp phong độ mọi giải</h2>
        <div className="mt-3"><BangXepChip bang={gonBang(ds, 10, null, true)} /></div>
      </section>
      <section aria-labelledby="tung-giai-h">
        <h2 id="tung-giai-h" className="font-display text-xl font-bold">Phong độ từng giải</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {tep.giai.map((g) => {
            const dau = xepForm(dongFormGiai(g).filter((d) => d.du))[0];
            return (
              <li key={g.slug}>
                <Link href={withLang(`/form/${g.slug}`, lang)} className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-card px-3.5 py-2.5 transition-colors active:bg-card-hover">
                  <span className="min-w-0">
                    <span className="block font-semibold">{g.ten}</span>
                    {dau && <span className="block truncate text-xs text-muted">Dẫn đầu: {dau.doi.ten} {dau.diem}/15 điểm</span>}
                  </span>
                  <span aria-hidden className="text-brand">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <ChuThich />
    </KhungTrang>
  );
}

// ---------- /form/{giai} ----------

export const metaFormGiai = (g: GiaiXg, lang: Lang) =>
  meta(`/form/${g.slug}`, `Phong độ ${g.ten}: form 5 trận gần nhất từng đội`, `Bảng phong độ ${g.doi.length} đội ${g.ten}: 5 trận gần nhất, điểm, bàn ghi và bàn thua, phong độ sân nhà và sân khách, chuỗi bất bại. Cập nhật hằng ngày.`, lang);

export function TrangFormGiai({ g, lang }: { g: GiaiXg; lang: Lang }) {
  const tep = tepXgDoi();
  const ds = dongFormGiai(g);
  const top = xepForm(ds)[0];
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
      <DangChuY ds={ds} nhieuGiai={false} />
      <section aria-labelledby="bang-h">
        <h2 id="bang-h" className="font-display text-xl font-bold">Bảng phong độ {g.ten}</h2>
        <div className="mt-3">
          <FormBang doi={g.doi.map((d) => ({ id: d.id, ten: d.ten, logo: logoCua(d), hang: d.hang, gan: d.gan }))} />
        </div>
      </section>
      <section aria-labelledby="bang-xep-h">
        <h2 id="bang-xep-h" className="font-display text-xl font-bold">Xếp hạng phong độ {g.ten}</h2>
        <div className="mt-3"><BangXepChip bang={gonBang(ds, 5, ["chuoi-bat-bai", "ghi-ban-lien-tiep", "ghi-ban-nhieu-nhat", "thung-luoi-it-nhat"], false)} /></div>
      </section>
      <LinkGiai g={g} lang={lang} />
      <ChuThich />
    </KhungTrang>
  );
}
