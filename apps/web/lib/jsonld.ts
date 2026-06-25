/**
 * JSON-LD structured data builders for SEO.
 * Pure functions — build from existing data, no DB calls.
 * Inject via <script type="application/ld+json"> in page metadata.
 */

const BASE = "https://www.wildlyplay.com";

export function buildOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WildlyPlay",
    url: BASE,
    logo: `${BASE}/icons/icon-512x512.png`,
    description: "Handpicked plays for the global crowd. Transparent sports picks with full public track record.",
    sameAs: [
      "https://t.me/wildlyplay",
      "https://x.com/WildlyPlayGlob",
      "https://facebook.com/wildlyplay",
    ],
  };
}

export function buildWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WildlyPlay",
    url: BASE,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BASE}/matches?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildNewsArticle(post: {
  title: string;
  slug: string;
  lang: string;
  body_md: string;
  published_at: string | null;
  meta_description?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    url: `${BASE}${post.lang !== "en" ? `/${post.lang}` : ""}/news/${post.slug}`,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: { "@type": "Organization", name: "The Curator @ WildlyPlay", url: BASE },
    publisher: { "@type": "Organization", name: "WildlyPlay", url: BASE, logo: { "@type": "ImageObject", url: `${BASE}/icons/icon-512x512.png` } },
    description: post.meta_description ?? post.body_md.slice(0, 160),
    inLanguage: post.lang,
    isAccessibleForFree: true,
  };
}

export function buildSportsEvent(match: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffUtc: string;
  location?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    startDate: match.kickoffUtc,
    location: match.location
      ? { "@type": "Place", name: match.location }
      : undefined,
    homeTeam: { "@type": "SportsTeam", name: match.homeTeam },
    awayTeam: { "@type": "SportsTeam", name: match.awayTeam },
    sport: "Football",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: { "@type": "Organization", name: match.league },
  };
}

export function buildBreadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE}${item.url}`,
    })),
  };
}

export function buildFAQPage(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** Helper: render JSON-LD as a string for Next.js metadata script injection. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
