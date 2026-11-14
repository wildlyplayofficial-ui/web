import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DoiLogo } from "@/components/doi-logo";
import { OG_VERSION } from "@/lib/brand";
import { ngayVN } from "@/lib/du-doan-hang";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { keoPhuTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { demNhom, dongTipNgay, type DongTip, type LoaiTip } from "@/lib/tip-ngay";

/**
 * Ba trang gom theo loại kèo cho NGÀY HÔM NAY (Peter gật 14/11): /tai-xiu-hom-nay,
 * /ca-2-doi-ghi-ban-hom-nay, /ty-so-hom-nay. Mỗi trận một dòng: logo hai đội, giờ, giải, tip + tỷ lệ,
 * dòng là link sang trang riêng /du-doan/{slug}. Không hiện kết quả/đúng sai (không có nội dung thành tích công khai),
 * không tên nhà cái, không nút đặt cược.
 */

interface CauHinh {
  duong: string;
  ten: string;
  /** Cụm in đậm trong tiêu đề + h1: "Tài xỉu hôm nay". */
  tieuDe: string;
  mota: (soTran: number, ngay: string) => string;
  cotTip: string;
  moDau: string;
}

export const CAU_HINH: Record<LoaiTip, CauHinh> = {
  "tai-xiu": {
    duong: "/tai-xiu-hom-nay",
    ten: "Tài xỉu",
    tieuDe: "Tài xỉu hôm nay",
    mota: (n, ngay) => `Tài xỉu hôm nay ${ngay}: ${n} trận có dự đoán trên hoặc dưới 2.5 bàn, kèm tỷ lệ và số trận Tài trong 5 trận gần nhất của từng đội. Giờ Việt Nam.`,
    cotTip: "Tài/Xỉu 2.5",
    moDau: "Mốc 2.5 bàn: tổng bàn thắng của cả hai đội từ 3 trở lên là Tài, từ 2 trở xuống là Xỉu.",
  },
  "hai-doi-ghi-ban": {
    duong: "/ca-2-doi-ghi-ban-hom-nay",
    ten: "Cả 2 đội ghi bàn",
    tieuDe: "Cả 2 đội ghi bàn hôm nay",
    mota: (n, ngay) => `Cả 2 đội ghi bàn hôm nay ${ngay}: ${n} trận có dự đoán Có hoặc Không, kèm tỷ lệ và số trận cả hai đội cùng ghi bàn trong 5 trận gần nhất. Giờ Việt Nam.`,
    cotTip: "Hai đội ghi bàn",
    moDau: "Mỗi đội ghi ít nhất một bàn trong 90 phút là Có; một đội trắng bàn là Không.",
  },
  "ty-so": {
    duong: "/ty-so-hom-nay",
    ten: "Tỷ số",
    tieuDe: "Tỷ số dự đoán hôm nay",
    mota: (n, ngay) => `Tỷ số dự đoán hôm nay ${ngay}: ${n} trận, mỗi trận một tỷ số chính xác kèm tỷ lệ. Giờ Việt Nam, bấm trận để xem phong độ, đối đầu và số liệu chi tiết.`,
    cotTip: "Tỷ số",
    moDau: "Tỷ số chính xác là cửa khó nhất nên tỷ lệ thường cao; mỗi trận trang chỉ nêu một tỷ số.",
  },
};

export const LOAI_TIP = Object.keys(CAU_HINH) as LoaiTip[];

/** Các dòng của loại tip trong hôm nay (giờ VN). */
export async function tipHomNay(loai: LoaiTip): Promise<{ homNay: string; ds: DongTip[] }> {
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  return { homNay, ds: dongTipNgay(hang, homNay, loai, keoPhuTuan) };
}

export function metaTipNgay(loai: LoaiTip, homNay: string, soTran: number, lang: Lang): Metadata {
  const c = CAU_HINH[loai];
  const ngay = ngayThang(homNay);
  const title = `${c.tieuDe} ${ngay}${soTran > 0 ? `: dự đoán ${soTran} trận` : ""}`;
  const description = c.mota(soTran, ngay);
  return {
    title,
    description,
    alternates: buildAlternates(c.duong, lang),
    openGraph: {
      locale: "vi_VN",
      title: `${title} | banhbong.net`,
      description,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(c.tieuDe)}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";
const H2 = "border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]";
const LOGO = "h-6 w-6";

/** Chuỗi 5 trận: ô sáng = đạt (Tài / hai đội ghi), ô mờ = không. Trái cũ, phải mới. */
function Chuoi({ c, ten, ky }: { c: boolean[] | null; ten: string; ky: [string, string] }) {
  if (!c) return null;
  return (
    <span className="flex gap-[3px]" aria-label={`${ten}: ${c.map((x) => (x ? ky[0] : ky[1])).join(" ")}, trận mới nhất bên phải`}>
      {c.map((x, i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] font-display text-[10px] font-bold leading-none ${x ? "bg-brand text-white" : "border border-line text-muted"}`}
        >
          {x ? ky[0] : ky[1]}
        </span>
      ))}
    </span>
  );
}

const KY: Record<LoaiTip, [string, string]> = { "tai-xiu": ["T", "X"], "hai-doi-ghi-ban": ["✓", "✗"], "ty-so": ["", ""] };

function DongTipTran({ d, loai, lang }: { d: DongTip; loai: LoaiTip; lang: Lang }) {
  const { h } = d;
  const coChuoi = loai !== "ty-so" && (d.chuoiNha || d.chuoiKhach);
  return (
    <Link
      href={withLang(`/du-doan/${h.slug}`, lang)}
      className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line/60 px-0.5 py-2.5 transition-colors hover:bg-card-hover sm:px-1.5"
    >
      <div className="min-w-0 self-start">
        <p className="text-sm font-semibold tabular-nums">{h.gio}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{h.giai}</p>
        <div className="mt-1 flex min-w-0 items-center gap-2.5">
          <DoiLogo src={h.logoNha} ten={h.nha} lop={LOGO} />
          <span className="truncate text-[15px] font-semibold">{h.nha}</span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2.5">
          <DoiLogo src={h.logoKhach} ten={h.khach} lop={LOGO} />
          <span className="truncate text-[15px] font-semibold">{h.khach}</span>
        </div>
        {coChuoi && (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            {d.chuoiNha && (
              <span className="flex items-center gap-1.5">
                <span className="max-w-[88px] truncate">{h.nha}</span>
                <Chuoi c={d.chuoiNha} ten={h.nha} ky={KY[loai]} />
              </span>
            )}
            {d.chuoiKhach && (
              <span className="flex items-center gap-1.5">
                <span className="max-w-[88px] truncate">{h.khach}</span>
                <Chuoi c={d.chuoiKhach} ten={h.khach} ky={KY[loai]} />
              </span>
            )}
          </div>
        )}
      </div>
      <div className="min-w-[72px] text-center">
        <span className="inline-block min-w-[64px] rounded-md border-2 border-brand px-2 py-px font-display text-base font-bold text-brand tabular-nums">{d.nhom}</span>
        {d.keo !== null && <p className="mt-1 text-xs text-muted">Tỷ lệ <b className="tabular-nums text-ink">{d.keo.toFixed(2)}</b></p>}
      </div>
    </Link>
  );
}

const KE_BEN: Record<LoaiTip, ReadonlyArray<{ hoi: string; dap: string }>> = {
  "tai-xiu": [
    { hoi: "Tài xỉu 2.5 bàn là gì?", dap: "Chọn tổng số bàn thắng của cả hai đội trong 90 phút: Tài là từ 3 bàn trở lên, Xỉu là 2 bàn trở xuống. Mốc 2.5 không có trường hợp hoà nên luôn ra một bên." },
    { hoi: "Chuỗi T và X dưới tên đội là gì?", dap: "Là 5 trận gần nhất của từng đội: ô sáng chữ T là trận có từ 3 bàn trở lên, ô viền chữ X là trận ít hơn. Trận cũ nhất bên trái, mới nhất bên phải." },
    { hoi: "Tỷ lệ ghi cạnh tip để làm gì?", dap: "Là tỷ lệ của cửa được dự đoán, lấy từ nguồn dự đoán của trang, chỉ để tham khảo và có thể đổi trước giờ bóng lăn." },
  ],
  "hai-doi-ghi-ban": [
    { hoi: "Cả 2 đội ghi bàn nghĩa là gì?", dap: "Mỗi đội ghi ít nhất một bàn trong 90 phút thì kết quả là Có. Chỉ cần một đội không ghi được bàn nào là Không, bất kể trận kết thúc ra sao." },
    { hoi: "Chuỗi ✓ và ✗ dưới tên đội là gì?", dap: "Là 5 trận gần nhất của từng đội: ô sáng dấu ✓ là trận cả hai đội cùng ghi bàn, ô viền dấu ✗ là trận có đội trắng bàn. Trận cũ nhất bên trái, mới nhất bên phải." },
    { hoi: "Bàn thắng phản lưới có tính không?", dap: "Có. Bàn phản lưới được tính cho đội hưởng bàn thắng, nên đội đó vẫn được coi là đã ghi bàn." },
  ],
  "ty-so": [
    { hoi: "Tỷ số dự đoán lấy từ đâu?", dap: "Mỗi trận có một tỷ số chính xác từ nguồn dự đoán của trang, kèm tỷ lệ của đúng tỷ số đó. Bấm vào trận để xem thêm phong độ, đối đầu và các số liệu khác." },
    { hoi: "Vì sao tỷ lệ tỷ số chính xác cao?", dap: "Một trận có rất nhiều tỷ số có thể xảy ra, đoán trúng đúng một tỷ số khó hơn nhiều so với đoán đội thắng, nên tỷ lệ thường từ 6 đến 15 hoặc hơn." },
  ],
};

export function TrangTipNgay({ loai, homNay, ds, lang }: { loai: LoaiTip; homNay: string; ds: DongTip[]; lang: Lang }) {
  const c = CAU_HINH[loai];
  const ngay = ngayThang(homNay);
  const dem = demNhom(ds);
  // Tài/Xỉu và Có/Không: mỗi cửa một khối, cửa nhiều trận nhất trước; tỷ số: một danh sách theo giờ đá.
  const nhom = loai === "ty-so" ? null : dem;
  const soGiai = new Set(ds.map((d) => d.h.giai)).size;
  const khac = LOAI_TIP.filter((l) => l !== loai);

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: c.tieuDe, url: c.duong }]} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">{c.ten} hôm nay</span>
      </nav>

      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight sm:text-[30px]">
        {c.tieuDe}, {thuVN(homNay)} {ngay}
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {ds.length > 0
          ? `${ds.length} trận ở ${soGiai} giải, giờ Việt Nam. ${c.moDau}`
          : `Hôm nay chưa có trận nào có tip ${c.ten.toLowerCase()}. Dữ liệu cập nhật theo từng ngày, bạn có thể xem dự đoán các ngày khác ở trang Dự đoán.`}
      </p>

      <nav aria-label="Dự đoán theo loại kèo" className="mt-3 flex flex-wrap gap-2">
        {khac.map((l) => (
          <Link key={l} href={withLang(CAU_HINH[l].duong, lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
            {CAU_HINH[l].tieuDe}
          </Link>
        ))}
        <Link href={withLang("/chuoi-dang-chu-y", lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
          Chuỗi đáng chú ý
        </Link>
      </nav>

      {ds.length > 0 && (
        <p className="mt-4 text-[13px] text-muted">
          {dem.slice(0, 4).map((x) => `${x.nhom}: ${x.so} trận`).join(" · ")}
        </p>
      )}

      {ds.length > 0 && nhom ? (
        nhom.map(({ nhom: ten }) => {
          const trong = ds.filter((d) => d.nhom === ten);
          return (
            <section key={ten} className="mt-5">
              <h2 className="flex items-baseline gap-2 border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]">
                {ten} hôm nay
                <span className="text-[13px] font-normal text-muted">{trong.length} trận</span>
              </h2>
              <ul>
                {trong.map((d) => (
                  <li key={d.h.slug}><DongTipTran d={d} loai={loai} lang={lang} /></li>
                ))}
              </ul>
            </section>
          );
        })
      ) : (
        ds.length > 0 && (
          <section className="mt-5">
            <h2 className={`${H2} flex items-baseline gap-2`}>
              Tỷ số từng trận
              <span className="text-[13px] font-normal text-muted">{ds.length} trận</span>
            </h2>
            <ul>
              {ds.map((d) => (
                <li key={d.h.slug}><DongTipTran d={d} loai={loai} lang={lang} /></li>
              ))}
            </ul>
          </section>
        )
      )}

      <section className="mt-8">
        <h2 className={H2}>Hỏi đáp về {c.ten.toLowerCase()}</h2>
        <dl className="mt-3 divide-y divide-line rounded-card border border-line bg-card">
          {KE_BEN[loai].map((q) => (
            <div key={q.hoi} className="px-4 py-3">
              <dt className="font-display text-sm font-bold">{q.hoi}</dt>
              <dd className="mt-1 text-sm text-muted">{q.dap}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">Tỷ lệ chỉ để tham khảo và có thể đổi trước giờ bóng lăn. Nội dung mang tính giải trí.</p>
        <Link href={withLang("/du-doan", lang)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
          Dự đoán bóng đá hôm nay, tất cả trận →
        </Link>
      </section>
    </div>
  );
}
