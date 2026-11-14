import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DoiLogo } from "@/components/doi-logo";
import { CAU_HINH, LOAI_TIP } from "@/components/trang-tip-ngay";
import { OG_VERSION } from "@/lib/brand";
import { mucChuoi, type LoaiChuoi, type MucChuoi } from "@/lib/chuoi-doi";
import { tenSo } from "@/lib/du-doan-cham";
import { ngayVN, type HangDuDoan } from "@/lib/du-doan-hang";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import { dongTuan, logo, slugTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";
import { tenDoiViet } from "@/lib/ten-viet";
import { conMoi, kqCuaDoi, ngayNgan, type TranGanDay } from "@/lib/tran-so-lieu";

/**
 * /chuoi-dang-chu-y (Peter gật 14/11): đội nào đang có chuỗi thắng · bất bại · chưa thắng · thua, Over · Under ·
 * hai đội ghi bàn · giữ sạch lưới, tính từ 10 trận gần nhất trong tệp dự đoán tuần (lib/chuoi-doi.ts), kèm trận
 * sắp tới của đội. Chỉ đội có trận từ hôm nay trở đi. Không nhắc nhà cái, không số liệu "thành tích dự đoán".
 */

const DUONG = "/chuoi-dang-chu-y";
/** Thứ tự các khối trên trang và chữ hiển thị. */
const KHOI: ReadonlyArray<{ loai: LoaiChuoi; tieuDe: string; nhan: (so: number) => string }> = [
  { loai: "thang", tieuDe: "Đang thắng liên tiếp", nhan: (n) => `Thắng ${n} trận liền` },
  { loai: "khongThua", tieuDe: "Đang bất bại", nhan: (n) => `Bất bại ${n} trận liền` },
  { loai: "tai", tieuDe: "Liên tiếp Over 2.5", nhan: (n) => `${n} trận liền Over 2.5` },
  { loai: "haiDoiGhi", tieuDe: "Liên tiếp cả hai đội ghi bàn", nhan: (n) => `${n} trận liền cả hai đội ghi bàn` },
  { loai: "xiu", tieuDe: "Liên tiếp Under 2.5", nhan: (n) => `${n} trận liền Under 2.5` },
  { loai: "giuSach", tieuDe: "Giữ sạch lưới liên tiếp", nhan: (n) => `Giữ sạch lưới ${n} trận liền` },
  { loai: "thua", tieuDe: "Đang thua liên tiếp", nhan: (n) => `Thua ${n} trận liền` },
  { loai: "khongThang", tieuDe: "Đang chưa thắng", nhan: (n) => `Chưa thắng ${n} trận liền` },
];
const TOI_DA_MOI_KHOI = 12;

export interface DongChuoiHienThi extends MucChuoi {
  /** Trận sắp tới đã ghép được với dòng trang trận; null = không có trang → không link. */
  hang: HangDuDoan | null;
}

/** Ghép trận sắp tới của đội với dòng /du-doan (slug tuần, slug bài tay, hoặc khớp tên hai đội). */
function timHang(hang: readonly HangDuDoan[], d: MucChuoi["tran"] & { bai?: string }): HangDuDoan | null {
  const ung = [slugTuan(d as Parameters<typeof slugTuan>[0]), d.bai].filter(Boolean);
  return (
    hang.find((h) => ung.includes(h.slug)) ??
    hang.find((h) => h.ngay === d.ngay && tenSo(h.nha) === tenSo(tenDoiViet(d.nha)) && tenSo(h.khach) === tenSo(tenDoiViet(d.khach))) ??
    hang.find((h) => h.ngay === d.ngay && tenSo(h.nha) === tenSo(d.nha) && tenSo(h.khach) === tenSo(d.khach)) ??
    null
  );
}

export async function chuoiHomNay(): Promise<{ homNay: string; ds: DongChuoiHienThi[] }> {
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  // Chỉ trận chưa đá: có giờ UTC thì so với bây giờ, không có thì lấy từ ngày hôm nay; xếp theo giờ đá.
  const bay = Date.now();
  const sap = dongTuan()
    .filter((d) => (d.gioUtc ? Date.parse(d.gioUtc) > bay : d.ngay >= homNay))
    .sort((a, b) => (a.gioUtc ?? a.ngay).localeCompare(b.gioUtc ?? b.ngay));
  const muc = mucChuoi(sap, "", conMoi);
  return { homNay, ds: muc.map((m) => ({ ...m, hang: timHang(hang, m.tran) })) };
}

export function metaChuoi(homNay: string, soDoi: number, lang: Lang): Metadata {
  const ngay = ngayThang(homNay);
  const title = `Chuỗi đáng chú ý ${ngay}: đội thắng liền, bất bại, Over/Under, hai đội ghi bàn`;
  const description = `${soDoi > 0 ? `${soDoi} chuỗi đáng chú ý` : "Chuỗi đáng chú ý"} của các đội sắp thi đấu: thắng liên tiếp, bất bại, chưa thắng, Over/Under 2.5, cả hai đội ghi bàn, giữ sạch lưới, tính từ 10 trận gần nhất.`;
  return {
    title,
    description,
    alternates: buildAlternates(DUONG, lang),
    openGraph: {
      locale: "vi_VN",
      title: `${title} | banhbong.net`,
      description,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent("Chuỗi đáng chú ý")}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";
const H2 = "border-b border-line pb-2 font-display text-[19px] font-bold leading-snug sm:text-[22px]";
const NEN = { T: "bg-[#059652] text-white", H: "bg-amber-500 text-white", B: "bg-[#f85149] text-white" } as const;

/** Tỷ số các trận của chuỗi nhìn từ phía đội (ghi–thủng), mới nhất bên phải; tô màu thắng/hoà/thua. */
function DaiTySo({ gan, doi, so }: { gan: TranGanDay[]; doi: string; so: number }) {
  const ra = gan.filter((t) => kqCuaDoi(t, doi) !== null).slice(0, Math.min(so, 10)).reverse();
  return (
    <span className="flex flex-wrap gap-[3px]" aria-label={`${ra.length} trận gần nhất của ${doi}, mới nhất bên phải`}>
      {ra.map((t) => {
        const nha = tenSo(t.nha) === tenSo(doi);
        const kq = kqCuaDoi(t, doi)!;
        return (
          <span key={t.ngay + t.nha} title={`${ngayNgan(t.ngay)}: ${t.nha} ${t.tsn}-${t.tsk} ${t.khach}`} className={`inline-flex h-5 min-w-8 items-center justify-center rounded-[3px] px-1 font-display text-[11px] font-bold tabular-nums leading-none ${NEN[kq]}`}>
            {nha ? `${t.tsn}-${t.tsk}` : `${t.tsk}-${t.tsn}`}
          </span>
        );
      })}
    </span>
  );
}

function Dong({ m, nhan, lang }: { m: DongChuoiHienThi; nhan: string; lang: Lang }) {
  const doi = tenDoiViet(m.doi);
  const doiThu = tenDoiViet(m.doiThu);
  const gio = m.hang?.gio && m.hang.gio !== "--:--" ? m.hang.gio : null;
  const ngayDa = `${gio ? `${gio} ` : ""}${thuVN(m.tran.ngay)} ${ngayThang(m.tran.ngay)}`;
  const noi = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <DoiLogo src={logo(m.doi)} ten={doi} lop="h-7 w-7" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{doi}</p>
          <p className="text-[13px] font-semibold text-brand">{nhan}</p>
        </div>
      </div>
      <div className="mt-1.5 pl-[38px]">
        <DaiTySo gan={m.gan} doi={m.doi} so={m.so} />
        <p className="mt-1.5 text-xs text-muted">Trận tới, {m.laNha ? "sân nhà" : "sân khách"} · {ngayDa}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px]">
          <DoiLogo src={logo(m.doiThu)} ten={doiThu} lop="h-4 w-4" />
          <span className="truncate">gặp {doiThu}</span>
        </p>
      </div>
    </>
  );
  const cls = "block border-b border-line/60 px-0.5 py-2.5 sm:px-1.5";
  return m.hang ? (
    <Link href={withLang(`/du-doan/${m.hang.slug}`, lang)} className={`${cls} transition-colors hover:bg-card-hover`}>{noi}</Link>
  ) : (
    <div className={cls}>{noi}</div>
  );
}

export function TrangChuoi({ homNay, ds, lang }: { homNay: string; ds: DongChuoiHienThi[]; lang: Lang }) {
  const ngay = ngayThang(homNay);
  const soDoi = new Set(ds.map((d) => tenSo(d.doi))).size;
  const co = KHOI.filter((k) => ds.some((d) => d.loai === k.loai));
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: "Chuỗi đáng chú ý", url: DUONG }]} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">Chuỗi đáng chú ý</span>
      </nav>

      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight sm:text-[30px]">Chuỗi đáng chú ý, {thuVN(homNay)} {ngay}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {ds.length > 0
          ? `${soDoi} đội đang có chuỗi đáng chú ý trong 10 trận gần nhất, mỗi đội kèm trận sắp tới. Ô màu là tỷ số các trận trong chuỗi nhìn từ phía đội đó (ghi–thủng), trận mới nhất ở bên phải: xanh thắng, vàng hoà, đỏ thua.`
          : "Chưa có đội nào đủ chuỗi đáng chú ý trong dữ liệu hiện có. Trang cập nhật theo từng ngày."}
      </p>

      <nav aria-label="Dự đoán theo loại kèo" className="mt-3 flex flex-wrap gap-2">
        {LOAI_TIP.map((l) => (
          <Link key={l} href={withLang(CAU_HINH[l].duong, lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
            {CAU_HINH[l].tieuDe}
          </Link>
        ))}
      </nav>

      {co.length > 1 && (
        <nav aria-label="Các loại chuỗi" className="mt-3 flex gap-x-4 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
          {co.map((k) => (
            <a key={k.loai} href={`#${k.loai}`} className="inline-flex min-h-9 items-center text-brand hover:underline">
              {k.tieuDe}
            </a>
          ))}
        </nav>
      )}

      {co.map((k) => {
        const trong = ds.filter((d) => d.loai === k.loai);
        return (
          <section key={k.loai} id={k.loai} className="mt-6 scroll-mt-16">
            <h2 className={`${H2} flex items-baseline gap-2`}>
              {k.tieuDe}
              <span className="text-[13px] font-normal text-muted">{trong.length} đội</span>
            </h2>
            <ul className="lg:columns-2 lg:gap-x-6">
              {trong.slice(0, TOI_DA_MOI_KHOI).map((m) => (
                <li key={m.doi} className="break-inside-avoid">
                  <Dong m={m} nhan={k.nhan(m.so)} lang={lang} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-8">
        <h2 className={H2}>Chuỗi được tính thế nào?</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
          <p>
            Chuỗi tính từ trận gần nhất của đội lùi về trước, dừng ở trận đầu tiên không còn đạt điều kiện. Dữ liệu là 10 trận gần nhất của mỗi đội nên chuỗi dài nhất có thể thấy là 10. Mỗi đội có thể xuất hiện ở nhiều khối nếu đồng thời có nhiều chuỗi.
          </p>
          <p>
            Ngưỡng để lên trang: thắng 4 trận liền, bất bại hoặc chưa thắng 6 trận, thua 4 trận, Over hoặc Under 2.5 5 trận, cả hai đội ghi bàn 5 trận, giữ sạch lưới 3 trận. Đội đang thắng liên tiếp sẽ không bị tính lặp ở khối bất bại.
          </p>
        </div>
        <p className="mt-4 text-xs text-muted">Chuỗi chỉ phản ánh phong độ gần đây, không đảm bảo kết quả trận sắp tới. Nội dung mang tính giải trí.</p>
        <Link href={withLang("/du-doan", lang)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
          Dự đoán bóng đá hôm nay, tất cả trận →
        </Link>
      </section>
    </div>
  );
}
