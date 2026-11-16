import type { Metadata } from "next";
import Link from "next/link";
import { OG_VERSION } from "@/lib/brand";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { BANG_DAU, CAP_NHAT, HOI_DAP, MOC_LICH, NGUON, SAN_DAU, TRAN_VIET_NAM } from "@/lib/asian-cup-2027";

export const revalidate = 3600;

const DUONG = "/lich-thi-dau-asian-cup-2027";
const TIEU_DE = "Lịch thi đấu Asian Cup 2027: ngày mới sau khi dời, bảng của Việt Nam";
const MO_TA =
  "Asian Cup 2027 dời sang 23/12/2027 – 21/1/2028 tại Saudi Arabia. Việt Nam ở bảng E cùng Hàn Quốc, UAE, Yemen. Ngày đá từng trận: chưa công bố.";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const og = `/api/og/editorial?title=${encodeURIComponent("Lịch thi đấu Asian Cup 2027")}&subtitle=${encodeURIComponent("23/12/2027 – 21/1/2028 · Việt Nam ở bảng E")}&v=${OG_VERSION}`;
  return {
    title: TIEU_DE,
    description: MO_TA,
    alternates: buildAlternates(DUONG, lang),
    openGraph: {
      locale: "vi_VN",
      title: `${TIEU_DE} | banhbong.net`,
      description: MO_TA,
      images: [{ url: og, width: 1200, height: 630 }],
    },
  };
}

const H2 = "font-display text-xl font-bold";
const DOAN = "mt-3 text-[15px] leading-relaxed text-ink";
const KHUNG_BANG = "mt-4 overflow-x-auto rounded-card border border-line bg-card shadow-card";
const O_DAU = "px-3 py-2 font-medium";
const O = "px-3 py-2.5";

export default async function LichAsianCup2027({ params }: Props) {
  const lang = resolveLang((await params).lang);

  return (
    <div className="mx-auto max-w-[800px] px-5 pb-14">
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: withLang("/", lang) },
          { name: "Lịch thi đấu Asian Cup 2027", url: withLang(DUONG, lang) },
        ]}
      />

      <header className="py-8">
        <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{TIEU_DE}</h1>
        <p className="mt-2 text-sm text-muted">{`Cập nhật ${CAP_NHAT}`}</p>
        <p className={DOAN}>
          Asian Cup 2027 không còn đá vào tháng 1/2027. Ngày 3/11/2026, Liên đoàn Bóng đá châu Á (AFC) dời giải
          sang <strong>23/12/2027 – 21/1/2028</strong>, vẫn tổ chức tại Saudi Arabia. Đội tuyển Việt Nam ở bảng E
          cùng Hàn Quốc, UAE và Yemen. Ngày giờ từng trận theo lịch mới thì AFC chưa công bố; trang này sẽ
          điền ngay khi có.
        </p>
      </header>

      <section aria-labelledby="lich-moi">
        <h2 id="lich-moi" className={H2}>23/12/2027 – 21/1/2028: lịch Asian Cup 2027 sau khi dời</h2>
        <p className={DOAN}>
          Giải kéo dài 30 ngày, bằng đúng độ dài lịch cũ (7/1 – 5/2/2027). AFC mới chốt ngày khai mạc và ngày
          chung kết, và lịch mới còn chờ FIFA phê duyệt. Các mốc ở giữa đang để trống.
        </p>
        <div className={KHUNG_BANG}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className={O_DAU}>Mốc</th>
                <th scope="col" className={O_DAU}>Lịch mới</th>
                <th scope="col" className={O_DAU}>Lịch cũ (đã bỏ)</th>
              </tr>
            </thead>
            <tbody>
              {MOC_LICH.map((m) => (
                <tr key={m.moc} className="border-b border-line last:border-0">
                  <th scope="row" className={`${O} text-left font-semibold`}>{m.moc}</th>
                  <td className={`${O} font-semibold`}>{m.lichMoi}</td>
                  <td className={`${O} text-muted line-through`}>{m.lichCu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={DOAN}>
          AFC giải thích việc dời giải là do tình hình bất ổn trong khu vực khiến đi lại và hậu cần gặp khó. Tên
          giải giữ nguyên là Asian Cup 2027 dù trận chung kết rơi vào tháng 1/2028.
        </p>
      </section>

      <section aria-labelledby="viet-nam" className="mt-10">
        <h2 id="viet-nam" className={H2}>3 trận vòng bảng của Việt Nam: gặp UAE, Hàn Quốc, Yemen</h2>
        <p className={DOAN}>
          Việt Nam nằm ở bảng E theo kết quả bốc thăm ngày 9/5/2026. Ba cặp đấu đã rõ, còn ngày, giờ và sân
          theo lịch mới thì chưa có. Cột bên phải là lịch cũ, ghi lại để bạn khỏi nhầm khi gặp bài viết cũ.
        </p>
        <div className={KHUNG_BANG}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className={O_DAU}>Trận</th>
                <th scope="col" className={O_DAU}>Lịch mới</th>
                <th scope="col" className={O_DAU}>Lịch cũ, giờ Việt Nam (đã bỏ)</th>
              </tr>
            </thead>
            <tbody>
              {TRAN_VIET_NAM.map((t) => (
                <tr key={t.tran} className="border-b border-line last:border-0">
                  <th scope="row" className={`${O} text-left font-semibold`}>{t.tran}</th>
                  <td className={`${O} font-semibold`}>{t.lichMoi}</td>
                  <td className={`${O} text-muted line-through`}>{t.lichCu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={DOAN}>
          {"Tin và nhận định về đội tuyển trước giải nằm ở trang "}
          <Link href={withLang("/doi/vietnam", lang)} className="font-semibold text-brand hover:underline">
            đội tuyển Việt Nam
          </Link>
          {"."}
        </p>
      </section>

      <section aria-labelledby="bang-dau" className="mt-10">
        <h2 id="bang-dau" className={H2}>24 đội chia 6 bảng: kết quả bốc thăm Asian Cup 2027</h2>
        <p className={DOAN}>
          Đông Nam Á có 4 đại diện: Việt Nam (bảng E), Singapore (bảng D), Thái Lan và Indonesia (cùng bảng F
          với Nhật Bản, Qatar).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BANG_DAU.map((b) => (
            <div key={b.bang} className={`rounded-card border bg-card p-4 ${b.bang === "E" ? "border-brand/50" : "border-line"}`}>
              <h3 className="font-display text-base font-bold">{`Bảng ${b.bang}`}</h3>
              <ul className="mt-2 space-y-1 text-[15px] text-ink">
                {b.doi.map((d) => (
                  <li key={d} className={d === "Việt Nam" ? "font-semibold text-brand" : undefined}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="the-thuc" className="mt-10">
        <h2 id="the-thuc" className={H2}>16 đội qua vòng bảng: thể thức thi đấu</h2>
        <p className={DOAN}>
          Mỗi bảng 4 đội đá vòng tròn một lượt, mỗi đội 3 trận. Hai đội đứng đầu mỗi bảng đi tiếp, cùng 4 đội
          xếp thứ ba có thành tích tốt nhất trong 6 bảng. Từ vòng 16 đội trở đi là loại trực tiếp.
        </p>
      </section>

      <section aria-labelledby="san-dau" className="mt-10">
        <h2 id="san-dau" className={H2}>8 sân ở 3 thành phố của Saudi Arabia</h2>
        <p className={DOAN}>
          Thông báo dời giải chỉ đổi thời gian, không nhắc tới việc đổi địa điểm. Saudi Arabia chậm hơn Việt Nam
          4 tiếng. Sân nào đá trận nào theo lịch mới: chưa công bố.
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink">
          {SAN_DAU.map((s) => (
            <li key={s.thanhPho}>
              <strong>{`${s.thanhPho} (${s.san.length} sân): `}</strong>
              {s.san.join(", ")}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hoi-dap" className="mt-10">
        <h2 id="hoi-dap" className={H2}>Câu hỏi thường gặp về lịch thi đấu Asian Cup 2027</h2>
        <div className="mt-4 space-y-2">
          {HOI_DAP.map((c, i) => (
            <details key={c.hoi} open={i === 0} className="group rounded-card border border-line bg-card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15px] font-semibold">{c.hoi}</h3>
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="border-t border-line px-4 py-3 text-[15px] leading-relaxed text-ink">{c.dap}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="nguon" className="mt-10">
        <h2 id="nguon" className="font-display text-base font-bold">Nguồn</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {NGUON.map((n) => (
            <li key={n.url}>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand hover:underline">
                {n.ten}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {"Xem thêm: "}
          <Link href={withLang("/competitions", lang)} className="font-semibold text-brand hover:underline">
            bảng xếp hạng các giải
          </Link>
          {" · "}
          <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">
            dự đoán bóng đá hôm nay
          </Link>
        </p>
      </section>
    </div>
  );
}
