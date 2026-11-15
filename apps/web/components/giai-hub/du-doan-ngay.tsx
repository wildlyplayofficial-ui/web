import Link from "next/link";
import { DoiLogo } from "@/components/doi-logo";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import type { NgayDuDoan } from "@/lib/giai-hub";
import { withLang, type Lang } from "@/lib/i18n";
import type { KQ } from "@/lib/phong-do";
import { teamBadge } from "@/lib/team-badges";

const MAU_KQ: Record<KQ, string> = { T: "bg-brand text-bg", H: "bg-warning text-bg", B: "bg-loss text-white" };
const TEN_KQ: Record<KQ, string> = { T: "thắng", H: "hoà", B: "thua" };

function PhongDo({ f, ten }: { f: KQ[] | null; ten: string }) {
  if (!f || f.length === 0) return null;
  const nam = f.slice(-5);
  return (
    <span className="flex gap-[3px]" aria-label={`Phong độ ${ten}: ${nam.map((k) => TEN_KQ[k]).join(", ")}`}>
      {nam.map((k, i) => (
        <span key={i} aria-hidden="true" className={`grid h-5 w-5 place-items-center rounded text-[12px] font-bold ${MAU_KQ[k]}`}>
          {k}
        </span>
      ))}
    </span>
  );
}

/** Tên đội không cắt cụt (Peter chê "Bournemo…"): tên được xuống dòng, phong độ nằm dòng dưới. */
function DongDoi({ ten, logo, f }: { ten: string; logo: string | null; f: KQ[] | null }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <DoiLogo src={teamBadge(ten) ?? logo} ten={ten} size={22} />
        <span className="min-w-0 break-words text-[15px] font-semibold leading-snug">{ten}</span>
      </div>
      <div className="mt-1 pl-[30px]">
        <PhongDo f={f} ten={ten} />
      </div>
    </div>
  );
}

function KetLuan({ du }: { du: [number, number] }) {
  const [n, k] = du;
  if (n > k) return <span className="text-brand">Chủ nhà thắng</span>;
  if (n < k) return <span className="text-under">Khách thắng</span>;
  return <span className="text-warning">Hoà</span>;
}

function TheTran({ h, lang }: { h: HangDuDoan; lang: Lang }) {
  const du = h.du as [number, number];
  return (
    <Link
      href={withLang(`/du-doan/${h.slug}`, lang)}
      rel={h.mong ? "nofollow" : undefined}
      className="grid grid-cols-[minmax(0,1fr)_84px] gap-3 rounded-card border border-line bg-card p-3.5 transition-colors hover:bg-card-hover"
    >
      <div className="min-w-0 space-y-2">
        <DongDoi ten={h.nha} logo={h.logoNha} f={h.formNha} />
        <DongDoi ten={h.khach} logo={h.logoKhach} f={h.formKhach} />
        <p className="text-[13px] text-muted">
          <b className="text-ink tabular-nums">{h.gio}</b>
          {h.taiXiu && <> · {h.taiXiu}</>}
          {h.haiDoiGhi !== null && <> · Cả 2 đội ghi bàn: {h.haiDoiGhi ? "Có" : "Không"}</>}
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg bg-bg/60 px-1 text-center">
        <span className="font-display text-[28px] font-bold leading-none tabular-nums">{`${du[0]}-${du[1]}`}</span>
        <span className="mt-1.5 text-[12px] font-semibold leading-tight">
          <KetLuan du={du} />
        </span>
      </div>
    </Link>
  );
}

export function DuDoanTheoNgay({ ngay, lang }: { ngay: NgayDuDoan[]; lang: Lang }) {
  if (ngay.length === 0) {
    return <p className="rounded-card border border-line bg-card p-4 text-sm text-muted">Chưa có dự đoán cho vòng tới. Trang cập nhật khi có lịch và số liệu mới.</p>;
  }
  return (
    <div className="space-y-5">
      {ngay.map((d) => (
        <section key={d.ngay} aria-label={`${thuVN(d.ngay)} ${ngayThang(d.ngay)}`}>
          <h3 className="mb-2 flex items-baseline justify-between font-display text-base font-bold">
            <span>{`${thuVN(d.ngay)} ${ngayThang(d.ngay)}`}</span>
            <span className="text-sm font-semibold text-muted">{`${d.ds.length} trận`}</span>
          </h3>
          <div className="space-y-2.5">
            {d.ds.map((h) => (
              <TheTran key={h.slug} h={h} lang={lang} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm text-muted">Bấm vào trận để xem nhận định, phong độ và đối đầu.</p>
    </div>
  );
}
