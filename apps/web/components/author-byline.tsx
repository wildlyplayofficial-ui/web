import Link from "next/link";
import { authorByName } from "@/lib/authors";
import { withLang, type Lang } from "@/lib/i18n";

/** Tên tác giả trong dòng byline — là link sang trang hồ sơ khi tên có trong lib/authors.ts. */
export function AuthorByline({ name, lang }: { name: string; lang: Lang }) {
  const a = authorByName(name);
  if (!a) return <>{name}</>;
  return (
    <Link href={withLang(a.path, lang)} rel="author" className="font-semibold text-ink transition-colors hover:text-brand">
      {a.name}
    </Link>
  );
}
