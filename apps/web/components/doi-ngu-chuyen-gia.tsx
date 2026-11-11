import { SITE_URL } from "@/lib/brand";
import { CHUYEN_GIA, nguoiChuyenGia } from "@/lib/chuyen-gia";
import { jsonLd } from "@/lib/du-doan-schema";

/**
 * Mục "Đội ngũ chuyên gia" trên /about (Peter chốt 11/11/2026): mỗi người một neo #slug —
 * dòng "Dự đoán bởi …" trên trang trận trỏ về đây. Không ảnh, không trang riêng.
 */
export function DoiNguChuyenGia() {
  return (
    <section id="doi-ngu-chuyen-gia" className="mt-12 scroll-mt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": CHUYEN_GIA.map((c) => nguoiChuyenGia(c, SITE_URL)) }) }}
      />
      <h2 className="font-display text-2xl font-bold">Đội ngũ chuyên gia</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Mỗi trận trên trang dự đoán do một chuyên gia phụ trách giải đấu đó ký tên. Tỷ số chốt trước giờ bóng lăn
        và không sửa sau trận.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        {CHUYEN_GIA.map((c) => (
          <article key={c.slug} id={c.slug} className="scroll-mt-24 rounded-card border border-line bg-card p-5 shadow-card sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">{c.ten}</h3>
            <p className="mt-0.5 text-xs font-semibold text-brand">Phụ trách: {c.phuTrach}</p>
            {c.gioiThieu.map((cau) => (
              <p key={cau} className="mt-3 text-sm leading-relaxed text-ink/90">{cau}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
