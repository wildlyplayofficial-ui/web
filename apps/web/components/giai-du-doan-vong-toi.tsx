import Link from "next/link";
import { ngayVN } from "@/lib/du-doan-hang";
import { GIAI_TRANG, tomTatGiai, tranCuaGiai } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { ngayThang } from "@/lib/du-doan-tran";
import { withLang, type Lang } from "@/lib/i18n";

const TOI_DA = 12;

/**
 * Khối "Dự đoán {giải} vòng tới" cho trang giải không có hub (16/11: Cúp C1 chỉ có bảng trần,
 * không một link nào về /du-doan/cup-c1). Đoạn tóm tắt + danh sách trận đều lấy từ dữ liệu dự đoán thật.
 * Giải không có trang dự đoán riêng → không hiện gì. Trận "mỏng" (noindex) không đặt link.
 */
export async function DuDoanVongToi({ bxh, lang }: { bxh: string; lang: Lang }) {
  const g = GIAI_TRANG.find((x) => x.bxh === bxh);
  if (!g || lang !== "vi") return null;
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan().catch(() => ({ hang: [] }));
  const ds = tranCuaGiai(hang, g, homNay);
  const tomTat = tomTatGiai(ds, g.ten);
  return (
    <section className="mt-10 rounded-card border border-line bg-card p-5" aria-labelledby="du-doan-vong-toi">
      <h2 id="du-doan-vong-toi" className="font-display text-lg font-bold">{`Dự đoán ${g.ten} vòng tới`}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink">
        {tomTat ?? `Chưa có trận ${g.ten} nào sắp đá trong dữ liệu dự đoán. Tỷ số dự đoán lên trước giờ bóng lăn.`}
      </p>
      {ds.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {ds.slice(0, TOI_DA).map((h) => {
            const chu = `${ngayThang(h.ngay)} ${h.gio} · ${h.nha} vs ${h.khach}${h.du ? ` · dự đoán ${h.du[0]}-${h.du[1]}` : ""}`;
            return (
              <li key={h.slug}>
                {h.mong ? (
                  <span className="text-muted">{chu}</span>
                ) : (
                  <Link href={withLang(`/du-doan/${h.slug}`, lang)} prefetch={false} className="text-ink hover:text-brand hover:underline">
                    {chu}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={withLang(`/du-doan/${g.slug}`, lang)} className="font-semibold text-brand hover:underline">{`Tất cả dự đoán ${g.ten}`}</Link>
        <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">Dự đoán bóng đá hôm nay</Link>
      </p>
    </section>
  );
}
