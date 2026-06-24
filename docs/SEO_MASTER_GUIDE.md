# WildlyPlay SEO & GEO — Master Guide (for Gwen's dev + content team)

*One consolidated doc: strategy → what to build → how to build → GEO/AI-Overviews → resources. Prepared by the analysis team (2-bot, 24/06/2026) as input; SEO execution = Jane (content) + Gwen (technical). Built on the existing Next.js/Vercel + Railway-worker + Supabase + AI-engine stack. Cost to implement ≈ $0 (uses infra already paid for; all APIs below are free).*

---

## 0. The one principle that ties everything together

Google does NOT penalize AI-written content for being AI — it penalizes **thin / no-value / scaled** content (AI or human). And in 2026, Google's **AI Overviews / AI Mode** answer bare facts (scores, simple results) inline, eating clicks to commodity pages.

**So every WildlyPlay page must carry the Curator's UNIQUE DATA — the pick, the line, the odds, the CLV, the result, the post-mortem.** That single property:
- passes the scaled-content-abuse firewall (it's not thin/generic),
- is exactly what AI Overviews preferentially CITE ("Information Gain"),
- is the E-E-A-T moat a YMYL/betting niche needs (transparency + track record).

One rule, three wins. Everything below serves it.

---

## 1. Strategy in brief (the why)

- **Free-first. Budget ≈ $0.** Google Search Console + Trends + Keyword Planner + Bing Webmaster + IndexNow are all free and cover ~90% of the ROI. No paid backlinks, no Google Ads (gambling-restricted + breaks the entertainment framing).
- **The moat = 3 things content farms can't fake:** (a) transparent public record (W/L/P · CLV · honest post-mortems); (b) unique per-match data → be *the source* for "X vs Y prediction/result"; (c) 4-language content (EN/VI/TH/ES) = 4× keyword surface.
- **⛔ NO PBN / satellite sites.** Building many separate domains to pass links = black-hat; Google de-indexes the network AND can de-index the main site; it destroys the transparency moat. The scale you want = thousands of **PAGES on one domain** (per-match clusters × 4 langs), NOT thousands of **domains**. (A real sub-brand with its own audience, e.g. Daily Line, is fine — that's not a PBN.)
- **VI/TH-first arbitrage.** EN football-betting SEO is saturated; VI/TH are far less competitive. WP already has 4-lang content → prioritise ranking VI/TH first (faster wins → traffic → the 200-DAU forum gate).
- **Sequencing is a hard rule:** technical foundation (hreflang + schema) must land BEFORE scaling content, or the 4-lang content becomes duplicate-content debt.

---

## 2. What to build — sequenced (automation-first)

Legend: 🤖 fully automated (build once, runs forever) · ⚙️ pipeline hook · 🧪 deterministic gate · 👤 manual (Jane).

**SPRINT 1 — automated on-page foundation (pure code, highest ROI, do first):**
- 🤖 JSON-LD schema sitewide (NewsArticle / SportsEvent / Organization+WebSite / FAQPage / Breadcrumb) — §3.1
- 🤖 hreflang + per-locale `<html lang>` + canonical — §3.2 (**biggest single unlock**)
- 🤖 programmatic meta/title templates per page-type × lang — §3.5

**SPRINT 2 — automated pipeline + indexing speed:**
- ⚙️ recap-speed → news-sitemap + IndexNow ping on publish/settle — §3.3
- 🤖 auto internal-linking via the `/match` hub graph — §3.4
- 🧪 uniqueness-gate lint (mirror the existing `booth-lint.ts`) — §3.6
- 🤖 multilingual sitemap (add `/daily-line`, hreflang annotations)

**SPRINT 3 — automated monitoring:**
- ⚙️ GSC API weekly digest (top queries/pages/coverage, auto-flag de-indexed pages)
- ⚙️ funnel/conversion + **AI-citation** tracking — §4

**MANUAL (Jane, 👤):** off-page (AMA r/soccerbetting, data-PR pitch on CLV/transparency to Medium/football-analytics, VI/TH local outreach Voz/CadoVN/Thai forums, tipster-aggregator listings) · evergreen pillar content (AH/CLV/responsible-play — AI drafts, human edits) · one-time: verify GSC+Bing property, submit sitemaps, generate IndexNow key.

**Highest effort×impact, do-first:** (1) hreflang+html-lang [S, unlocks 3 markets] · (2) NewsArticle JSON-LD + news-sitemap + IndexNow [M, unlocks Discover + fast result-search] · (3) uniqueness-lint [M, copy booth-lint, penalty-firewall].

---

## 3. How to build it (copy-paste examples + verification)

**Read first (the only authoritative anchors — prefer over any SEO blog):** Google Search Central https://developers.google.com/search/docs · Google AI-features guide https://developers.google.com/search/docs/fundamentals/ai-optimization-guide · validate with Rich Results Test https://search.google.com/test/rich-results

### 3.1 JSON-LD (`lib/jsonld.ts` builders, rendered per route from existing data)
NewsArticle on every `/news/[slug]` (unlocks Google News/Discover):
```json
{ "@context":"https://schema.org","@type":"NewsArticle",
  "headline":"Jordan 1-2 Algeria: Result & Recap",
  "datePublished":"2026-06-23T22:05:00Z","dateModified":"2026-06-23T22:05:00Z",
  "author":{"@type":"Organization","name":"The Curator @ WildlyPlay"},
  "publisher":{"@type":"Organization","name":"WildlyPlay","logo":{"@type":"ImageObject","url":"https://www.wildlyplay.com/logo.png"}},
  "image":["https://www.wildlyplay.com/api/og/play/<id>"],"inLanguage":"en",
  "mainEntityOfPage":"https://www.wildlyplay.com/news/<slug>" }
```
SportsEvent on `/match/[slug]`:
```json
{ "@context":"https://schema.org","@type":"SportsEvent","name":"Jordan vs Algeria","sport":"Soccer",
  "startDate":"2026-06-23T19:00:00Z","location":{"@type":"Place","name":"<stadium>"},
  "competitor":[{"@type":"SportsTeam","name":"Jordan"},{"@type":"SportsTeam","name":"Algeria"}] }
```
WebSite+Organization in root layout (once); FAQPage on `/daily-line`; BreadcrumbList everywhere. **Verify:** Rich Results Test → 0 errors.

### 3.2 hreflang + html lang + canonical (in `generateMetadata`)
```html
<html lang="vi">  <!-- from active ?lang, NOT hardcoded "en" -->
<link rel="canonical" href="https://www.wildlyplay.com/play/<slug>?lang=vi" />
<link rel="alternate" hreflang="en" href="https://www.wildlyplay.com/play/<slug>" />
<link rel="alternate" hreflang="vi" href="https://www.wildlyplay.com/play/<slug>?lang=vi" />
<link rel="alternate" hreflang="th" href="https://www.wildlyplay.com/play/<slug>?lang=th" />
<link rel="alternate" hreflang="es" href="https://www.wildlyplay.com/play/<slug>?lang=es" />
<link rel="alternate" hreflang="x-default" href="https://www.wildlyplay.com/play/<slug>" />
```
Every page emits the full cluster; canonical is self-referential per lang. **Verify:** view-source on `?lang=vi` shows `<html lang="vi">` + 5 alternates; GSC International Targeting = no errors.

### 3.3 News sitemap + IndexNow
`/news-sitemap.xml` (articles <48h), auto from `posts`:
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
 <url><loc>https://www.wildlyplay.com/news/<slug></loc>
  <news:news><news:publication><news:name>WildlyPlay</news:name><news:language>en</news:language></news:publication>
   <news:publication_date>2026-06-23T22:05:00Z</news:publication_date><news:title>Jordan 1-2 Algeria: Result & Recap</news:title>
  </news:news></url>
</urlset>
```
IndexNow (free, Bing/Yandex) — one key file at `/<key>.txt`; worker pings on publish/settle (hook the EXISTING revalidate step, once per URL on meaningful change, NOT every cache-bust):
```bash
curl -X POST "https://api.indexnow.org/indexnow" -H "Content-Type: application/json" \
  -d '{"host":"www.wildlyplay.com","key":"<key>","urlList":["https://www.wildlyplay.com/news/<slug>"]}'
```
⚠️ **Do NOT build a Google Indexing API integration for articles** — it's restricted to `JobPosting`+`BroadcastEvent`; article pings are silently ignored. For Google use news-sitemap + internal links + Discover. **Verify:** submit news-sitemap in GSC; IndexNow returns 2xx; URL Inspection shows indexed within hours.

### 3.4 Internal linking (from the fixture graph)
Bidirectional `/match` hub spokes (preview↔recap↔pick↔watching) + "related matches" (same league/day) + "latest picks" rail — auto-query from `fixture_id`. (This is the legitimate, internal version of what a PBN fakes with external links.)

### 3.5 Meta/title templates
`{Home} vs {Away} — Prediction, Odds & Analysis | WildlyPlay` · `{Home} {h}-{a} {Away}: Result & Recap | WildlyPlay` · VI `Soi kèo {Home} vs {Away} — Nhận định & Tỷ lệ | WildlyPlay`. Description ≤155 chars, answer first.

### 3.6 Uniqueness-gate lint (`seo-lint.ts`, mirror `booth-lint.ts`)
```ts
function seoUniquenessLint(article, pick) {
  const anchors = [pick.selection, String(pick.line), String(pick.odds_publish),
    pick.odds_close && 'CLV', pick.home_score!=null && `${pick.home_score}-${pick.away_score}`,
    pick.thesis_keyphrase].filter(Boolean);
  const hits = anchors.filter(a => article.body_md.includes(a)).length;
  return hits === 0 ? {pass:false, reason:'NO_UNIQUE_DATA_ANCHOR'} : {pass:true};
}
```
`pass:false` → hold/don't publish. Turns the #1 penalty risk into code.

---

## 4. GEO / AI-Overviews — what changed & what to build (2026, recency-verified)

**Why it matters:** AI Overviews / AI Mode answer queries inline → click-through drops, *especially* for commoditized data (live scores, bare results). The goal shifts from "rank #1" to "**be the source the AI cites**" (GEO = Generative Engine Optimization) + own pages the AI can't replace.

**What to build:**
1. **Atomic Answer / TL;DR at the top of every article** — a 1-2 sentence direct answer the AI can lift ("Algeria beat Jordan 2-1; the over 2.5 landed as both chased the game."). Analysis follows.
2. **Recap = ORIGINAL ANALYSIS, never a bare score.** A pure-score page is owned by AI Overviews + score apps → 0 click. WP recaps lead with **Curator thesis tie-back + post-mortem + "what it means."** Score = context; analysis = product. (The `seo-lint` already enforces a unique anchor; extend it to require an analysis section.)
3. **Present unique data as STRUCTURED, extractable blocks** — a CLV table, a record table, a clear factual result line — so AI engines can lift + attribute it. Don't bury it in prose.
4. **Page-weight shift:** prioritise prediction / analysis / original-editorial pages (AI-Overview-resistant); keep pure-result pages light, don't over-invest recap-speed in bare scores.
5. **E-E-A-T author signals:** "The Curator" = a consistent Organization+Person entity (schema) + About page + public track record → AI trust + attribution.
6. **New KPI — measure AI-CITATION, not just rank.** Track whether ChatGPT / Perplexity / Gemini / Google AI Overviews cite `wildlyplay.com` for relevant queries (a GEO-audit tool — see §6 — does this). Report alongside GSC rank.

**Read first:** Google's AI-optimization guide (link in §3) — its core message confirms our strategy: AI features still rest on core ranking → E-E-A-T + structured data + unique-data/Information-Gain get cited over duplicate answers.

---

## 4A. Funnel / conversion (SEO must convert — but measure it honestly)

SEO traffic has to turn into retained users, not be vanity traffic — but realistically the conversion is LOW and slow, so design + measure accordingly:
- **Intent-tiered CTA.** *Prediction / preview pages (higher intent)* → STRONG CTA (follow the TG channel · play Daily Line · follow the Curator pick) — this is where DAU conversion actually happens. *Recap / result pages (low intent + partly eaten by AI Overviews)* → LIGHT CTA; measure these by **reach / brand / Discover, NOT conversion.**
- **Daily Line is the sticky-catch** for the low-intent micro-moment (1-tap, no account) — it has ~2-3 seconds before the bounce.
- **Measure honestly:** instrument GA4 / Plausible events (TG-follow, Daily-Line-start, pick-follow) + GSC rank/impressions. **Expect a LOW DAU conversion rate.** The flywheel runs on **volume × low-rate, compounding over 3-6 months — not a spike.** Don't over-promise "SEO → 200 DAU fast." (Compounding loop: more picks → more pages → more rank → more traffic → more DAU → forum/UGC → more pages. Starting now = compounds longer.)

## 5. Risk register (must-not-violate)

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **Scaled-content-abuse / helpful-content penalty** (highest — at WP's AI scale) | Uniqueness-gate (§3.6) on every article. *Validated 2026: Google penalizes thin not AI; March-2026 update hit niche sites with 500+ thin AI pages, 60-80% traffic loss.* WP's unique data is the firewall. |
| 2 | **YMYL / gambling suppression** | Entertainment framing, no affiliate links, responsible-play prominent, NO "guaranteed win" language. The shield — don't trade it for traffic. |
| 3 | **Duplicate content across 4 langs** | Fix hreflang (§3.2) BEFORE scaling content. |
| 4 | **PBN / link schemes** | Don't (§1). De-index risk > any gain. |
| 5 | **AI Overviews eating result-traffic** | Recap = original analysis not bare score (§4); shift weight to analysis/prediction pages. |

---

## 6. Verification checklist + resources

**After each sprint:**
- [ ] Rich Results Test passes (0 errors) for NewsArticle / SportsEvent / FAQPage / Organization.
- [ ] view-source `?lang=vi/th/es`: correct `<html lang>` + full hreflang cluster + self-referential canonical.
- [ ] news-sitemap validates + submitted in GSC; IndexNow returns 2xx on publish.
- [ ] GSC URL Inspection: new recap indexed within hours of FT.
- [ ] seo-lint blocks a test article with no pick-data anchor.
- [ ] Every recap has a top atomic answer + analysis section (not bare score).
- [ ] GSC Coverage: no spike in "Crawled-not-indexed"/"Duplicate" after content scales.

**Resources (verified 24/06/2026):**
- ⭐ Google AI-optimization guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- ⭐ Google Search Central: https://developers.google.com/search/docs
- Rich Results Test: https://search.google.com/test/rich-results · IndexNow: https://www.indexnow.org/documentation
- GEO repos (⚠️ search-surfaced, vet README/stars/maintained before relying): `github.com/tentenco/awesome-geo` · `github.com/Auriti-Labs/geo-optimizer-skill` (dev tool — audits AI-citation) · `github.com/DavidHuji/Awesome-GEO`
- SEO foundation repos: `github.com/teles/awesome-seo` · `github.com/Awesome-SEO/seo-courses-and-training`
- Stay current (reputable, not agency-spam): Search Engine Land · Search Engine Journal.
- **Trust anchor > any repo:** Google's official docs. Repos go stale — verify against Search Central before acting.

---
*Lane note: SEO execution is Jane (content) + Gwen (technical). The analysis bots contribute SUBSTANCE — the Curator's deep theses + transparent record + honest post-mortems — which IS the unique-data anchor (uniqueness-gate) AND the E-E-A-T fuel. Doing the analysis well is itself a direct SEO/GEO contribution.*
