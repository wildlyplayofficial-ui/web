import type { Metadata } from "next";
import Link from "next/link";
import { OG_VERSION } from "@/lib/brand";
import { getMucDuDoan, type MucDuDoan } from "@/lib/du-doan";
import { buildAlternates, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { BangDungSai } from "@/components/bang-dung-sai";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

// 41 ký tự + " | banhbong.net" từ template gốc = 56 (≤60).
const TIEU_DE = "Dự đoán bóng đá hôm nay – nhận định tỷ số";
const MO_TA =
  "Dự đoán tỷ số từng trận Ngoại hạng Anh và các giải lớn, kèm bảng đúng/sai công khai: tỷ số dự đoán đặt cạnh tỷ số thật sau mỗi trận.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: TIEU_DE,
    description: MO_TA,
    alternates: buildAlternates("/du-doan", lang),
    openGraph: {
      locale: "vi_VN",
      title: `${TIEU_DE} | banhbong.net`,
      description: MO_TA,
      images: [{ url: `/api/og/editorial?title=D%E1%BB%B1%20%C4%91o%C3%A1n&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const gioVN = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Gom theo giải, giữ thứ tự xuất hiện (sắp đá trước, rồi bài mới nhất). */
function theoGiai(muc: MucDuDoan[]): [string, MucDuDoan[]][] {
  const nhom = new Map<string, MucDuDoan[]>();
  for (const m of muc) {
    const giai = m.bai.league || "Giải khác";
    nhom.set(giai, [...(nhom.get(giai) ?? []), m]);
  }
  return [...nhom.entries()];
}

function DongBai({ m, lang }: { m: MucDuDoan; lang: Lang }) {
  return (
    <li>
      <Link
        href={withLang(`/analysis/${m.bai.slug}`, lang)}
        className="block rounded-card border border-line bg-card px-5 py-4 shadow-card transition-colors hover:bg-card-hover"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {m.sapDa && <span className="rounded-full bg-brand-dim px-2 py-0.5 font-semibold text-brand">Sắp đá</span>}
          {m.kickoffUtc && <span>{gioVN(m.kickoffUtc)}</span>}
          <span>{m.bai.byline}</span>
        </div>
        <p className="mt-1 font-display text-lg font-bold">{m.bai.title}</p>
        {m.chot && (
          <p className="mt-1 text-sm">
            Dự đoán: <span className="font-display font-bold">{m.chot.home_goals}-{m.chot.away_goals}</span>
          </p>
        )}
      </Link>
    </li>
  );
}

export default async function DuDoanHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const muc = await getMucDuDoan();
  const nhom = theoGiai(muc);

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Dự đoán", url: "/du-doan" }]} />
      <h1 className="gradient-text font-display text-4xl font-bold">Dự đoán bóng đá hôm nay</h1>
      <p className="mt-3 text-muted">
        Tất cả bài nhận định từng trận của banhbong ở một chỗ: trận sắp đá nằm trên cùng, xếp theo giải.
        Đây là phân tích chuyên môn về lối chơi, phong độ và đội hình — chỉ để tham khảo khi xem bóng,
        không phải lời khuyên tài chính. Mỗi tỷ số dự đoán được chấm công khai sau trận, đúng hay sai đều giữ lại.
      </p>

      {nhom.length === 0 ? (
        <p className="mt-10 rounded-card border border-line bg-card px-6 py-8 text-center text-sm text-muted">
          Chưa có bài dự đoán nào. Bài nhận định trận mới sẽ xuất hiện ở đây.
        </p>
      ) : (
        nhom.map(([giai, ds]) => (
          <section key={giai} className="mt-10">
            <h2 className="font-display text-xl font-bold">{giai}</h2>
            <ul className="mt-4 space-y-3">
              {ds.map((m) => (
                <DongBai key={m.bai.slug} m={m} lang={lang} />
              ))}
            </ul>
          </section>
        ))
      )}

      <BangDungSai muc={muc} lang={lang} />

      <p className="mt-10 text-xs text-muted">
        Xem thêm{" "}
        <Link href={withLang("/analysis", lang)} className="text-brand hover:underline">mọi bài phân tích</Link>.
      </p>
    </div>
  );
}
