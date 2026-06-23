# GoalLine Daily — Build Spec (Single Source of Truth)

> **Audience:** Designer · Frontend · Backend.
> **Status:** Canonical. Supersedes `goal_line_daily_mvp.md` and `goal_line_daily_DECISIONS.md` — where anything conflicts, **this document wins.**
> **Last updated:** 18 June 2026. Open decisions still pending the owner are listed in §15 — build around them; don't block.

---

## 0. TL;DR — What we're building

A **daily Over/Under prediction game** on the **aggregate number of goals** across a curated set of **exactly 3 real football matches** versus **one published Goal Line**. Points-only (no real money). Think **"Wordle for goals"**: one shared daily card, one pick per user per day, a live-progress journey, leaderboards, and streaks.

**Core loop:** open app → see today's card → review matches + line + odds + cut-off → pick **Over (Tài)** or **Under (Xỉu)** → pick locks → follow live goals → card settles → points + leaderboard update → return tomorrow.

---

## 1. Locked Principles (do not violate)

1. **One focal card per USER per day.** This is the Wordle ritual and the core asset. The platform MAY later run multiple cards segmented by timezone/region/league, but each user must still see exactly **one anchor card**. Never show a single user many equivalent competing cards. Grow engagement by **depth** (live progress, streaks, social split), not breadth.
2. **Single AGGREGATE line**, not a per-match parlay. One number over the whole slate = one storyline ("every goal in every match moves your card").
3. **Points-only, cosmetic.** No real-money betting or redemption in MVP. Positioning = **daily prediction challenge / entertainment**, explicitly **NOT a sportsbook**, NOT investment advice, NEVER "we beat the bookies."
4. **Play = zero friction. Account = optional.** Anyone can play instantly with just a display name. Gate **persistence + rewards** behind an account, **never gate PLAY**.
5. **Transparency = METHOD (pre) + FACTS (post).** Show *how* the line is set before kickoff and *actual* goals after. **Never** publish per-match *expected* goals pre-match (it's a dispute magnet and nudges users toward a parlay mental model).
6. **Separate sub-brand** from the WildlyPlay tipster product (CONFIRMED — §15). Shared infra, distinct positioning. **Web-only** for MVP (§15).

---

## 2. Data Model (Backend)

### User / Identity
```
User
  id                 (stable internal key — NEVER the display name)
  type               'guest' | 'claimed'
  display_name       (cosmetic; duplicates allowed)
  discriminator      (short, e.g. 'a3f' — for disambiguating duplicate names)
  handle             (nullable; unique @handle, claimed accounts only)
  device_id          (guest: persistent device/browser id)
  device_fingerprint (anti-abuse signal)
  auth_provider      (nullable: 'telegram' | 'google' | 'apple' | 'magic_link')
  auth_ref           (nullable; external id / verified email)
  created_at
  current_streak
  best_streak
  total_picks
  total_wins
```
- **Guest** = `type:'guest'`, identified by `device_id` (localStorage) + `device_fingerprint`. No email/password.
- **Claimed** = `type:'claimed'`, upgraded via 1-tap social or magic-link (no password form). Inherits the guest's history on claim.

### DailyCard
```
DailyCard
  id, card_number
  utc_date
  audience_segment   (default 'global'; later: timezone/region/league key)
  goal_line          (always .5)
  over_odds, under_odds   (decimal; calibrated — see §4)
  cutoff_time_utc
  status             (see §3)
  method_note        (the published "how we set the line" string — see §10)
  settlement_result  ('over' | 'under' | 'void' | null)
  void_reason        (nullable)
  published_at, locked_at, settled_at
  created_by, updated_by
```

### Match / DailyCardMatch
```
Match
  id, external_match_id   (data-provider id)
  home_team, away_team
  kickoff_time_utc
  status                  ('scheduled'|'live'|'finished'|'postponed'|'abandoned')
  home_score, away_score, valid_goals
  is_valid_for_settlement

DailyCardMatch
  id, daily_card_id, match_id, sort_order
```

### Pick
```
Pick
  id, user_id, daily_card_id
  side                ('over' | 'under')
  stake_points        (fixed 100 for MVP)
  odds_locked         (the card's over/under odds at lock)
  status              ('locked'|'won'|'lost'|'void')
  server_received_at  (AUTHORITATIVE timestamp — used for cut-off enforcement)
  settled_at
  net_profit, participation_bonus, points_added
```
- **One pick per user per DailyCard.** Immutable once confirmed (no edit/cancel).

### LeaderboardEntry (two kinds — see §9)
```
WeeklyLeaderboardEntry   { user_id, week_start_utc, week_end_utc, score, winning_days, participation_days, current_streak, rank }
SkillLeaderboardEntry    { user_id, season_id, calibration_score, sample_size, beats_split_rate, rank }  // claimed accounts only
```

### AdminAuditLog
```
{ id, admin_user_id, action, entity_type, entity_id, old_value, new_value, created_at }
```

---

## 3. Card Lifecycle & States

`Draft → Scheduled → Open → Locked → Live → Settled` (or `→ Voided`)

| State | Meaning |
|---|---|
| **Draft** | Admin preparing; not visible to users |
| **Scheduled** | Complete, scheduled to publish |
| **Open** | Visible; users can pick |
| **Locked** | Cut-off passed; no more picks |
| **Live** | ≥1 selected match in progress; settlement not complete |
| **Settled** | Result calculated (over/under) |
| **Voided** | Cancelled (invalid match condition / critical data issue) + refunds |

---

## 4. Line & Odds Engine (Backend) — the heart

**The Goal Line is DERIVED, never hand-set.**
1. For each selected match, fetch the bookmaker's totals market (odds-API).
2. De-vig each match's main total; interpolate to the fair total (the line where de-vigged Over ≈ 50%).
3. **Goal Line = Σ (per-match fair totals), rounded to the nearest `.5`** (`.5` guarantees no push).

**Odds are CALIBRATED to the true de-vigged probabilities, NOT symmetric** — so neither side carries positive expected value (prevents everyone piling the +value side and skewing the split).
- *Worked example (real, Card #001):* line **7.5**, true split ≈ Over 48% / Under 52% → odds **Over 2.00 / Under 1.85** (de-vig 48/52, EV balanced). Symmetric 1.90/1.90 would be *wrong* — it ignores the real lean and hands Under +value.

**AI's role = calibrate the line to be FAIR (~50/50), NOT to predict winners.** Marketing must never imply the AI gives players an edge.

Derivation runs automatically from the odds feed; admin curates the slate + reviews.

---

## 5. Cut-off & Timing (Backend) — anti-exploit critical

- **One FIXED lock, before the EARLIEST kickoff in the card. NOT running.** Line + odds are fixed at publish; the live phase is **display-only** (no live odds, no in-play betting — those are explicitly out of scope and would make it a sportsbook).
- **`cutoff_time_utc = min(published cutoff, actual earliest KO) − small buffer (1–2 min)`.**
- **Server-authoritative time ONLY.** Accept/reject a pick by `server_received_at` vs `cutoff_time_utc`. **Never trust the client clock** (clock-skew/timezone is the #1 exploit vector). All times stored/computed in UTC; convert to local only for display.
- If any selected match kicks off *before* the cut-off (schedule moved earlier) → **auto-lock the card immediately** (or void).
- **Card curation rule:** build cards from a **tight kickoff window** (~2–3h cluster) so "locked early" is minimized and the live journey is one coherent session. Staggered KOs are a *feature* (goals arrive in waves), provided the card locks before the first one.

---

## 6. Settlement & Void (Backend)

- **Settle binary on the TOTAL goals** across all listed matches vs the Goal Line. `.5` line → no push.
- **Valid goals:** regular time + stoppage only. Own goals count. **Exclude** extra time, penalty shootouts, and VAR-disallowed goals. Use a **single authoritative data source** + a **correction window** (feeds lag on VAR).
- **"Settle-if-decided" is ASYMMETRIC (important):**
  - **OVER can settle early** — the moment `total_goals > goal_line`, Over is locked regardless of remaining play. *(Validated live in pilot Card #001: Over clinched mid-3rd-match.)*
  - **UNDER can NEVER settle early** while any match is live/unstarted (remaining goals are unbounded) → Under settles only when `total ≤ line` **AND all matches complete**.
- **Void rule:** any listed match postponed / abandoned / not-completed → **card VOID + full refund** — **UNLESS the Over result is already clinched** (`total > line`), in which case settle **Over**.
- **NO mid-card re-pricing.** Removing a cancelled match's "contribution" mutates a locked pick and forces an admin estimate to adjudicate points (dispute). Void+refund is the unique resolution fair to both sides simultaneously.
- **Locked picks are immutable** after confirmation. Editing the *card* before any pick exists is allowed (no binding yet).

---

## 7. Onboarding & Identity (Frontend + Backend)

**Separate "play" from "persist."**
1. **GUEST (default, zero friction):** user enters a display name → generate device-id (localStorage) + fingerprint → can pick + appear on the (ephemeral) leaderboard **immediately**. No email/password.
2. **CLAIM (optional upgrade):** when a user has a streak/rank worth keeping, prompt to claim via **1-tap social (Telegram/Google/Apple) or email magic-link — no password form**. Claiming preserves their history and unlocks cross-device persistence + the skill leaderboard. **Streak/rank is the natural hook** to convert.
- **Gate persistence + rewards behind the account, NEVER gate play.** (The original spec's "email-verify-to-play" was too strict and kills the casual funnel.)
- **CLAIM-prompt triggers (conversion UX):** prompt "Claim account" only at high-intent moments — after the user's **first win**, at **streak milestones (2 / 3 / 5)**, and as a **"save your streak" interstitial** before a guest is about to lose progress (device change / cookie-clear detected). Don't nag on first visit; let the streak/rank become the hook.
- **Pilot note:** in the current manual Telegram pilot, the **Telegram user-id IS the identity** (zero signup) — that pattern carries to web as "Login with Telegram."

---

## 8. Anti-Abuse & Integrity (Backend)

Because the game is near-coinflip, a multi-accounter gets more "lottery tickets" and can top a luck-board even with no money at stake — so leaderboard integrity matters even points-only.

- **Don't fight farming at the PLAY layer** (futile + adds friction). Apply only **light device-level limits** while points are cosmetic: 1 pick/day/device, device fingerprint (catches incognito/cookie-clear on same device), IP soft-signal (many new identities/short window = flag), rate-limit identity creation.
- **Make farming POINTLESS structurally:** tie **all recognition** (prizes, player-of-week, the "official" board) to **claimed accounts + the season SKILL leaderboard**. The skill board is **calibration-based → farm-resistant** (hedging across accounts yields random calibration; you can't farm it). Guests can top the ephemeral fun-board but it earns nothing.
- Tighten identity (require verified account) only **when real rewards attach**.

---

## 9. Scoring & Leaderboards (Backend + Frontend)

**Pick scoring:** ticket = 100 pts.
- Win → `net = 100×odds − 100`, plus **participation +5**.
- Lose → `0` net, plus **participation +5**.
- Void → ticket refunded, no score change.
- *(Card #001 example: Over 2.00 win = +105; Under 1.85 win = +90; loss = +5.)*

**TWO leaderboards:**
1. **Weekly (fun):** Mon 00:00 → Sun 23:59:59 UTC, **resets**. Score = net profit + participation. Luck-driven turnover = retention (everyone can win a week). Cosmetic; open to guests.
2. **Season SKILL (real):** **calibration / Brier score** (or "beats the community split consistently") over a large sample — lower-variance than W/L, reaches significance faster. The **"sharp" badge** lives here. **Claimed accounts only.** Triple-duty: measures skill · farm-resistant recognition anchor · validates genuine prediction quality.

**Streak:** consecutive correct picks; cosmetic/motivational in MVP (does not heavily affect leaderboard score). Missed day or wrong pick resets; void leaves it unchanged. Badges at 2/3/5.

**Tie-breakers (weekly):** more winning days → higher streak → more participation days → earlier to the score.

---

## 10. Transparency Rules (Frontend + Content)

- **PRE-match (on the card):** show the **METHOD statement** — e.g. *"Line set from real bookmaker totals, de-vigged and calibrated to ~50/50 — not set to trap you."* + the **1-line VOID rule**. This carries the full trust/"show-your-work" message **without** any per-match numbers. **Do NOT publish per-match expected goals.**
- **POST-match:** show the **actual** per-match goal breakdown — *"A 3 · B 0 · C 2 … total 8 > 7.5 = Over."*
- **Community split:** **hidden before** the user picks; **revealed after** they lock (anti-herd, social tension).

---

## 11. Live Progress (Frontend) — the engagement engine

During live matches, display: Goal Line · current total goals · matches completed vs live/upcoming · which side is currently winning · "Over needs X more goals" · "Under survives if total stays ≤ N" · current lean. Lean into wave-drama for staggered KOs ("after the early games you're at 4 — need 4 more from tonight's slate"). This is display-only (no betting).

---

## 11.1 Notifications & Daily Re-engagement (Frontend + Backend) — the retention engine

A daily-habit game lives on reminders. **This is the mechanism the pilot is testing — it must be in MVP.**
- **Card live** — "today's card is open, make your pick."
- **Un-picked nudge** — "you haven't picked — cut-off in 1h."
- **Settled** — "card settled — you won +X / you climbed to #N."
- Channels: web-push (opt-in) for web; Telegram messages for the pilot. Respect opt-in + frequency cap (~2–3/day max).

---

## 11.2 Share & Virality (Frontend + GTM)

GoalLine is casual/viral — sharing is a primary growth loop; build it in from MVP:
- **Share pick** (pre-result): "I'm on TÀI 7.5 — fade me?" → image/link of the card + your side (community split hidden).
- **Share result** (post-settle): auto-generated **result-card image** (final total vs line · your W/L · streak) for social, UTM-tagged to funnel viewers back to today's card.

---

## 12. Screens (Designer + Frontend)

1. **Home / Today's Card** — title, UTC date, cut-off countdown, selected matches, Goal Line, Over/Under buttons + odds, method note, CTA "Lock My Pick".
2. **Pick Confirmation Modal** — "You are choosing Over 7.5 at 2.00. Uses your Daily Ticket (100 pts). Cannot be changed." Confirm / Go Back.
3. **Locked Pick State** — chosen side, odds locked, ticket, potential payout, community split, countdown to first KO.
4. **Live Progress** — §11.
5. **Result / Settlement** — final per-match scores, total, line, winning side, user result, points, leaderboard delta, CTA "View Leaderboard".
6. **Weekly Leaderboard** + **Skill Leaderboard** (two tabs).
7. **Profile** — display name (+discriminator/@handle), rank, total picks, win rate, streak, best streak, badges, "Claim account" CTA for guests.
8. **Admin Panel** — create/curate card, auto-derived line+odds (editable with caution), set cut-off, method note, preview, publish, lock, settle, void, audit log.

**Card-view STATE MATRIX (FE state machine — render by `card.status × user.has_picked × user.is_named`):** Open + un-named → name+pick prompt · Open + named + un-picked → pick view · Open + picked → locked-pick view · Locked → locked-pick view (countdown) · Live → live-progress · Settled → result · Voided → refund note. Build the machine from this; don't infer per-screen.

**No-Card / empty day:** when no good slate exists, render a **"No card today"** empty state (teaser + "back tomorrow", optionally yesterday's result or the leaderboard). (Frequency policy = open decision §15.)

**i18n + timezone:** all UI strings i18n-ready from day one (site is EN / VI / TH / ES); data values stay as stable KEYS, never localized strings. BE is UTC-authoritative; **FE renders countdown + kickoff times in the user's LOCAL timezone.**

**Design direction:** sports-entertainment, NOT a betting terminal. Mobile-first, scoreboard-like, clean, high-contrast live states, strong countdown + progress. Build **all states**: empty / loading / locked / live / settled / voided.

---

## 13. Brand, Copy & Framing (Designer + Content)

- Honest framing is the moat. Copy: *"Entertainment, not income"*, *"reasoned picks — we lose too, and we show it"*. **Never** imply guaranteed wins / edge / "beat the bookies." A perfect record will revert; present records with context so the first loss is a non-event.
- Hero: *"One daily football line. Pick Over or Under. Climb the leaderboard."*
- Win/lose/void messages should be warm and transparent (see settlement screen).

---

## 14. Scope (MVP)

**In:** one daily card (**exactly 3 matches**), derived line + calibrated fixed odds, one 100-pt pick/user/day, guest play + optional claim, fixed cut-off, asymmetric settlement + void, weekly + skill leaderboards, streaks, community split (post-lock), live progress, method/void transparency, basic admin panel, light anti-abuse.

**Out (MVP):** real-money / cash-out, live/running odds, in-play betting, changing odds after publish, multiple picks/day, free stake selection, per-match parlay settlement, paid contests, referral system, complex tournaments, prize redemption.

---

## 15. Decisions — RESOLVED (owner, 19 Jun 2026)

1. **Points redemption value? → YES (planned roadmap goal).** MVP still **launches cosmetic** (points-only), but redemption IS the direction → **architect for it now, don't bolt on later:**
   - Redemption gate MUST require a **verified/claimed account** — NO guest redemption (ties to §7/§8: identity tightens at the reward gate).
   - **⚠️ A contest/sweepstakes-law review is REQUIRED before any redemption goes live** (free-entry → prize = sweepstakes/skill-contest, lighter than gambling, but still regulated: eligibility, T&C, prize tax, region/country restrictions — a LEGAL gate before turn-on, not a build blocker; flag early to counsel).
   - **Points ledger must be AUDITABLE + redemption-ready from day 1** (BE): log every credit/debit with its source; design so redemption can be switched on WITHOUT re-architecting the ledger.
   - Redemption must **NOT turn the game into gambling** — keep the **free-entry skill-contest** structure (no purchase-to-play, no money stake). This preserves the positioning + the responsible-play stance.
   - Until then, points stay cosmetic and the "entertainment, not income" framing (§13) holds.
2. **Separate brand? → YES.** GoalLine Daily = separate sub-brand that funnels into WildlyPlay's analysis. Shared infra, distinct positioning.
3. **Platform? → WEB-ONLY.** No native app for MVP. Build **mobile-first responsive web; PWA recommended** (add-to-homescreen + web-push). Notifications = web-push (§11.1).
4. **Matches per card? → PERMANENT 3.** Every card = **exactly 3 matches** (not a range). Simplifies curation, line-derivation, and UI — design around fixed-3.
5. **No-card / empty-day? → ACCEPTABLE.** "No card today" on thin days is fine — do NOT force a lower-bar slate to fill. The No-Card empty state (§12) is a normal occurrence, not a failure.

---

## 16. Build Sequence & Ownership

- **Backend:** data model → line-derivation engine (odds API + de-vig) → pick-lock (server-authoritative cut-off) → settlement (asymmetric + void) → scoring + two leaderboards → guest/claim identity → anti-abuse → admin panel + audit log.
- **Frontend:** today's card → pick + confirm flow → locked state + community split → live progress → settlement screen → leaderboards (2 tabs) → guest play + claim upgrade → profile.
- **Designer:** mobile-first screens + all states (empty/loading/locked/live/settled/voided) + brand system + honest-framing copy.
- **Content team:** daily card curation (tight-window slate) + method/void copy + on/off-page SEO. (Line logic + settlement integrity = our team; card curation + SEO = content team.)

---

*Validated live in the manual Telegram pilot (Card #001, 18 Jun 2026): full create→lock→settle cycle, Over-clinch early-settle rule fired correctly. Mechanics proven; retention to be tested from Card #002 with real outside players.*
