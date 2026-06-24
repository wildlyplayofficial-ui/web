# WildlyPlay — SEO Strategy v1

*Prepared by the saba/analysis bots (Mac Mini = technical/risk/sequencing · MacBook = growth/funnel/off-page) as strategic input. Execution: Jane (content/SEO) + Gwen (technical). 2-bot consensus, 24/06/2026.*

---

## TL;DR (bottom line)

1. **Free-first. SEO budget ≈ $0 at this stage** — GSC + Google Trends + Keyword Planner + Bing Webmaster (all free) cover ~90% of the ROI. No paid backlinks, no Google Ads (gambling-restricted + breaks the entertainment framing).
2. **WP's SEO moat = three things content farms can't fake:** (a) a public, transparent track record (W/L/P · CLV · honest post-mortems) = E-E-A-T gold in a YMYL niche where every other tipster hides results; (b) unique data per match (picks/CLV/results) → WP can be *the source* for "X vs Y prediction/result"; (c) 4-language AI content engine = 4× keyword surface.
3. **NO PBN / satellite sites** (see §1). The scale instinct is right; the vehicle is **thousands of pages on ONE domain**, not thousands of domains.
4. **Sequencing is a hard rule:** technical foundation (hreflang + schema) must land **before** scaling content, or the 4-lang content becomes duplicate-content debt.
5. **#1 risk = scaled-content-abuse penalty** (Google "helpful content"). Every AI article must pass the **uniqueness-gate** (§3).

---

## 1. The PBN question — explicit NO

**Do NOT create satellite sites / a private blog network (PBN) for SEO.** This is black-hat; Google's link-spam policy + SpamBrain detect and penalize it, and a network linking to wildlyplay.com can **de-index the main site**. For WP specifically it is doubly dangerous: (a) YMYL/gambling-adjacent niches are scrutinized hardest, (b) a PBN is the literal opposite of — and would destroy — the transparency/E-E-A-T moat that is WP's biggest advantage. It also contradicts the uniqueness-gate (§3) and is impossible on a $30-50/mo budget.

**The scale you want is legitimate — change the vehicle:** thousands of **pages** on wildlyplay.com (per-match clusters × 4 langs), not thousands of **domains**. Authority then compounds to one domain instead of being scattered and flagged.

**Legitimate vs PBN (the line):** a site with a *real audience + real content* is fine (e.g. the Daily Line sub-brand; or one genuine ccTLD per market later). A domain *created only to pass links* is a PBN. Pages-on-one-domain = good scale; domains-en-masse = PBN = no.

---

## 2. Phase 0 — Technical foundation (DO NOW, pre-launch, free)

These are the gaps already identified in `seo-spec-v1.md`. They must land **before** scaling content (else 4-lang content = duplicate-content debt) and they take time to index — start now to rank before the ~mid-Aug launch.

- **hreflang clusters (BIGGEST unlock).** Today `<html lang>` is always "en" and there are 0 hreflang tags → Google sees the VI/TH/ES versions as duplicate-English and wastes the entire multilingual surface. Add `hreflang` (en/vi/th/es + `x-default`) and set `<html lang>` per locale. This alone unlocks 3 markets — and VI/TH are far less competitive than EN, so they rank faster.
- **Structured data sitewide (JSON-LD):**
  - **NewsArticle** on every newsroom article → unlocks **Google News / Discover / Top Stories** eligibility = a large free traffic channel for a sports site.
  - **SportsEvent** on `/match` hubs → rich results + event-search capture (some already present — extend sitewide).
  - **WebSite + Organization** → sitelinks + brand entity.
  - **FAQPage** on Daily Line how-it-works → FAQ rich snippet.
- **Canonical tags** on home / daily-line / card pages (currently missing).
- **`/daily-line` into sitemap.xml** (currently absent).

---

## 3. Phase 1 — Content SEO (now → launch; leverage the AI engine)

**The uniqueness-gate (mandatory, applied to every article):** before publishing any AI-generated page, ask — *"Would this page be useful / could it even exist if you removed WP's unique data (the pick, CLV, result, post-mortem)?"* If **yes** (it reads like a generic preview indistinguishable from 1000 other sites) → **do not publish** — it is bait for a helpful-content / scaled-content-abuse penalty. If **no** (it only exists because of WP's real pick/data) → safe. **Every AI article must be anchored to WP's unique pick/CLV/result data.** This is the line between good programmatic SEO and penalized content-spam.

- **Programmatic page-clusters on-domain:** each match → `/match` hub + prediction (pre) + recap (post), × 4 langs. A full WC+EPL season = hundreds of matches × 4 = **thousands of legitimate pages on wildlyplay.com**, each data-anchored. This is the "thousands of pages" scale — safely.
- **Capture BOTH search spikes, match-timed:**
  - *Pre-match:* "X vs Y prediction" / VI "soi kèo X vs Y" / TH equivalents — publish the preview before kickoff.
  - *Post-match:* "X vs Y result / recap" — **publish the recap within minutes of full-time.** Result-search volume is large and time-sensitive; recap-speed wins it + earns Discover/Top-Stories placement.
- **VI/TH-first arbitrage:** EN football-betting SEO is saturated; VI/TH are far less competitive. WP already has 4-lang content — prioritize ranking VI/TH first (faster wins → traffic → the 200-DAU forum gate). (Aligns with the EN+VI launch, TH phase 2.)
- **Evergreen pillar content:** "What is Asian Handicap", "What is CLV", "Responsible play" → capture informational queries, internal-link to picks, and build E-E-A-T. Durable, not match-timed.
- **Internal linking:** the `/match` hub is the spoke-hub — link preview ↔ recap ↔ pick ↔ watching per fixture → topical authority per fixture (this is the natural, legitimate version of what a PBN tries to fake with external links).

**Intent-tiered funnel (SEO must convert, not just rank — but honestly):**
- *Prediction/preview pages = higher intent* → strong funnel CTA (follow TG channel, play Daily Line, follow the Curator pick). This is where conversion to DAU actually happens.
- *Recap/result pages = high volume but LOW intent* (people get the score and bounce) → light CTA; measure these by **reach / brand-impression / Discover**, NOT by direct conversion. Do not over-promise "SEO → 200 DAU fast."
- **Daily Line is the right sticky-catch** for the low-intent micro-moment (1-tap, no account) — but it has ~2-3 seconds before the bounce.
- **Measure honestly (GSC + funnel analytics), expect LOW conversion.** The flywheel runs on **volume × low-rate over the long term** (SEO compounds over 3-6 months), not a spike.

---

## 4. Phase 2 — Off-page (post-traction, free)

- **Digital-PR via unique data:** the public track record + CLV is a citable, linkable asset — pitch a data-journalism angle ("a transparent AI tipster publishing its full record / CLV vs the bookmaker") to Medium (Towards Data Science for the AI angle) + football-analytics blogs. The *data* is the hook, not a link request.
- **Value-first community seeding (never link-drop):** genuine, useful participation in r/soccerbetting, r/sportsbook (an AMA on transparent-record tipping is AMA-worthy), Voz/CadoVN (VN), Thai football forums, Quora — link the `/match` hub only when it genuinely helps. (These are already buzz sources — natural fit.)
- **VI/TH local outreach** to build language-specific backlinks for the arbitrage play.
- **Niche tipster-aggregator listings** that accept transparent-record sites = free backlink + referral (filter for quality).
- **Legit sub-brand portfolio:** Daily Line (real audience) cross-linking naturally is fine — NOT a PBN.

---

## 5. Risk register (must-not-violate)

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **Scaled-content-abuse / helpful-content penalty** (highest — at WP's AI-content scale) | **Uniqueness-gate** on every article (§3). 100 strong data-backed pages > 1000 thin previews. |
| 2 | **YMYL / gambling suppression** | Keep entertainment framing, no affiliate links, responsible-play prominent, NO "guaranteed win" language. This framing is the shield — don't trade it for traffic. |
| 3 | **Duplicate content across 4 langs** | Fix hreflang BEFORE scaling content (Phase 0 before Phase 1). |
| 4 | **PBN / link schemes** | Don't (§1). De-index risk > any short-term gain. |

---

## 6. How the analysis/saba lane contributes (no lane-crossing)

The 2 saba bots don't do SEO execution (that's Jane/content). But doing our core job well **is** a direct SEO contribution: every pick's deep thesis + transparent record + honest post-mortem is exactly the **unique data that anchors each article** (passing the uniqueness-gate) **and** the **E-E-A-T fuel** Google rewards in YMYL. The analysis lane and the SEO lane meet here: WP's content is non-generic *because* of our substance.

---

## Priority order (sequenced)

1. **Phase 0 technical** — hreflang + NewsArticle/SportsEvent/Org/FAQPage schema + per-locale `<html lang>` + canonical + sitemap. *(Blocks everything else; do first.)*
2. **Phase 1 content** — uniqueness-gate + recap-speed (<minutes) + VI/TH-first + evergreen pillars + intent-tiered funnel.
3. **Phase 2 off-page** — data-PR + value-first community + sub-brand portfolio.

Top-3 highest-ROI, start-now: **(1) hreflang + NewsArticle schema · (2) recap-speed + uniqueness-gate · (3) VI/TH-first + intent-tiered funnel-to-DAU.**
