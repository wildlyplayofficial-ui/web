import type { Metadata } from "next";
import Link from "next/link";
import soCu from "@/data/thanh-tich.json";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DoiLogo } from "@/components/doi-logo";
import { OG_VERSION } from "@/lib/brand";
import { dongTuan, logo, slugTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { tenDoiViet, tenGiaiViet } from "@/lib/ten-viet";
import { chamDong, gopSo, phanTram, theoNgay, tongThanhTich, type Dem, type DongCham, type TranCham } from "@/lib/thanh-tich";

/**
 * /du-doan/thanh-tich — dự đoán ngày đã đá, đặt cạnh tỷ số thật (Peter 11/11/2026, plan traffic phần 2).
 * Gồm cả trận đoán sai. Số lấy từ sổ data/thanh-tich.json + tệp tuần hiện tại (máy nạp tệp ghi sổ mỗi ngày).
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

const TIEU_DE = "Thành tích dự đoán bóng đá: đúng bao nhiêu, sai bao nhiêu";
const MO_TA =
  "Mọi trận banhbong đã dự đoán, đặt cạnh tỷ số thật: tỷ lệ đoán đúng thắng/hoà/thua, tài xỉu 2.5, hai đội ghi bàn và tỷ số chính xác. Có cả trận đoán sai.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: TIEU_DE,
    description: MO_TA,
    alternates: buildAlternates("/du-doan/thanh-tich", lang),
    openGraph: {
      locale: "vi_VN",
      title: `${TIEU_DE} | banhbong.net`,
      description: MO_TA,
      images: [{ url: `/api/og/editorial?title=Th%C3%A0nh%20t%C3%ADch%20d%E1%BB%B1%20%C4%91o%C3%A1n&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const ngayDep = (k: string) => `${+k.slice(8)}/${+k.slice(5, 7)}/${k.slice(0, 4)}`;

function O({ ten, x, phu }: { ten: string; x: Dem; phu: string }) {
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <p className="text-xs text-muted">{ten}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{phanTram(x)}</p>
      <p className="text-xs text-muted tabular-nums">
        {x.dung}/{x.tran} {phu}
      </p>
    </div>
  );
}

const Dau = ({ dung }: { dung: boolean | null }) =>
  dung === null ? <span className="text-muted">–</span> : dung ? <span className="font-semibold text-emerald-500">Đúng</span> : <span className="font-semibold text-pink-500">Sai</span>;

function DongTranCham({ t, conTrang, lang }: { t: TranCham; conTrang: Set<string>; lang: Lang }) {
  const slug = slugTuan({ ...t, fn: "", fk: "", o: [], gioUtc: null });
  // 2 dòng nhà/khách xếp dọc: điện thoại 390px không bị cắt tên (mẫu 11/11 cắt "Equatorial Gu...").
  const ten = (
    <span className="flex flex-col gap-0.5">
      {[t.nha, t.khach].map((d) => (
        <span key={d} className="flex min-w-0 items-center gap-1.5">
          <DoiLogo src={logo(d)} ten={tenDoiViet(d)} size={18} />
          <span className="truncate">{tenDoiViet(d)}</span>
        </span>
      ))}
    </span>
  );
  return (
    <tr className="border-t border-line">
      <td className="max-w-[170px] px-3 py-2 sm:max-w-[320px]">
        {conTrang.has(slug) ? (
          <Link href={withLang(`/du-doan/${slug}`, lang)} className="hover:text-brand">
            {ten}
          </Link>
        ) : (
          ten
        )}
        <span className="block text-xs text-muted">{tenGiaiViet(t.giai)}</span>
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-center font-display font-bold tabular-nums sm:px-3">{t.duSo.join("-")}</td>
      <td className="whitespace-nowrap px-2 py-2 text-center font-display font-bold tabular-nums sm:px-3">{t.that.join("-")}</td>
      <td className="px-2 py-2 text-center sm:px-3">
        <Dau dung={t.dung} />
        {t.dungTySo && <span className="block text-xs text-brand">trúng tỷ số</span>}
        {t.tx && (
          <span className="block whitespace-nowrap text-xs sm:hidden">
            {t.tx.replace("Tài", "↑").replace("Xỉu", "↓")} <Dau dung={t.dungTx} />
          </span>
        )}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2 text-center text-xs sm:table-cell">
        {t.tx ? <>{t.tx.replace("Tài", "↑").replace("Xỉu", "↓")} · <Dau dung={t.dungTx} /></> : "–"}
      </td>
    </tr>
  );
}

export default async function ThanhTich({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const tuan = dongTuan();
  const ds = gopSo(soCu as DongCham[], tuan).flatMap((d) => chamDong(d) ?? []);
  const tong = tongThanhTich(ds);
  const conTrang = new Set(tuan.map(slugTuan));

  return (
    <div className="mx-auto max-w-[900px] px-3.5 py-4 sm:px-5 sm:py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Dự đoán", url: "/du-doan" },
          { name: "Thành tích", url: "/du-doan/thanh-tich" },
        ]}
      />
      <h1 className="font-display text-[22px] font-bold leading-tight sm:text-[28px]">Thành tích dự đoán</h1>
      <p className="mt-1.5 text-sm text-muted">
        Mọi trận đã dự đoán, chốt trước giờ bóng lăn, đặt cạnh tỷ số thật. Có cả trận đoán sai.
        {tong.tuNgay && ` Tính từ ${ngayDep(tong.tuNgay)} đến ${ngayDep(tong.denNgay ?? tong.tuNgay)}.`}
      </p>

      {ds.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line bg-card px-6 py-6 text-center text-sm">
          <p className="font-display font-bold">Chưa có trận chấm</p>
          <p className="mt-1 text-muted">
            Bảng bắt đầu chấm từ các trận ngày 10/11/2026. Kết quả có vào ngày hôm sau, trang tự cập nhật.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <O ten="Thắng / hoà / thua" x={tong.ketQua} phu="trận đúng" />
            <O ten="Tài xỉu 2.5" x={tong.taiXiu} phu="trận đúng" />
            <O ten="Hai đội ghi bàn" x={tong.haiDoiGhi} phu="trận đúng" />
            <O ten="Tỷ số chính xác" x={tong.tySo} phu="trận trúng" />
          </div>
          {theoNgay(ds).map(([ngay, ds1]) => {
            const t = tongThanhTich(ds1);
            return (
              <section key={ngay} className="mt-8">
                <h2 className="font-display text-lg font-bold">
                  Ngày {ngayDep(ngay)}{" "}
                  <span className="text-sm font-normal text-muted">
                    · đúng {t.ketQua.dung}/{t.ketQua.tran} trận
                  </span>
                </h2>
                <div className="mt-2 overflow-x-auto rounded-card border border-line">
                  <table className="w-full text-sm">
                    <thead className="bg-card text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Trận</th>
                        <th className="px-2 py-2 font-semibold sm:px-3">Đoán</th>
                        <th className="px-2 py-2 font-semibold sm:px-3">Thật</th>
                        <th className="px-2 py-2 font-semibold sm:px-3">
                          <span className="sm:hidden">Chấm</span>
                          <span className="hidden sm:inline">Thắng/hoà/thua</span>
                        </th>
                        <th className="hidden px-3 py-2 font-semibold sm:table-cell">Tài xỉu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ds1.map((x) => (
                        <DongTranCham key={`${x.nha}|${x.khach}`} t={x} conTrang={conTrang} lang={lang} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </>
      )}

      <p className="mt-10 text-sm">
        <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">
          ← Dự đoán hôm nay
        </Link>
      </p>
    </div>
  );
}
