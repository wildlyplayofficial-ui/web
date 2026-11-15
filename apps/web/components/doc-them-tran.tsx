import Link from "next/link";
import { getBlogs } from "@/lib/data";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { GIAI_TRANG } from "@/lib/du-doan-loc";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * 15/11 (soi chỉ mục): trang trận không có link nào sang blog, blog mới thì Google chưa biết.
 * Khối "Đọc thêm": bài blog cùng trận (slug chứa tên cả hai đội) + trang giải; không có bài
 * cùng trận thì 3 bài blog mới nhất.
 */
const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function DocThemTran({ h, lang }: { h: HangDuDoan; lang: Lang }) {
  const blogs = await getBlogs(lang);
  const nha = boDau(h.nha);
  const khach = boDau(h.khach);
  const cungTran = blogs.filter((b) => b.slug.includes(`${nha}-vs-${khach}`) || b.slug.includes(`${khach}-vs-${nha}`));
  const bai = (cungTran.length > 0 ? cungTran : blogs).slice(0, 3);
  const giai = GIAI_TRANG.find((g) => g.khop.test(h.giai));
  if (bai.length === 0 && !giai) return null;
  return (
    <section aria-labelledby="doc-them" className="mt-8">
      <h2 id="doc-them" className="border-b border-line pb-2 font-display text-[19px] font-bold sm:text-[22px]">Đọc thêm</h2>
      <ul className="mt-2 space-y-1 text-[15px]">
        {bai.map((b) => (
          <li key={b.slug}>
            <Link href={withLang(`/blog/${b.slug}`, lang)} className="inline-flex min-h-11 items-center text-brand hover:underline">{b.title}</Link>
          </li>
        ))}
        {giai && (
          <li>
            <Link href={withLang(`/du-doan/${giai.slug}`, lang)} className="inline-flex min-h-11 items-center text-brand hover:underline">Dự đoán {giai.ten} vòng tới</Link>
          </li>
        )}
      </ul>
    </section>
  );
}
