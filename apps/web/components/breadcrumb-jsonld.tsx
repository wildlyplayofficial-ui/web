import { jsonLd } from "@/lib/du-doan-schema";
import { buildBreadcrumb } from "@/lib/jsonld";

/**
 * Renders a BreadcrumbList JSON-LD script tag. Server component — no client JS.
 * Item names can come from third-party data (team names in the weekly prediction file), so the
 * JSON goes through jsonLd(), which escapes "<" — a name containing "</script>" cannot close the tag.
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  // Plain JSON.stringify does NOT escape "<"; jsonLd() does.
  const json = jsonLd(buildBreadcrumb(items));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
