import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { BxhBen, type BangBxh } from "@/components/bxh-ben";
import { KetQuaLoc } from "@/components/ket-qua-loc";
import { OG_VERSION } from "@/lib/brand";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { dongTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { canTraTySo, chonNgayKetQua, gomGiai, homNayVN, ketQuaNgay, lechNgay, nhanNgay, tieuDeNgay, tySoTuFixtures, tySoTuLS } from "@/lib/ket-qua";
import { lichSuTySo } from "@/lib/ket-qua-ls";
import { getTranDaDa } from "@/lib/phong-do-db";
import { fetchCompetitionTable } from "@/lib/standings";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { teamBadge } from "@/lib/team-badges";
import { tenDoiViet } from "@/lib/ten-viet";

/**
 * /ket-qua — tỷ số các trận banhbong đã dự đoán (Peter duyệt mẫu v2 11/11/2026).
 * Tab ngày bằng ?ngay=YYYY-MM-DD (link thường, Google bò được); mặc định hôm qua giờ VN.
 * Chỉ hiện tab ngày có tỷ số (Peter 11/11); hôm qua trống thì mở ngày gần nhất có tỷ số.
 */
export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
};

const TIEU_DE = "Kết quả bóng đá hôm qua";
const MO_TA =
  "Tỷ số các trận bóng đá đêm qua và rạng sáng nay theo giờ Việt Nam, gom theo giải. Bấm từng trận xem dự đoán và số liệu, kèm bảng xếp hạng 5 giải lớn.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: TIEU_DE,
    description: MO_TA,
    // ?ngay=… dồn về một trang chuẩn.
    alternates: buildAlternates("/ket-qua", lang),
    openGraph: {
      locale: "vi_VN",
      title: `${TIEU_DE} | banhbong.net`,
      description: MO_TA,
      images: [{ url: `/api/og/editorial?title=K%E1%BA%BFt%20qu%E1%BA%A3%20b%C3%B3ng%20%C4%91%C3%A1&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const GIAI_BXH: [string, string][] = [
  ["premier-league", "Ngoại hạng Anh"],
  ["la-liga", "La Liga"],
  ["serie-a", "Serie A"],
  ["bundesliga", "Bundesliga"],
  ["ligue-1", "Ligue 1"],
];

async function bangXepHang(): Promise<BangBxh[]> {
  const giai = await getStandingsCompetitions().catch(() => []);
  return Promise.all(
    GIAI_BXH.map(async ([slug, ten]) => {
      const id = giai.find((c) => c.slug === slug)?.livescoreId;
      const rows = id ? await fetchCompetitionTable(id).catch(() => []) : [];
      const dong = [...rows]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 6)
        .map((r) => ({ rank: r.rank, ten: tenDoiViet(r.name), logo: teamBadge(r.name), tran: r.played, hs: r.goal_diff, diem: r.points }));
      return { slug, ten, dong };
    }),
  );
}

export default async function KetQua({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const homNay = homNayVN();
  const xin = (await searchParams).ngay;
  // Dòng tệp tuần chưa có `kq` (máy nạp chỉ gắn kết quả hôm sau) → tra tỷ số trong bảng fixtures.
  const traThem = canTraTySo(dongTuan());
  // Phải biết ngày nào có tỷ số để ẩn tab trống → tra cả 5 tab. Ngày VN D gồm trận ngày Anh D-1
  // (tối/đêm) và D → hỏi nhà cung cấp từng ngày Anh có dòng cần tra, từ tab cũ nhất - 1 (hôm nay - 5) tới hôm nay.
  const ngayAnh = [...new Set(traThem.map((d) => d.ngay))].filter((d) => d >= lechNgay(homNay, -5) && d <= homNay);
  const [{ hang }, daDa, ls, bang] = await Promise.all([
    taiDuDoan(),
    getTranDaDa(traThem.flatMap((d) => [d.nha, d.khach])),
    Promise.all(ngayAnh.map((d) => lichSuTySo(d, d))).then((x) => x.flat()),
    bangXepHang(),
  ]);
  // Nguồn chính: livescore (bảng fixtures CSDL ngừng có tỷ số từ 8/9); CSDL bù chỗ thiếu.
  const them = new Map([...tySoTuFixtures(traThem, daDa), ...tySoTuLS(traThem, ls)]);
  const { ngays, ngay } = chonNgayKetQua(homNay, hang, them, typeof xin === "string" ? xin : undefined);
  const nhom = ngay ? gomGiai(ketQuaNgay(hang, ngay, them)) : [];

  return (
    <div className="mx-auto max-w-[1180px] px-3.5 py-4 sm:px-5 sm:py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Kết quả", url: "/ket-qua" },
        ]}
      />
      <div className="grid items-start gap-7 min-[900px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-bold leading-tight sm:text-[28px]">{tieuDeNgay(ngay ?? lechNgay(homNay, -1), homNay)}</h1>
          <p className="mt-1.5 text-sm text-muted">
            Tỷ số các trận banhbong.net đã dự đoán, giờ Việt Nam. Bấm trận để xem chi tiết.
          </p>
          {ngays.length > 0 && (
            <nav aria-label="Chọn ngày" className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
              {ngays.map((k) => (
                <Link
                  key={k}
                  href={withLang(`/ket-qua?ngay=${k}`, lang)}
                  aria-current={k === ngay ? "page" : undefined}
                  className={`shrink-0 rounded-[10px] border px-3.5 py-2 text-sm transition-colors ${
                    k === ngay ? "border-ink font-semibold text-ink" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {nhanNgay(k, homNay)}
                </Link>
              ))}
            </nav>
          )}
          <div className="mt-3">
            {nhom.length === 0 ? (
              <div className="rounded-card border border-dashed border-line bg-card px-6 py-6 text-center text-sm">
                <p className="text-muted">Chưa có tỷ số mấy ngày gần đây. Kết quả cập nhật mỗi sáng.</p>
                <Link href={withLang("/du-doan", lang)} className="mt-2 inline-block font-semibold text-brand hover:underline">
                  Xem dự đoán hôm nay →
                </Link>
              </div>
            ) : (
              <KetQuaLoc nhom={nhom} />
            )}
          </div>
          {nhom.length > 0 && (
            <p className="mt-5 text-[13px] text-muted">
              KT = kết thúc. Tỷ số cập nhật mỗi sáng.{" "}
              <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">
                Dự đoán hôm nay →
              </Link>
            </p>
          )}
        </div>
        <BxhBen bang={bang} />
      </div>
    </div>
  );
}
