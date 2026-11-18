import { phanTichRieng } from "@/lib/phan-tich-rieng";
import { Khoi } from "./khoi";

/** Phân tích viết tay riêng của một giải (chỉ giải có trong lib/phan-tich-rieng.ts; còn lại không render). */
export function PhanTichRieng({ slug }: { slug: string }) {
  const pt = phanTichRieng(slug);
  if (!pt) return null;
  return (
    <Khoi id="phan-tich" tieuDe={pt.tieuDe}>
      <p className="text-sm text-muted">
        {pt.tacGia} · cập nhật <time dateTime={pt.capNhatIso}>{pt.capNhat}</time> (số liệu sau vòng {pt.sauVong})
      </p>
      <div className="mt-3 space-y-5">
        {pt.doan.map((d) => (
          <div key={d.tieuDe}>
            <h3 className="font-display text-lg font-bold">{d.tieuDe}</h3>
            {d.noiDung.map((s) => (
              <p key={s.slice(0, 40)} className="mt-2 text-[15px] leading-relaxed text-ink">{s}</p>
            ))}
          </div>
        ))}
      </div>
    </Khoi>
  );
}
