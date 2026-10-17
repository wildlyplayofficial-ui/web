import nextConfig from "@/next.config";

/** Đường dẫn có bị luật redirects() trong next.config bắt không. Sitemap dùng để
 *  khỏi khai URL chuyển hướng (17/10: còn khai man-united-0-1-… đang 301) — đọc
 *  thẳng luật thật nên thêm luật mới là sitemap tự bỏ theo, khỏi nhớ sửa hai nơi.
 *  Chỉ hiểu cú pháp đang dùng trong tệp: `:ten`, `:ten(a|b)`, `/:ten*`. */
function toRegex(source: string): RegExp {
  // Một lượt duy nhất: thay tuần tự thì `:\w+` ăn luôn chữ "en" trong "(?:en|…)" vừa sinh.
  const re = source
    .replace(/[.+?^${}[\]\\]/g, "\\$&")
    .replace(/\/:\w+\*|:\w+(?:\(([^)]*)\))?/g, (m, alt?: string) =>
      m.endsWith("*") ? "(?:/.*)?" : alt !== undefined ? `(?:${alt})` : "[^/]+");
  return new RegExp(`^${re}$`);
}

export async function getRedirectMatcher(): Promise<(path: string) => boolean> {
  const rules = (await nextConfig.redirects?.()) ?? [];
  const regs = rules.map((r) => toRegex(r.source));
  return (path) => regs.some((r) => r.test(path));
}
