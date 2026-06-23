# WildlyPlay — Revised Build Plan (v2)

**Based on:** Product Execution Playbook v2 + Trust-Anchor & Reputation Spec v1 + Product Review Adjustments  
**Date:** 21 June 2026  
**Purpose:** Official execution roadmap aligned with the mid-August 2026 EPL launch.

**v2 changes (Fen 2-bot review, 21/06 — both bots consensus, Nick greenlit; bandwidth confirmed):**
1. **CLV-capture promoted to P0B** (new T7) — closing-line snapshot at KO; cannot be backfilled, same logic as trust data.
2. **RP2 reworded** "accuracy" → **calibration** (the word "accuracy" leaked the win-rate trap §15.1 bars).
3. **New anti-pattern §15.13** — Curator never claims +EV / beating the bookie (brand-drift guard at the pick-framing layer; pairs with the RP2 fix at the math layer).
4. **Per-bucket sample-gate** added to the Reliability Strip (§9) — don't display a confidence bucket until that bucket itself has sample, not just the total.
5. **Loss-type field** added to post-mortem (T5/§3) — {variance / thesis-error / price-error / model-error}; a moat-builder, not just a fix; cannot be backfilled.
6. **D7/D8 (reminders) ship early** as the retention-measurement mechanism; only the expensive D6/D9 gate behind an outsider retention signal.
7. Brier confirmed DEFERRED for v1 (§9 already correct) — hit-rate-by-bucket is the v1 metric; supersedes the earlier Trust-Anchor reputation-model Brier patch.
8. **§7 launch-minimal cut-line** — H1-H3 must-have; H4-H8 defer-able post-launch if July slips (explicit de-scope order within "required").
9. **M1 flagged critical-path bottleneck** (§6 + §14 July) — effort L, serial dependency for Match Hub + homepage; watch for slip from early July.

---

## Guiding Principle

> Stabilize production + complete SEO + capture trust now → establish the minimum EPL launch backbone → unify Match Hub → surface trust and improve retention → add intelligence and community → build reputation and scale.

- **Daily Line** = daily engagement engine
- **Curator** = trust anchor
- **Match Hub** = structural center

---

# 1. Priority Model

## P0A — Production Blockers
Anything that can break settlement, live state, data integrity, launch operations, or user trust.

## P0B — Foundation and Trust Capture
Trust data, SEO, operational visibility, and the minimum EPL data backbone.

## P1A — Data and Object Unification
One internal fixture identity across Picks, Watching, Daily Line, providers, articles, and Match Hubs.

## P1B — Product Experience Unification
Match Hub and homepage restructuring after the underlying data model is stable.

## P2 — Trust Display and Retention
Surface confidence, post-mortems, reliability, and Daily Line return loops.

## P3 — Intelligence and Community Foundation
Match Pulse feasibility, anonymous prediction history, optional accounts, and persistent user records.

## P4 — Reputation, Personalization, and Scale
Predictor profiles, reputation, broader leagues, personalization, Forum, and monetization.

---

# 2. P0A — Production Blockers

**Target:** Now through early July 2026

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| R1 | Admin first login | Create Curator Supabase Auth user and verify all Admin Phase 1 flows | S | Nick + Gwen | TODO |
| R2 | Facebook Newsroom verification | Verify image, caption, link, UTM, and fallback on a live `/watching` post | S | Nick + Gwen | TODO |
| R3 | Persistent live match state | Persist last-known score, minute, HT/FT state, and finished state | M | Gwen | TODO |
| R4 | Daily Line Livescore sync fix | Fix `external_match_id` mismatches and verify automatic settlement | S | Gwen | TODO |
| R5 | Settlement monitoring | Alert on failed settlement, API timeout, missing score, and cron failure | M | Gwen | TODO |
| R6 | Daily Line lifecycle monitoring | Alert on missed create, lock, live transition, settlement, or inconsistent totals | M | Gwen | TODO |
| R7 | Fixture and slug deduplication | Fix provider-name, timezone, and slug duplicates | S | Gwen | TODO |
| R8 | Today’s Matches timezone fix | Use `(now − 6h) → end of local day` | S | Gwen | TODO |
| R9 | AI/social failure visibility | Surface failed article, translation, TG, FB, and revalidation jobs | M | Gwen | TODO |
| R10 | Production fallback procedures | Document manual settlement, correction, void, unpublish, and repost flows | S | Gwen + Nick | TODO |

---

# 3. P0B — Trust Capture

Trust data must start now because it cannot be accurately backfilled.

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| T1 | Structured confidence | Add immutable `Low / Medium / High` to Curator Picks | S | Gwen + Nick | TODO |
| T2 | Confidence/stake warning | Warn on unusual combinations; do not block publishing | S | Gwen | TODO |
| T3 | Primary Edge taxonomy | Require exactly one primary reason | S | Gwen + Nick | TODO |
| T4 | Supporting Evidence taxonomy | Allow up to two supporting evidence tags | S | Gwen + Nick | TODO |
| T5 | Post-mortem workflow | Settle immediately, generate AI draft, Curator reviews, then publish | M | Gwen + Nick | TODO |
| T6 | Post-mortem SLA | Track Pending, Approved, Overdue; target 24 hours | S | Gwen | TODO |
| T7 | CLV closing-line capture | Snapshot price-at-pick + closing line at KO per pick (event-ID), store immutably — feeds D3/D5/§9 CLV-by-bucket. **Cannot be backfilled — must be live at launch, same tier as T1-T6.** | M | Gwen | TODO |
| T8 | Post-mortem loss-type field | Tag every settled loss {variance / thesis-error / price-error / model-error}, immutable. Moat-builder: separates "process-right, variance loss" from "bad read" so reliability isn't understated. Cannot be backfilled. | S | Gwen + Nick | TODO |

## Confidence Definition

> Confidence reflects belief in the thesis. Stake reflects risk allocation based on price, volatility, market type, and exposure.

Confidence is not automatically inferred from stake.

## Primary Edge — Choose One

- Price / Value
- Tactical Matchup
- Team News
- Schedule / Fatigue
- Motivation / Tournament Context
- Live Match State
- Market Movement

## Supporting Evidence — Choose Up to Two

- Recent Form
- Historical Data
- Expected Goals
- Confirmed Lineup
- Home / Away Split
- Set Pieces
- Defensive Weakness
- Public Sentiment
- Shot or Chance Quality
- Injury / Suspension Context

## Post-Mortem Workflow

```text
Match settles
→ Result and units P/L publish immediately
→ AI creates draft
→ Curator reviews and edits
→ Approved review publishes
```

Rules:

- Settlement never waits for AI.
- Result publication never waits for Curator approval.
- AI draft is not public as official Curator judgment.
- Until approval, show `Post-match review pending`.
- Every settled Pick must eventually receive a review.
- Wins and losses follow the same rule.
- **Every loss is tagged with a loss-type** (T8): `variance` / `thesis-error` / `price-error` / `model-error`. This is part of the public post-mortem, not internal-only — "we lost to variance, not a bad read" (e.g. Ecuador 0-0, 21/06: mega-fav out-shot a bus + keeper, xG > line, no goal = variance-structural) is the highest-grade trust signal and is not copyable by competitors selling win-rate.

---

# 4. P0B — SEO Fundamentals

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| S1 | `<html lang>` | Set locale correctly for EN/VI/TH/ES | S | Gwen | TODO |
| S2 | Hreflang clusters | Add EN/VI/TH/ES + x-default | S | Gwen | TODO |
| S3 | Canonical coverage | Home, Daily Line, cards, matches, plays, newsroom | S | Gwen | TODO |
| S4 | Structured data | WebSite, Organization, SportsEvent, NewsArticle, FAQPage | M | Gwen + Jane | TODO |
| S5 | Daily Line in sitemap | Add relevant Daily Line routes | S | Gwen | TODO |
| S6 | Crawlable pagination | `/matches?page=`, ItemList, navigable pagination | S | Gwen | TODO |
| S7 | Locale duplicate validation | Confirm query-language pages do not create duplicate-content problems | S | Gwen | TODO |

---

# 5. P0B — Minimum EPL Launch Backbone

This is a launch dependency, not a Month 6+ scale feature.

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| E1 | EPL competition configuration | League, season, provider IDs, timezone, names, slugs | S | Gwen | TODO |
| E2 | EPL team registry | Teams, canonical names, logos, provider IDs, aliases | M | Gwen | TODO |
| E3 | EPL fixture ingestion | Sync fixtures and support manual correction | M | Gwen | TODO |
| E4 | EPL provider mapping | Map odds-api and livescore identities | M | Gwen | TODO |
| E5 | EPL Pick and Watching support | Validate publish, link, settle, CLV, Match Hub | M | Gwen + Nick | TODO |
| E6 | EPL Daily Line eligibility | Generate EPL Daily Line cards and verify odds | M | Gwen | TODO |
| E7 | Basic EPL standings | Add only if provider reliability is sufficient | M | Gwen | CONDITIONAL |
| E8 | EPL lifecycle QA | Run end-to-end simulations on selected fixtures | S | Gwen + Jane + Nick | TODO |

Not included yet:

- Historical seasons
- Advanced competition pages
- Full multi-league depth
- Deep player database
- Secondary provider failover

---

# 6. P1A — Data and Object Unification

**Target:** July 2026

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| M1 | Unified internal fixture ID | One match identity across all product objects and providers | L | Gwen | TODO ⚠️ **CRITICAL-PATH BOTTLENECK (effort L) — watch for slip; serial dependency for Match Hub + homepage** |
| M2 | Provider mapping tables | Event/team IDs, aliases, kickoff, slug, mapping confidence | M | Gwen | TODO |
| M3 | Managed team aliases | Move hardcoded aliases into DB/admin | M | Gwen | TODO |
| M4 | Duplicate prevention | Block duplicates from naming, timezone, or provider differences | M | Gwen | TODO |
| M5 | Match-level admin view | Picks, Watching, Daily Line, articles, provider data, errors | M | Gwen | TODO |
| M6 | Article-to-match association | Attach match-related articles to one internal fixture | M | Gwen | TODO |
| M7 | Daily Line ↔ Match Hub | Show card number and goal contribution | S | Gwen | TODO |
| M8 | Match repair tools | Remap IDs, merge duplicates, correct slug, resync score | M | Gwen | TODO |

Completion gate:

- Fixture identity stable
- Duplicate prevention active
- Match content consistently linked
- Daily Line and Curator objects resolve to the same match

Only then should the full homepage restructure begin.

---

# 7. P1B — Match Hub and UX Unification

**Target:** Late July through August launch readiness

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| H1 | Pre-match Match Hub | Watching, Buzz, preview, Pick, confidence, poll, Daily Line link | M | Gwen + Jane | PARTIAL |
| H2 | Live Match Hub | Score, minute, events, persisted state, thesis, Daily Line contribution | M | Gwen + Jane | PARTIAL |
| H3 | Post-match Match Hub | Result, units P/L, CLV, recap, post-mortem | M | Gwen + Jane | PARTIAL |
| H4 | Article hierarchy | One primary preview, optional Pick analysis, one recap | M | Gwen | TODO |
| H5 | Content deduplication | Title, semantic overlap, intent, and fixture checks | M | Gwen | TODO |
| H6 | Match-centric homepage | Curator → Daily Line → Matches That Matter → Results → Newsroom → Leaderboard | L | Gwen + Jane | TODO |
| H7 | `/matches` filters | Date, status, league, team search | M | Gwen | TODO |
| H8 | Internal linking | Picks, Watching, Daily Line, Newsroom, archive, and social to Match Hub | S | Gwen | TODO |

**Launch-minimal cut-line (if July slips — the de-scope order within "required"):** H1-H3 (pre/live/post Match Hub, already PARTIAL) = MUST-HAVE for launch. H4-H8 (article-hierarchy, content-dedup, full match-centric homepage restructure, /matches filters, internal-linking) are DEFER-ABLE to post-launch without killing the launch. This is the explicit escape hatch so a late M1 (bottleneck) does not force a broken final QA — cut H4-H8 before cutting H1-H3.

## Article Rules

### On `/watching`

Create one neutral primary preview.

### On `/pick`

Create Curator Pick analysis, but build on the existing preview rather than repeat it.

### After the match

Create one recap.

If a Pick exists, include result and post-mortem status.

If no Pick exists, create a recap only for featured matches.

```text
Match Hub
├── Primary Preview
├── Curator Pick Analysis
└── Recap
```

---

# 8. EPL Launch Readiness

**Target:** Mid-August 2026

## Required

- EPL competition/team/fixture data
- Provider mappings
- EPL Curator Picks
- EPL Watching
- Auto-linking
- Auto-settlement
- CLV capture
- EPL Match Hubs
- EPL-eligible Daily Line
- Telegram distribution
- Facebook distribution verified
- Admin operational workflows
- Live-state persistence
- Critical SEO
- Analytics and alerts
- Production QA
- Responsible Play and legal pages

## Nice to Have

- Rich standings
- Confidence display
- Public post-mortems
- Revised homepage
- PWA prompt
- Daily Line share card

## Not Required for Launch

- Match Pulse
- Predictor reputation
- Full accounts
- Personalization
- Forum
- Native apps
- Full multi-league platform
- Premium subscription

---

# 9. P2 — Trust Display and Retention

**Target:** Post-launch Month 1–2

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| D1 | Confidence display | L/M/H + immutable timestamp | S | Gwen | TODO |
| D2 | Curator Record page | Record, units, CLV, reasoning categories, post-mortems | M | Gwen + Jane | TODO |
| D3 | Reliability strip | Outcome rate by confidence bucket with sample | M | Gwen + Jane | TODO |
| D4 | Post-mortem on Match Hub | Approved review or Pending state | S | Gwen | TODO |
| D5 | Reasoning performance | Performance by Primary Edge and evidence | M | Gwen | TODO |
| D6 | Daily Line share card | Downloadable/shareable result image | M | Gwen | TODO |
| D7 | Telegram Daily Line alerts | New card, cutoff reminder, result | S | Gwen | TODO |
| D8 | In-site Daily Line reminders | New card and lock reminders | S | Gwen | TODO |
| D9 | Weekly Daily Line recap | Results and leaderboard highlights | S | Gwen | TODO |
| D10 | PWA install prompt | Add after repeat usage is validated | S | Gwen | TODO |
| D11 | Web push feasibility review | Measure demand and browser coverage first | S | Gwen + Jane | TODO |

**Daily Line retention sequencing (review note):** D7/D8 (Telegram + in-site reminders, effort S) are the MECHANISM that creates the return loop — ship them EARLY as part of the retention probe (GoalLine/Daily Line Card #002+ with non-founder players; current validation is n=1 founder = mechanics-only, not retention). Only the expensive items (D6 share-card, D9 weekly recap) gate behind an actual outsider retention signal. Do not gate the cheap loop-creating reminders.

## Reliability Strip Sample Gates

- Fewer than 10: `Building sample`
- 10–29: `Early sample — 67% across 12 picks`
- 30+: mature reliability display

Always show percentage and sample size.

**Per-bucket gate (critical for a trust product):** the gates above apply to EACH confidence bucket independently, NOT only to the total. With ~1–3 picks/day split across Low/Med/High, the total reaches 30 long before any single bucket does (~10 each = wide noise). Do NOT display a bucket's hit-rate until THAT bucket clears its own sample gate — otherwise an early "High → 40%, Low → 70%" inversion (pure small-sample variance) reads as broken calibration on the one product whose entire value is calibration. Until a bucket clears, show `Building sample` for that row, not a number.

## Reputation Mathematics Rule

Do not use Brier Score while confidence is only Low / Medium / High.

For v1, measure:

- Actual hit rate by confidence bucket
- Whether High > Medium > Low
- Sample size
- Units P/L by bucket
- CLV by bucket for Curator Picks

Brier Score becomes valid only if numerical probabilities are collected.

---

# 10. P3 — Intelligence and Community Foundation

**Target:** Month 4–5 after usage and data validation

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| I1 | Anonymous match poll | Simple result-direction or “Who wins?” vote | M | Gwen | TODO |
| I2 | Device shadow ledger | Store anonymous Daily Line and match prediction history | M | Gwen | TODO |
| I3 | Optional accounts | Upgrade without forced signup | L | Gwen | TODO |
| I4 | Device-to-account merge | Import prior device history | M | Gwen | TODO |
| I5 | Persistent community history | Account-level prediction record | M | Gwen | TODO |
| I6 | Match Pulse data audit | Audit shots, SOT, attacks, cards, subs, xG, frequency | M | Gwen + Nick | TODO |
| I7 | Signal feasibility matrix | Define supported signals by provider/competition | M | Gwen | TODO |
| I8 | Deterministic signal prototype | Curator Picks, Watching, and Daily Line matches only | L | Gwen | TODO |
| I9 | Signal backtest | Replay and measure false positives | M | Gwen + Nick | TODO |
| I10 | Reasoning taxonomy UI | Filter/search Curator Picks by reason | S | Gwen | TODO |

Match Pulse must not be built from score, minute, and goals alone.

AI may explain a verified signal. AI may not invent one.

Community sequence:

```text
Anonymous Poll
→ Device Shadow Ledger
→ Optional Account
→ Merge History
→ Persistent Prediction History
→ Predictor Profile
→ Reputation
```

---

# 11. P4 — Reputation, Personalization, and Scale

**Target:** Month 6+ or after sufficient sample and engagement

| # | Task | Scope | Effort | Owner | Status |
|---|---|---|---|---|---|
| RP1 | Predictor profile v1 | History, sample, accuracy, recent form, breakdowns | L | Gwen + Jane | TODO |
| RP2 | Reputation model v1 | Sample-adjusted **calibration** (hit-rate-vs-confidence-claimed, NOT raw accuracy/win-rate), consistency, recency, transparency, CLV (capped) | XL | Gwen | TODO |
| RP3 | Community leaderboard | Sample-gated rankings | L | Gwen | TODO |
| RP4 | Follow predictor | Follow credible users | M | Gwen | TODO |
| RP5 | Personalization | Favorites, feed, notification settings | L | Gwen | TODO |
| RP6 | Broader multi-league platform | Leagues, seasons, teams, standings beyond EPL | XL | Gwen | TODO |
| RP7 | Web push implementation | Only after feasibility validation | M | Gwen | TODO |
| RP8 | Forum activation | Only after behavioral thresholds are met | S | Nick | GATED |
| RP9 | Premium / B2B | Signals, analytics, widgets, content feeds | XL | Nick | FUTURE |
| RP10 | Native apps | Only after web retention is proven | XL | — | FUTURE |

Sample gates:

- Profile after 10 predictions
- Leaderboard after 30
- Specialist label after 50 in one category

## Forum Activation Criteria

Do not use 200 daily visitors as the sole trigger.

Require:

- 30–50 weekly interacting users
- 10–15 organic discussions per week
- Repeated participation
- Active Daily Line or prediction community
- Named moderator
- Reporting workflow
- Enough seed content
- Evidence that Telegram discussion needs a permanent web home

---

# 12. Decisions Required from Nick

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| 1 | Confidence scale | L/M/H | T1 |
| 2 | Primary Edge taxonomy | Use proposed 7 values | T3 |
| 3 | Supporting Evidence | Max 2 per Pick | T4 |
| 4 | Post-mortem SLA | 24 hours | T5/T6 |
| 5 | Post-mortem approval | Curator approval required | T5 |
| 6 | EPL Daily Line | EPL-focused around launch | E6 |
| 7 | Rich standings | Conditional, not launch-critical | E7 |
| 8 | Homepage timing | After P1A fixture unification | H6 |
| 9 | Web push | Feasibility first | D11/RP7 |
| 10 | Forum trigger | Behavior threshold | RP8 |

---

# 13. Dependencies

## EPL Launch Critical Path

```text
Production reliability
→ EPL competition/team/fixture data
→ Provider mapping
→ Curator Pick and Watching validation
→ Match Hub validation
→ Daily Line EPL validation
→ Distribution verification
→ Analytics and QA
→ Launch
```

## Match Hub

```text
Unified fixture identity
→ Provider mappings
→ Article associations
→ Daily Line links
→ Match Hub consolidation
→ Homepage restructure
```

## Reputation

```text
Confidence capture
→ Adequate sample
→ Reliability display
```

Community:

```text
Anonymous participation
→ Shadow ledger
→ Optional accounts
→ Persistent history
→ Profiles
→ Reputation
```

## Match Pulse

```text
Data audit
→ Feasibility matrix
→ Event persistence
→ Deterministic rules
→ Backtest
→ Limited rollout
→ False-positive measurement
```

---

# 14. Execution Timeline

## Now to Early July

- Production blockers
- Confidence and taxonomy capture
- Post-mortem data structure
- Core SEO
- EPL league/team setup

## July

- EPL fixtures and provider mappings
- **Unified fixture identity (M1) — ⚠️ critical-path bottleneck, effort L; track slip from early July, it gates Match Hub + homepage**
- EPL Picks/Watching/Daily Line testing
- SEO completion
- Match-level admin
- Article association
- Post-mortem workflow (incl. loss-type field T8)

## Late July to Mid-August

- Match Hub pre/live/post states
- Article hierarchy
- Minimum homepage restructure
- EPL QA
- Distribution validation
- Analytics
- Runbooks
- Launch

## Post-Launch Month 1–2

- Confidence display
- Curator Record page
- Reliability strip after sample gate
- Public post-mortems
- Daily Line sharing and reminders
- PWA prompt

## Month 4–5

- Anonymous match poll
- Shadow ledger
- Optional accounts
- Match Pulse audit and prototype

## Month 6+

- Predictor profiles
- Reputation
- Personalization
- Broader leagues
- Forum if thresholds are met
- Premium/B2B
- Native app review

---

# 15. Anti-Patterns

1. Do not sell win rate as the primary trust claim.
2. Do not use Brier Score without probability forecasts.
3. Do not publish AI post-mortems as official Curator judgment without approval.
4. Do not let post-mortem generation block settlement.
5. Do not build Match Pulse from score and minute alone.
6. Do not force accounts for basic participation.
7. Do not redesign the homepage before fixture identity is stable.
8. Do not leave EPL support until Month 6+.
9. Do not activate the Forum based only on traffic.
10. Do not create duplicate articles for one fixture.
11. Do not show reliability without sample size.
12. Do not expand data breadth before live reliability is stable.
13. **Do not let the Curator claim +EV or "beating the bookie."** The frame is reasoning + radical transparency + discipline + entertainment — never an implied edge. (Pairs with the RP2 calibration fix: §15.1 + §15.2 bar win-rate/Brier-misuse at the math layer; this bars the same drift at the pick-framing/brand layer.)
14. Do not show a confidence bucket's hit-rate before THAT bucket clears its own sample gate (per-bucket, not total).

---

# 16. Final Execution Summary

```text
P0A — NOW
Production blockers

P0B — NOW / JULY
Trust capture + SEO + minimum EPL launch backbone

P1A — JULY
Unified fixture identity and match-level data architecture

P1B — LATE JULY / AUGUST
Match Hub and minimum homepage unification

EPL LAUNCH — MID-AUGUST 2026
Reliable Curator + Match Hub + Daily Line + distribution

P2 — POST-LAUNCH
Surface trust and strengthen retention

P3 — AFTER USAGE VALIDATION
Accounts, community history, Match Pulse prototype

P4 — AFTER SAMPLE AND DEMAND
Reputation, personalization, broader leagues, Forum, monetization
```

> Stabilize first. Capture trust early. Launch EPL with the minimum complete backbone. Add intelligence only when data quality supports it. Add reputation only when identity and sample size make it credible.
