# WildlyPlay SEO Sprint Report — for Mac Mini Review

*Status as of 24/06/2026. Code built, pending deploy to production.*

---

## SPRINT 1 — Automated On-Page Foundation ✅ COMPLETE

### 1.1 JSON-LD Structured Data ✅
- **File:** `lib/jsonld.ts` — pure builders, no new data needed
- **Implemented:**
  - `buildOrganization()` + `buildWebSite()` with SearchAction → root layout
  - `buildNewsArticle(post)` → every `/news/[slug]` (4 langs)
  - `buildSportsEvent(match)` → every `/match/[slug]`
  - `buildFAQPage(items)` → `/goalline` (3 how-it-works questions)
  - `buildBreadcrumbList(path)` → all pages via `components/breadcrumb-jsonld.tsx`
- **Verification needed:** Rich Results Test on prod URLs after deploy

### 1.2 hreflang + html lang + canonical ✅
- **Implemented:**
  - `<html lang={lang}>` dynamically set from `?lang` param (was hardcoded "en")
  - hreflang cluster in `generateMetadata` for news, play, match pages
  - `buildAlternates()` utility in `lib/i18n.ts` — generates full cluster + self-canonical
  - Sitemap emits hreflang alternates for all routes (play, news, match, static)
- **Note:** Path-based i18n (`/vi/`, `/th/`) attempted → FAILED (App Router incompatible with rewrite). Staying on `?lang=` for now. Option A (`[lang]` directory restructure) planned for next session.

### 1.3 Programmatic Meta Templates ✅
- **Play pages:** `{Home} vs {Away} — Prediction, Odds & Analysis` (pre-settle) / `{Home} vs {Away} — Result & Analysis` (settled)
- **Match pages:** `{Home} vs {Away} — Preview, Pick & Result`
- **News pages:** AI-generated `meta_title` per post type (already keyword-rich from content engine)
- **Description:** thesis translation (play), match context (match), body excerpt (news) — all ≤160 chars

---

## SPRINT 2 — Automated Pipeline + Indexing Speed ✅ COMPLETE

### 2.1 News Sitemap + IndexNow ✅
- **News sitemap:** `/news-sitemap.xml` — auto-generated from published posts <48h, proper `<news:news>` tags with real titles from DB
- **IndexNow:** Worker pings on settle (play page + recap article URLs). Key file at `/4c6e15b396a148b29b0e69e5abaf2835.txt`. Fire-and-forget via `src/indexnow.ts`
- **Pipeline:** FT → settle → recap-gen → publish → revalidate → IndexNow ping — all automatic, within minutes of full-time
- **Added to `robots.ts`:** news-sitemap.xml in sitemap list

### 2.2 Auto Internal Linking ✅
- **RelatedArticles component** in `/news/[slug]/page.tsx` — finds other articles sharing same `pick_ids` (preview↔recap↔analysis)
- **Data layer:** `getPostsByPickIds()` in `lib/data.ts` — uses Supabase `.overlaps()` for array intersection
- **MatchLink component** — derives match page slug from article slug, links to `/match/` hub if exists
- Bidirectional: article → match hub, pick → match hub (already existed)

### 2.3 Uniqueness-Gate Lint ✅
- **File:** `apps/worker/src/seo-lint.ts` — mirrors `booth-lint.ts` pattern
- **Checks:** THIN (<100 words/<300 chars), NO-DATA (no unique anchor: odds/score/units/matchup), BANNED (EN+VI+TH hype language), TEMPLATE (generic filler), AI-TELL (delve into/tapestry)
- **Mode:** WARN (log but don't block) — hooked into `insertPost` in `store.ts`
- **To flip to BLOCK:** change condition in store.ts after monitoring real articles

### 2.4 Multilingual Sitemap ✅
- **Extended `sitemap.ts`:** all play/match/news/daily-line URLs with hreflang alternates per language
- **Added missing routes:** `/daily-line`, `/daily-line/leaderboard`, `/daily-line/archive`, `/matches`, `/news`, `/standings`
- **Made dynamic:** `force-dynamic` to avoid prerender crashes (Supabase keys not available at build time)

---

## SPRINT 3 — Automated Monitoring ⏳ PARTIAL

### 3.1 GSC API Monitoring 📊 DATA PULLED, AUTOMATION TODO
- Successfully queried GSC Search Analytics API (OAuth refresh token)
- Current data (17-23 Jun): 17 impressions, 5 clicks — very early stage
- **Top queries:** "canada vs qatar preview", "turkey vs australia"
- **Top pages:** homepage (3 clicks), recap articles getting impressions
- **TODO:** Build worker cron for weekly digest to TG ops channel. Deferred because traffic is too low for meaningful alerts — foundation code matters more now.

### 3.2 Funnel/Conversion Tracking ❌ NOT STARTED
- Requires GA4/Plausible events instrumentation
- Lower priority than foundation

---

## BUILD FIX 🔧
- **Issue:** `next build` failed because `sitemap.ts` and `news-sitemap.xml/route.ts` tried to prerender at build time, but `.env.production` (Vercel CLI placeholder) has empty Supabase keys
- **Fix:** Added `export const dynamic = "force-dynamic"` to both routes
- **Result:** Build passes, both routes render on-demand with ISR caching

---

## VERIFICATION CHECKLIST (post-deploy)

- [ ] Rich Results Test: 0 errors for NewsArticle, SportsEvent, FAQPage, Organization
- [ ] view-source `?lang=vi`: correct `<html lang="vi">` + hreflang cluster + canonical
- [ ] `/news-sitemap.xml` returns valid XML with recent articles
- [ ] `/sitemap.xml` includes hreflang alternates
- [ ] IndexNow returns 2xx on next settle (check worker logs)
- [ ] seo-lint WARN logs on real articles (check Railway logs)
- [ ] GSC URL Inspection: new recap indexed within hours of FT
- [ ] Meta titles match patterns: "X vs Y — Prediction, Odds & Analysis"
- [ ] RelatedArticles shows cross-links between preview/recap of same match

---

## REMAINING (next session)

| Item | Priority | Blocker |
|------|----------|---------|
| i18n Option A (`[lang]` directory) | HIGH | Routing restructure, needs careful migration |
| FAQ schema deploy | HIGH | Part of this deploy (built, needs verify) |
| Localize 3 pillars (AH/CLV/Responsible-Play) to VI/TH/ES | MEDIUM | Content, Jane's lane |
| GSC digest cron | LOW | Traffic too low for meaningful data yet |
| Funnel tracking (GA4 events) | LOW | Needs GA4 setup |
| Publish GSC OAuth app (7-day token expiry in Testing mode) | MEDIUM | One-time setup |

---

*Sprint 1-2 = automated foundation, runs forever, zero ongoing labor. Sprint 3 = monitoring, iterate when traffic grows. The SEO engine is built — now it compounds with every match played.*
