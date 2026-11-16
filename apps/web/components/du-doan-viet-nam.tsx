import Link from "next/link";
import { DOI_VIET_NAM, tranDuocIndex } from "@/lib/chi-muc";
import { ngayVN } from "@/lib/du-doan-hang";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang } from "@/lib/du-doan-tran";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * Khối "Dự đoán trận Việt Nam sắp đá" cho hub /doi/vietnam (16/11: hub index nhưng không link
 * bài nhận định Việt Nam vs Kyrgyzstan 17/11 — bài chỉ có đường vào từ trang chủ và /du-doan).
 * Chỉ đặt link trận được index; không có trận sắp đá thì không hiện gì.
 */
export async function DuDoanVietNam({ lang }: { lang: Lang }) {
  if (lang !== "vi") return null;
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan().catch(() => ({ hang: [] }));
  const ds = hang
    .filter((h) => h.ngay >= homNay && (DOI_VIET_NAM.test(h.nha) || DOI_VIET_NAM.test(h.khach)) && tranDuocIndex(h))
    .sort((a, b) => `${a.ngay} ${a.gio}`.localeCompare(`${b.ngay} ${b.gio}`))
    .slice(0, 6);
  if (ds.length === 0) return null;
  return (
    <section className="mb-8 rounded-card border border-line bg-card p-5" aria-labelledby="du-doan-viet-nam">
      <h2 id="du-doan-viet-nam" className="font-display text-lg font-bold">Dự đoán trận Việt Nam sắp đá</h2>
      <ul className="mt-3 grid gap-2 text-sm">
        {ds.map((h) => (
          <li key={h.slug}>
            <Link href={withLang(`/du-doan/${h.slug}`, lang)} prefetch={false} className="text-ink hover:text-brand hover:underline">
              {`${ngayThang(h.ngay)} ${h.gio} · ${h.nha} vs ${h.khach} (${h.giai})${h.du ? ` · dự đoán ${h.du[0]}-${h.du[1]}` : ""}`}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">Dự đoán bóng đá hôm nay</Link>
      </p>
    </section>
  );
}
