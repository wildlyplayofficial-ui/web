import Link from "next/link";
import type { NhomNgay } from "@/lib/chon-tran";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * "Chọn trận khác" (kiểu PredictZ): <details> + danh sách LINK thật — chạy không cần
 * JS, Google bò được mọi trận. Trận đang xem tô đậm, aria-current. Mỗi dòng ≥44px.
 */
export function ChonTran({ nhom, hienTai, lang }: { nhom: NhomNgay[]; hienTai?: string; lang: Lang }) {
  const tong = nhom.reduce((n, d) => n + d.giai.reduce((m, g) => m + g.tran.length, 0), 0);
  if (tong < 2 && hienTai) return null; // chỉ có chính trận này thì không có gì để chọn
  if (tong === 0) return null;
  const dangXem = hienTai
    ? nhom.flatMap((d) => d.giai.flatMap((g) => g.tran)).find((t) => t.slug === hienTai)
    : undefined;
  return (
    <details className="group relative rounded-card border border-line bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-display text-xs font-bold uppercase tracking-wide text-brand">Chọn trận khác</span>
          {dangXem && <span className="block truncate text-sm font-semibold">{dangXem.nhan}</span>}
        </span>
        <span aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <nav aria-label="Chọn trận khác" className="max-h-[60vh] overflow-y-auto border-t border-line">
        {nhom.map((d) => (
          <div key={d.ngay}>
            <p className="sticky top-0 z-10 bg-card-hover px-4 py-1.5 font-display text-xs font-bold">{d.nhan}</p>
            {d.giai.map((g) => (
              <div key={g.ten}>
                <p className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.ten}</p>
                <ul>
                  {g.tran.map((t) => {
                    const la = t.slug === hienTai;
                    return (
                      <li key={t.slug}>
                        <Link
                          href={withLang(`/analysis/${t.slug}`, lang)}
                          aria-current={la ? "page" : undefined}
                          className={`flex min-h-11 items-center px-4 text-sm transition-colors hover:bg-card-hover ${
                            la ? "border-l-2 border-brand font-bold text-brand" : ""
                          }`}
                        >
                          <span className="truncate">{t.nhan}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </nav>
    </details>
  );
}
