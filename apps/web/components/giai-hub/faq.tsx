import { jsonLd } from "@/lib/du-doan-schema";
import { buildFAQPage } from "@/lib/jsonld";

export interface CauHoiHub {
  hoi: string;
  dap: string;
}

/** Câu hỏi thường gặp — mỗi câu trả lời có số thật trên chính trang (không câu nào bịa). */
export function FaqHub({ ds }: { ds: CauHoiHub[] }) {
  if (ds.length === 0) return null;
  return (
    <>
      <div className="space-y-2">
        {ds.map((c, i) => (
          <details key={c.hoi} open={i === 0} className="group rounded-card border border-line bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
              <h3 className="text-[15px] font-semibold">{c.hoi}</h3>
              <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="border-t border-line px-4 py-3 text-[15px] leading-relaxed text-ink">{c.dap}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildFAQPage(ds.map((c) => ({ question: c.hoi, answer: c.dap })))) }}
      />
    </>
  );
}
