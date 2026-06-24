import { buildBreadcrumb } from "@/lib/jsonld";

/**
 * Renders a BreadcrumbList JSON-LD script tag. Server component — no client JS.
 * Safe: buildBreadcrumb returns hardcoded schema from DB field names (no user HTML).
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  // JSON.stringify escapes all special characters — safe for script injection.
  // Input is from page route definitions (hardcoded), not user-generated content.
  const json = JSON.stringify(buildBreadcrumb(items));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
