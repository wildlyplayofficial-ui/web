# WildlyPlay — SEO Tactics & Implementation Plan v1 (automation-first)

*Companion to `WildlyPlay_SEO_Strategy_v1.md`. This is the HOW: concrete tactics + build tickets, prioritising what can be AUTOMATED. For Gwen (technical) + Jane (off-page/manual).*

**Automation thesis:** WP already has the two ingredients that make SEO automatable at scale — an **AI 4-lang content engine** and a **Railway worker** with hooks (revalidate, settle, gen). So ~80% of WP's SEO opportunity (on-page technical + programmatic content + indexing speed) can be **built once and run forever, zero ongoing labour**. Only off-page (outreach/PR/links) needs humans. Build the automated layer first.

Legend: 🤖 = fully automated (build once) · ⚙️ = automated pipeline hook · 🧪 = semi-auto (deterministic gate) · 👤 = manual (Jane).

---

## SPRINT 1 — Automated on-page foundation (pure code, render-time, runs forever) 🤖

Highest ROI, all automatable, unblocks everything. Data already exists → pure transform.

### 1.1 JSON-LD structured data 🤖
Build `lib/jsonld.ts` with pure builders, inject `<script type="application/ld+json">` per route from existing data:
- `buildNewsArticle(post)` → on every `/news/[slug]` (4 langs). **Unlocks Google News / Discover / Top-Stories.** Fields: headline, datePublished/Modified, author (Organization "The Curator"), image (OG), inLanguage.
- `buildSportsEvent(match)` → on `/match/[slug]` (homeTeam/awayTeam/startDate/location/competitor). Extend the existing partial coverage sitewide.
- `buildOrganization()` + `buildWebSite()` (with `potentialAction` SearchAction) → root layout, once. Sitelinks + brand entity.
- `buildFAQPage(items)` → `/daily-line` how-it-works (static items). FAQ rich snippet.
- `buildBreadcrumbList(path)` → all pages.
No new data needed — all from `posts`/`picks`/fixtures. **Effort: low. Impact: high.**

### 1.2 hreflang + per-locale html lang + canonical 🤖
Template-level in `generateMetadata` / root layout:
- `<html lang={lang}>` from `?lang` (currently hardcoded "en" — the bug wasting the multilingual surface).
- hreflang cluster per page: emit `<link rel="alternate" hreflang="en|vi|th|es" href="{url}?lang=xx">` + `x-default`. Every page already has 4 langs via `?lang` → just swap the param. **Auto for every page.**
- `<link rel="canonical">` per page (lang-specific slug URL). Fixes the missing-canonical gap on home/daily-line/cards.
**This is THE biggest unlock (per strategy §2). Effort: low. Impact: very high.**

### 1.3 Programmatic meta/OG templates per page-type 🤖
`generateMetadata` keyword-pattern titles/descriptions, auto-filled, per lang:
- prediction/preview: `"{A} vs {B} — Prediction, Odds & Analysis | WildlyPlay"`
- recap: `"{A} {h}-{a} {B}: Result & Recap | WildlyPlay"`
- match hub: `"{A} vs {B} — Preview, Pick & Result"`
- VI/TH/ES equivalents ("soi kèo {A} vs {B}", etc.) from the dict pattern.
OG images already auto (`/api/og`). **Effort: low.**

---

## SPRINT 2 — Automated content pipeline + indexing speed ⚙️🧪

### 2.1 Recap-speed → instant indexing ⚙️ (the result-search win)
The recap already auto-generates on settlement. Add to that pipeline (after publish + revalidate):
- **Google News sitemap** `/news-sitemap.xml` 🤖 — articles published <48h with `<news:news>` tags, auto-generated from `posts`. Accelerates News/Discover pickup of recaps.
- **IndexNow ping** ⚙️ — on every publish/settle, worker POSTs the URL(s) to the IndexNow API (free, Bing/Yandex; one static key file at site root). Hook into the existing revalidate step in the pick/settle lifecycle.
- Net: FT → recap-gen → publish → revalidate → news-sitemap update + IndexNow ping, all automatic, **within minutes of full-time** = wins the high-volume result-search.
(Note: Google's Indexing API is restricted to JobPosting/BroadcastEvent — do NOT rely on it for articles; the news-sitemap + fast internal links + Discover is the article path.)

### 2.2 Auto internal-linking (the legit version of what PBNs fake) 🤖
Template/query-driven from the fixture graph:
- Bidirectional `/match` hub spokes: every preview/recap/pick/watching links to its hub; hub links back. Auto from `fixture_id`.
- "Related matches" (same league/day) + "latest picks" rails — auto-query.
- In-body: AI gen auto-links team names → team pages where they exist. (Lower priority.)
**Internal authority compounds — no external-link risk.**

### 2.3 Uniqueness-gate lint 🧪 (the penalty firewall — automatable)
Build `seo-lint.ts` (mirror of the existing `booth-lint.ts` pattern): before any AI article publishes, **deterministically check it references WP's unique data** (selection / line / odds / CLV / final score / post-mortem). No data-anchor → flag/hold, don't publish. This makes the strategy's #1-risk mitigation (scaled-content-abuse) a **programmatic gate**, not a hope. Run in the preview/recap/analysis/news gen pipelines.

### 2.4 Multilingual sitemap 🤖
Extend `sitemap.ts`: all play/match/news/daily-line URLs with `<xhtml:link rel="alternate" hreflang>` annotations + `lastmod` + `changefreq`. Add `/daily-line` (currently missing).

---

## SPRINT 3 — Automated monitoring (measure + self-flag) ⚙️

### 3.1 GSC API monitoring digest ⚙️
Worker weekly cron (reuse the digest pattern): Google Search Console Search-Analytics API → pull top queries / pages / impressions / clicks + Index-Coverage → store + post a digest to the TG ops channel. **Auto-flag:** pages not indexed, ranking drops, new queries gaining. Closes the loop — SEO becomes measured + self-reporting, not blind.
(Bonus: Bing Webmaster API similar, free.)

### 3.2 Funnel/conversion tracking ⚙️
Instrument the intent-tiered funnel (strategy §3): tag prediction-page CTAs vs recap-page reach separately so the honest measurement ("recap = reach not conversion, expect low DAU-rate") is actually visible. GA4 / Plausible events on TG-follow, Daily-Line-start, pick-follow.

---

## MANUAL (not automatable — Jane) 👤
- **Off-page:** AMA r/soccerbetting + r/sportsbook · data-PR pitch (CLV/transparency angle → Medium/Towards Data Science/football-analytics) · VI/TH local outreach (Voz/CadoVN/Thai forums) · niche tipster-aggregator listings.
- **Evergreen pillar content** (AH/CLV/responsible-play): AI can draft, human must quality-edit for E-E-A-T.
- **Keyword-strategy direction** (tools assist, human decides priority).
- **One-time setup:** verify GSC + Bing Webmaster property; submit sitemaps; generate IndexNow key.

---

## BUILD SEQUENCE (automation-first)

| Sprint | Tickets | Auto? | Why first |
|--------|---------|-------|-----------|
| **1** | 1.1 JSON-LD · 1.2 hreflang/lang/canonical · 1.3 meta templates | 🤖 all | Pure code, runs forever, unlocks multilingual + rich-results + Discover. Must precede content scale (strategy sequencing rule). |
| **2** | 2.1 recap-speed/IndexNow/news-sitemap · 2.2 internal-linking · 2.3 uniqueness-lint · 2.4 multi-sitemap | ⚙️🤖🧪 | Speed (wins result-search) + scale-safety (lint firewall). |
| **3** | 3.1 GSC digest · 3.2 funnel tracking | ⚙️ | Measure + self-flag; iterate. |
| **ongoing** | off-page, pillar edit | 👤 Jane | Relationship/quality work; can't automate. |

**Top automation wins, do-first (effort×impact):** (1) hreflang + per-locale html-lang [low effort, unlocks 3 markets] · (2) NewsArticle JSON-LD + news-sitemap + IndexNow [unlocks Discover + fast result-search] · (3) uniqueness-gate lint [makes the #1 penalty-risk a programmatic firewall].

**Cost: $0** — all built on existing infra (Vercel/Railway/Supabase/the AI engine already paid for). GSC/IndexNow/Bing/Trends = free APIs. No new services.
