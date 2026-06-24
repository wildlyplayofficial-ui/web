# WildlyPlay — Product & Technical Documentation

A Telegram-first football media platform built around transparent sports picks. The Curator (human) publishes picks via a Telegram bot; everything downstream (settlement, AI articles, announcements, translations) is fully automated.

**Domain:** [www.wildlyplay.com](https://www.wildlyplay.com)

---

## 1. Features Built (Deployed)

### Core (Picks Pipeline)

- **/pick command** — the Curator publishes picks via Telegram. Picks are immutable after publish (DB trigger enforces this). Fields: match, league, kickoff, market, selection, line, odds, stake, thesis, optional event id and score.
- **Pick types** — pre-match (default) and running/in-play (includes `score:` field with live score at entry). Running AH picks settle on goals scored AFTER entry; OU/1x2/BTTS settle on the full final score.
- **Markets** — `ah` (Asian Handicap), `ou` (Over/Under), `1x2`, `btts` (Both Teams To Score), `other` (manual settlement only). Lines required for ah/ou, forbidden for 1x2/btts.
- **Settlement engine** — pure, deterministic functions in `packages/settlement`. True Asian-handicap math: `win`, `half_win`, `push`, `half_loss`, `loss`. Display rule: half-win shows as WON, half-loss shows as LOST; real units P/L always shown for transparency.
- **Auto-settle via odds-api.io poller** — every 10 minutes, polls published picks between kickoff+100min and kickoff+8h. Fetches final score from odds-api.io, settles automatically. Picks without event IDs require manual `/score`.
- **Auto-attach event ID** — at `/pick` time, the bot auto-lookups the odds-api.io event list. Conservative matching: exact team name match (fuzzy-normalized) + same UTC date. Only attaches when exactly 1 event matches; otherwise falls back to manual settlement.
- **CLV tracking (closing odds)** — near kickoff (15min before to 45min after), captures closing odds from Bet365 via odds-api.io for the same selection+line. Strict matching only — if the exact line is gone, odds_close stays null.
- **Crowd poll (Follow/Fade/Skip)** — anonymous voting per pick via httpOnly cookie (no accounts). Vote counts displayed on pick cards and detail pages.
- **Result cards** — generated at `/api/result-card/{id}`, sent as photos in TG channel announcements.
- **OG images** — dynamic Open Graph images at `/api/og/play/{id}` and `/api/og/home`.
- **Recap articles** — AI-generated post-match articles (4 languages) auto-published to the newsroom on settlement. Short channel recap (60 words/section) + long-form newsroom article (150-250 words/section).
- **Preview articles** — AI-generated pre-match articles auto-published when a pick is created. Expands the Curator's thesis into a 4-language article.
- **Analysis articles** — deeper pre-match analysis auto-generated on `/pick` (pre-match only; running picks skip analysis). Uses Claude Sonnet (not Haiku). Also runs on a 12h cron with a daily cap of 2 articles.
- **Thesis translations** — the Curator's English thesis is auto-translated into vi/th/es and stored in `pick_content` for the 4-language web UI.
- **Announcements** — new picks, results, and voids are announced to both the TG channel and Facebook Page. Results include card photos when possible, with text fallback.
- **Newsroom auto-post** — every newsroom article (preview, recap, watching-news, analysis) auto-posts to the TG channel + Facebook Page as a short EN caption + link back to the article, with UTM tags (`?utm_source=facebook|telegram&utm_medium=social`). Module `announce-article.ts` (`buildArticleCaption` + `buildArticleLink` + `announceArticle`), hooked into all 4 article pipelines, fire-and-forget / never-throw. *Deployed to Railway; TG verified. Full go-live gated on a demo sign-off — verify FB card image + caption on a live `/watching` first.*
- **/void command** — cancel a pick before kickoff. The pick stays visible with a VOID badge and is excluded from the record. Changing a pick = `/void` the old one + `/pick` a new one.

### Watching Pipeline

- **/watching command** — the Curator signals interest in a match before committing a pick. Fields: match, league, kickoff, optional note.
- **Auto-link** — when a `/pick` is published for the same match, the watching entry is automatically linked (status changes from `active` to `picked`).
- **Buzz system** — community sentiment snapshots generated via AI, powered by real Serper forum search results. Stored as a history array with trends over time.
  - Cron: every 3 hours for all active watching entries (2h dedup minimum).
  - Pre-kickoff: additional check every 30 minutes for matches 1-2h away (30min dedup).
  - On-demand: buzz generated immediately on `/watching` (no wait for cron).
  - Output: sentiment percentage (0-100), lean label, 3 themes, confidence level — all in 4 languages.
  - Sources: Reddit, Covers.com, AsianBookie, BettingAdvice, OLBG, Voz.vn, CadoVN.
- **Note translations** — the Curator's note is auto-translated into 4 languages.
- **News articles on /watching** — a neutral pre-match preview article (400-600 words, 4 languages) is auto-generated and published to the newsroom.
- **/unwatch command** — manually expires a watching entry.
- **Auto-expire watching** — a watching entry auto-expires ~3h after kickoff (match finished); the buzz cron checks each cycle (every 30 min) and removes it from the homepage teasers. Past-tense UI: once the match has finished the match page shows "The Curator **was** watching" (pulsing live dot removed).
- **Kickoff guard on buzz** — once a watched match has kicked off, buzz generation is skipped (no further Reddit/AI sentiment fetches for a started match).

### Website

- **Daily Board (homepage)** — today's published picks with pick cards, crowd poll, form strip (last 30 days, W/L/P circles, scrollable), and track record badge.
- **Archive** — all settled picks with month filter/pagination. Sticky record summary bar.
- **Play detail pages** — full transparency: thesis, odds at publish, market, line, stake. After settlement: raw outcome, units P/L, result badge. Includes recap article, match events, crowd poll, share bar. **SEO slug:** `/play/{uuid}` 308-redirects to a human slug `/play/spain-vs-cape-verde-under-3-5-2026-06-15` (date in slug prevents collisions); canonical = slug, Archive links + sitemap use the slug form.
- **Match hub page** — `/match/{slug}` (e.g. `portugal-vs-dr-congo-2026-06-17`) aggregates watching + pick + all related articles for a fixture (does **not** replace `/play` or `/news`). SportsEvent JSON-LD (SportsEvent / SportsTeam / Place / Organization), 4 languages, in sitemap. Entry points: Today's Matches widget, watching teaser "View match →", article→match links, and pick card→match (durable anti-orphan paths that survive `/unwatch`). The match query includes `expired`/`picked` watchings (not only `active`), so `/unwatch` no longer blanks the page; article→match links are defensively wrapped so a duplicate-watching query error can't crash the article.
- **/matches index** — nav menu page (between Stats and Newsroom) listing matches that have content, newest-first, 20/page; third anti-orphan entry point. *Pending SEO fixes (batched): dedup Turkey/Türkiye + timezone date-slug duplicates, add canonical tag + ItemList JSON-LD, make pagination crawlable (`?page=`).*
- **Stats page** — ROI, average CLV, cumulative units P/L chart (server-rendered SVG), breakdown by league and by market.
- **Newsroom** — all AI-generated articles with filter tabs (All, Picks & Recaps, Analysis, News), pagination (10 per page), type badges. Latest picks & recaps pinned rail on the Picks tab.
- **Today's Matches widget** — FIFA World Cup 2026 fixtures from livescore-api.com, cached 5 minutes.
- **Live Scores ticker** — live match data via `/api/live-clock/{eventId}`, auto-refresh. **Status guard:** a match is only shown "live" (with a minute) once it has a real score from the API after its true kickoff — even if the livescore feed pushes it into the live list early, pre-kickoff it stays "upcoming" with a countdown (no false `2'`). Minute is polled from the live API, not derived from a kickoff delta (no drift). Kickoff time read from the `scheduled` field, not `added`.
- **Match Events/Commentary** — per-match events via `/api/events/{matchId}` from livescore-api.com.
- **Team logos** — served via `/api/team-logo/{id}` using odds-api.io participant IDs.
- **Watching teasers with Community Buzz** — active watching entries displayed on the homepage with sentiment data, themes, and source attribution.
- **4 languages** — EN (default), VI, TH, ES. Language via `?lang=xx` query parameter. All UI strings, newsroom articles, thesis, buzz, and watching notes available in all 4 languages.
- **Light/dark mode** — theme support with CSS custom properties.
- **Share bar** — social sharing on play detail pages.
- **SEO** — sitemap.ts, robots.ts, Open Graph meta, Twitter cards, per-page metadata.
- **Static pages** — About, Donate, Responsible Play, Forum (feature-flagged).
- **On-demand revalidation** — worker sends POST to `/api/revalidate` with secret header after pick lifecycle events. ISR fallback at 5min (homepage/news) or 10min (archive/stats).
- **Admin Dashboard** *(NEW — Phase 1 just shipped 18/06, pending first login + verification)* — web admin at `/admin` (Supabase Auth login at `/admin/login`) as an alternative to the Curator bot commands. Phase 1 surfaces: dashboard overview (W-L-P record, units, active picks/watching counts), `/admin/picks` (list / create / void / settle), `/admin/watching` (list / create / unwatch), `/admin/channels` (TG/FB post history). Same `wildlyplay-web` repo, Vercel, protected routes + service-role writes. **AI-first mindset:** anything AI can do is pre-done or AI-assisted (AI-suggested thesis / market / odds, one-click publish, AI buzz). *A Supabase user must be created for the Curator before first login.* Phases 2–3 backlogged.
- **Post AI Regen (Phase 2)** — admin AI regeneration for newsroom posts at `/admin/posts/[id]`. 4 modes: Regen All (rewrite 4 langs from pick data, Sonnet), Regen Section (title/intro/analysis/conclusion), Translate (source→target lang), Regen Curator Note. Safety: writes to `body_md_draft` field (never overwrites live `body_md`), admin reviews LIVE vs DRAFT side-by-side diff, publishes explicitly. Stale badge on sibling langs when one is regenerated. Missing lang detection + generate button. Strict 4-lang validation (`splitLangSectionsStrict`) prevents cross-language contamination. Auth: Supabase session on `/api/admin/posts/generate`. Models: Sonnet for content, Haiku for translate.
- **Watching Curator Note Translate** — admin translate for watching notes at `/admin/watching/[id]`. Translates EN curator note → VI/TH/ES with betting glossary (thesis→nhận định, handicap→kèo chấp, total→tài xỉu). Sonnet model (not Haiku — better jargon handling). Draft → review → publish flow via `note_translations_draft` field.
- **Standings All/Form tabs** — tabs always visible (removed conditional hide). Form tab: uses API form string when available (correct chronological order), falls back to individual W/D/L tally badges when form empty. Badge colors: W green, D grey, L red. Row heights normalized (badge h-5 = text line-height).
- **EPL Standings (league mode)** — `/standings` page extended with EPL section (competition_id=2). Single table 20 teams (not groups like WC). Zone highlights: top 4 CL (brand green), 5th EL (indigo), bottom 3 relegation (red). Feature-flagged `epl_standings` (OFF until Aug launch). Reuses data from livescore-api.com.
- **The Booth** — dual-persona AI live commentary system. Two analysts: Sonny (Strategist, amber) + Cole (Skeptic, slate). Event-driven: triggers on GOAL/GOAL_PENALTY/OWN_GOAL/RED_CARD/HT/FT from livescore events_url. Pipeline: key-event → fetch Curator thesis → Sonnet EN gen (§9 system prompt + §8c few-shots) → Sonnet translate VI/TH/ES (betting glossary) → deterministic regex lint (no-tip/no-edge/no-victory-lap/no-fabrication) → write to `booth_shadow` table. Display: `/play/[id]` page after match events, branded banner "The Booth" + disclaimer "AI commentary, not betting advice" (4 langs). Feature-flagged `booth`. Voice Spec at `docs/VOICE_SPEC_v1.md`. Worker: `booth-detector.ts` (event poll+diff), `booth-gen.ts` (gen pipeline), `booth-lint.ts` (regex guard), `booth-shadow.ts` (orchestrator, 30s cron, 90s debounce). Admin: `/admin/booth` shadow viewer.
- **Live ticker shortNames** — all 48 WC teams + EPL clubs mapped to 3-letter codes in the live score ticker for mobile fit. Flags preserved.
- **OG image cache headers** — published picks cache 2min (status changes), settled picks cache 1h.

### Automation

- **Buzz cron** — every 3h + pre-kickoff every 30min. Serper forum search for real community snippets.
- **Note auto-translate** — on `/watching`, the Curator's note is translated into 4 languages via Claude.
- **News article on /watching** — neutral pre-match preview, 4 languages, auto-published.
- **Analysis article on /pick** — pre-match only (running picks skip). Uses Claude Sonnet.
- **Preview article on /pick** — 4-language pre-match article expanding the Curator's thesis.
- **Recap article on settlement** — 4-language post-match article, auto-published.
- **Thesis translations on /pick** — English thesis translated to vi/th/es.
- **Weekly digest** — Sundays 13:00 UTC (20:00 ICT). W-L-P record, units, best play, avg CLV. Posted to TG channel + FB Page. Skipped when no picks settled that week.
- **Auto-settle poller** — every 10 minutes. Polls odds-api.io for final scores. Window: kickoff+100min to kickoff+8h.
- **CLV capture** — during each poll cycle, captures closing odds for picks near kickoff.
- **Revalidation** — instant cache bust via POST to `/api/revalidate` after `/pick`, settlement, `/void`.
- **Announce picks/results to TG channel + FB Page** — new picks, results (with card photos), voids, and weekly digests.
- **Auto-link watching to pick** — fuzzy team name match links watching entries to picks automatically.

---

## 2. Backlog / Planned Features

- **Forum** — schema and pages built, feature-flagged off. Enable at ~200 daily visitors. Tables: `profiles`, `forum_threads`, `forum_comments`. RLS policies for authenticated writes.
- **Community predictions** — "Who wins?" vote for all matches.
- **Personal P/L tracker** — per-user profit/loss tracking.
- **Web push notifications** — browser push for new picks/results.
- **Multi-league support** — currently WC only. Config is dynamic-ready (`LOOKUP_LEAGUE` constant, `WC_COMPETITION_ID` for livescore).
- **Buzz v3** — dynamic sources from actual Serper results per match (beyond the current hardcoded forum list).
- **Match center pages** — dedicated page per fixture with full stats.
- **Leaderboard community predictors** — ranking system for community prediction accuracy.
- **Admin Dashboard Phases 2–3** — Phase 2: Newsroom management (view / edit / delete / re-generate articles) + AI content assist (AI thesis from odds, expand→preview before publish, content calendar flagging matches with no content). Phase 3: Tournament / team / season / schedule management (leagues, seasons, teams + logos, fixtures synced from odds-api or manual, group standings, results) — the data backbone for multi-league.
- **Vercel KV persistence for live matches** — upsert matches when live so HT/FT states survive the livescore feed gap (serverless has no in-memory cache); keeps finished matches visible within the 6h window.
- **Today's Matches timezone window** — move from a flat 6h rolling window to `(now − 6h) → end of local day` to stop the midnight-UTC cliff that drops the prior day's matches (spec'd, not yet deployed).
- **SEO implementation** — structured data (WebSite, Organization, SportsEvent, NewsArticle, FAQPage), hreflang clusters for 4 languages, canonical tags, html lang per locale, Daily Line in sitemap. Spec ready (`seo-spec-v1.md`).
- **PWA install prompt** — site has manifest + service worker, needs install prompt UX.
- **Share card as image** — render Daily Line result card as downloadable/shareable image.
- **Match hub filters** — date picker, status filter, league filter, team search on `/matches`.
- **Comprehensive a11y pass** — ARIA landmarks, aria-labels on navs, aria-current on active items, screen reader testing.
- **Off-page SEO / backlinks** — guest-post outreach list (Medium, Reddit, Quora, football forums) to build domain authority; pairs with the `/match` hub pages for internal linking.
- **Newsroom auto-post go-live** — flip from gated to fully live after a demo `/watching` confirms FB card image + EN caption + UTM.
- **Channel Management** — outbound multi-platform push-config. Admin dashboard: add channel (X/TikTok/FB/TG/IG) + credentials + choose langs + order → WP auto-push event-driven (pick/article/Booth/settle). Replace hardcoded TG+FB. Scoped 24/6, build next session.
- **The Booth live-shadow verify** — real-time pipeline test on a live match with pick (poll/diff/latency). Replay-verified P1b, live verify pending next pick.
- **ADMIN_EMAILS gate** — before enabling forum registration, gate all admin routes by email allowlist. Especially `/api/admin/posts/generate` (AI token cost).
- **EPL E8 QA** — end-to-end test when EPL fixtures available (July). Reconcile team composition if different from seeded 2026-27.

---

## 3. Tech Stack / API Integrations

### Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Web | Next.js (App Router) | Vercel |
| Worker | Node.js + grammY (Telegram bot, long polling) | Railway |
| DB | Supabase (PostgreSQL) | Supabase Cloud |
| AI | Anthropic Claude (Haiku for recaps/buzz/translations, Sonnet for analysis/news) | Anthropic API |
| Settlement | `@wildlyplay/settlement` (pure TypeScript package, deterministic) | Bundled |

### API Integrations

| Service | Used For | Module |
|---------|----------|--------|
| **odds-api.io** | Event lookup, auto-settle (final scores), closing odds (CLV), team logos (participant IDs) | `event-lookup.ts`, `scores.ts`, `clv.ts`, `poll.ts` |
| **livescore-api.com** | Today's fixtures, live scores, match events/commentary | `matches.ts` (web), `/api/events/`, `/api/live-clock/` |
| **Serper.dev** | Google Search for community buzz (forum-priority queries) | `buzz.ts` |
| **Anthropic Claude** | Recap articles (Haiku), preview articles (Haiku), analysis articles (Sonnet), news articles (Sonnet), buzz summaries (Haiku), thesis translations (Haiku), note translations (Haiku) | `recap.ts`, `preview.ts`, `news.ts`, `watching-news.ts`, `buzz.ts`, `translate.ts`, `buzz-note.ts` |
| **Telegram Bot API** | Curator bot (grammY, long polling) + channel announcements | `bot.ts`, `announce.ts`, `announce-pick.ts`, `digest.ts` |
| **Facebook Graph API** | Page feed posts (picks, results, digests) + photo posts (result cards) | `announce-pick.ts`, `announce.ts`, `digest.ts` |
| **Vercel** | Web hosting + on-demand revalidation via `/api/revalidate` | `revalidate.ts` |

### Environment Variables

#### Worker (`apps/worker`)

| Variable | Required | Description |
|----------|----------|-------------|
| `CURATOR_BOT_TOKEN` | Yes | Telegram bot token from @BotFather |
| `CURATOR_USER_IDS` | Yes | Comma-separated Telegram user IDs allowed to use the bot |
| `CHANNEL_CHAT_ID` | No | TG channel/group chat ID for announcements |
| `SUPABASE_URL` | No | Supabase project URL (unset = in-memory mock store) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |
| `ODDS_API_KEY` | No | odds-api.io key (without it: no auto-settle, no CLV, no event lookup) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (without it: no AI recaps, news, analysis, translations, buzz) |
| `RECAP_MODEL` | No | Claude model for recaps/translations/buzz. Default: `claude-haiku-4-5-20251001` |
| `ANALYSIS_MODEL` | No | Claude model for analysis/news articles. Default: `claude-sonnet-4-6` |
| `SERPER_API_KEY` | No | Serper.dev key for community buzz forum search |
| `SITE_URL` | No | Public site base URL. Default: `https://www.wildlyplay.com` |
| `REVALIDATE_SECRET` | No | Shared secret for on-demand web cache busting |
| `FB_PAGE_ID` | No | Facebook Page ID for announcements |
| `FB_PAGE_TOKEN` | No | Facebook Page access token |
| `ANALYSIS_INTERVAL_H` | No | Analysis cron interval in hours. Default: `12` |
| `ANALYSIS_CAP` | No | Max analysis articles per cron run. Default: `1` |

#### Web (`apps/web`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (falls back to mock data) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key for client-side reads |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (server-side writes: votes, revalidation) |
| `LIVESCORE_API_KEY` | No | livescore-api.com API key |
| `LIVESCORE_API_SECRET` | No | livescore-api.com API secret |
| `ODDS_API_KEY` | No | odds-api.io key (team logos, live clock) |
| `REVALIDATE_SECRET` | No | Shared secret for the `/api/revalidate` endpoint |

---

## 4. Command Reference

### /pick

Publishes a new pick. All fields are parsed line-by-line in `key: value` format.

**Required fields:** `match`, `league`, `kickoff`, `market`, `selection`, `odds`, `stake`, `thesis`
**Conditional fields:** `line` (required for ah/ou, forbidden for 1x2/btts)
**Optional fields:** `event` (odds-api.io event ID), `score` (in-play score at entry)

**Validation rules:**
- `market` must be one of: `ah`, `ou`, `1x2`, `btts`, `other`
- `odds` must be between 1.01 and 100 (decimal)
- `stake` must be between 0.25 and 5 units, in 0.25 steps
- `kickoff` must be a valid ISO datetime in the future (unless running pick with `score:`)
- `thesis` is free text consuming the rest of the message (all lines after `thesis:`)

**Pre-match pick example:**

```
/pick
match: Mexico vs Canada
league: FIFA World Cup 2026
kickoff: 2026-06-12T02:00:00Z
market: ah
selection: Mexico -0.5
line: -0.5
odds: 1.85
stake: 1
thesis: Mexico at home in the opener, crowd factor
massive. Canada shaky away in qualifiers. Expect
Mexico to control tempo and win by at least 1.
```

**Running (in-play) pick example:**

```
/pick
match: Brazil vs Serbia
league: FIFA World Cup 2026
kickoff: 2026-06-14T19:00:00Z
market: ah
selection: Brazil -0.5
line: -0.5
odds: 1.72
stake: 1
score: 1-0
thesis: Brazil leading 1-0 after 35 min, Serbia can't
get out of their half. Expecting Brazil to hold and add.
```

**What happens after /pick:**
1. Bot parses and validates all fields
2. Auto-lookup event ID via odds-api.io (if `event:` omitted)
3. Insert immutable pick row into DB
4. Revalidate web cache
5. Auto-link matching watching entry (if any)
6. Reply with confirmation card
7. Fire-and-forget (parallel, never block):
   - Preview article (4 languages)
   - Thesis translations (vi/th/es)
   - Analysis article (pre-match only, skipped for running picks)
   - Announce to TG channel + FB Page

### /score

Manual settlement for picks without auto-settle (no event ID or market `other`).

```
/score <pick_id> <home_score>-<away_score>
```

**Example:**

```
/score 8d4f3a1b 2-0
```

Only works on picks with status `published`. After settlement: announces result to TG channel + FB Page, generates recap article, revalidates web cache.

### /void

Cancel a pick before kickoff. The pick stays visible with a VOID badge; does not count toward the record.

```
/void <pick_id>
```

Only works on picks with status `published` and kickoff still in the future. Announces void to TG channel + FB Page.

### /watching

Signal interest in a match before committing to a pick.

**Required fields:** `match`, `kickoff`
**Optional fields:** `league` (default: "FIFA World Cup 2026"), `note` (free text, rest of message)

**Example:**

```
/watching
match: Argentina vs Germany
league: FIFA World Cup 2026
kickoff: 2026-07-19T18:00:00Z
note: Messi's last match? Watch his fitness
in warm-up. Germany midfield depth concern.
```

**What happens after /watching:**
1. Insert watching row (status: `active`)
2. Revalidate web cache
3. Fire-and-forget (parallel):
   - Translate note into 4 languages
   - Generate buzz snapshot immediately (Serper + AI)
   - Publish news article (4-language pre-match preview)

### /unwatch

Remove a watching entry by setting its status to `expired`.

```
/unwatch <watching_id>
```

### /board

Display today's published picks in the bot chat.

```
/board
```

Shows each pick with: teams, kickoff time (UTC), market, selection, odds, stake, and pick ID.

### /record

Display the overall settled record.

```
/record
```

Shows: W-L-P count, total units P/L, number of settled picks.

---

## 5. Database Schema

All tables live in Supabase (PostgreSQL) with Row Level Security enabled.

### picks (the trust object)

Immutable after publish (enforced by trigger `picks_guard_immutable` + delete rule `picks_no_delete`). Only settlement fields and status transitions are writable post-publish.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `fixture_id` | bigint | odds-api.io event ID; 0 = manual settlement |
| `league` | text | e.g. "FIFA World Cup 2026" |
| `kickoff_utc` | timestamptz | Match kickoff time |
| `home_team`, `away_team` | text | Team names |
| `market` | enum | `ah`, `ou`, `1x2`, `btts`, `other` |
| `selection` | text | e.g. "Mexico -0.5", "Over 2.5" |
| `line` | numeric(4,2) | AH/OU line; null for 1x2/btts |
| `odds_publish` | numeric(6,3) | Odds snapshot at publish (immutable) |
| `odds_close` | numeric(6,3) | Closing odds for CLV (captured near kickoff) |
| `publish_score_home/away` | integer | Running pick: score at entry; null = pre-match |
| `home_id`, `away_id` | integer | odds-api.io participant IDs for team logos |
| `stake_units` | numeric(4,2) | Stake in units (0.25-5) |
| `thesis` | text | Curator's reasoning |
| `status` | enum | `draft`, `published`, `won`, `lost`, `push`, `void` |
| `home_score`, `away_score` | integer | Final score (set on settlement) |
| `raw_outcome` | enum | `win`, `half_win`, `push`, `half_loss`, `loss`, `void` |
| `units_pl` | numeric(7,2) | Profit/loss in units |
| `settled_at` | timestamptz | When settled |

### pick_content

AI-generated thesis translations per language.

| Column | Type | Description |
|--------|------|-------------|
| `pick_id` | uuid (FK) | References picks |
| `lang` | enum | `en`, `vi`, `th`, `es` |
| `title` | text | Selection text |
| `body_md` | text | Translated thesis |
| `model` | text | Which Claude model generated it |

### posts (Newsroom)

AI-generated articles: recaps, previews, analysis, news.

| Column | Type | Description |
|--------|------|-------------|
| `type` | enum | `recap`, `preview`, `news` |
| `slug` | text | URL slug, unique per (slug, lang) |
| `lang` | enum | `en`, `vi`, `th`, `es` |
| `title` | text | Article title / SEO meta title |
| `body_md` | text | Markdown body |
| `body_md_draft` | text | AI regen draft, separate from live body_md |
| `stale` | boolean | Marks lang versions potentially out of sync |
| `pick_ids` | uuid[] | Related pick IDs |
| `meta_title`, `meta_description`, `target_keyword` | text | SEO fields (analysis/news) |

### watching

Curator's match watchlist with community buzz.

| Column | Type | Description |
|--------|------|-------------|
| `home_team`, `away_team` | text | Team names |
| `league` | text | Default: "FIFA World Cup 2026" |
| `kickoff_utc` | timestamptz | Match kickoff |
| `note` | text | Optional curator hint |
| `note_translations` | jsonb | 4-language translations of note |
| `note_translations_draft` | jsonb | Translation draft for admin review |
| `status` | text | `active`, `picked`, `expired` |
| `pick_id` | uuid (FK) | Set when `/pick` for this match |
| `buzz_history` | jsonb | Array of BuzzSnapshot objects |

### pick_votes

Anonymous crowd poll (Follow/Fade/Skip).

| Column | Type | Description |
|--------|------|-------------|
| `pick_id` | uuid (FK) | References picks |
| `vote` | enum | `follow`, `fade`, `skip` |
| `voter_id` | uuid | Anonymous cookie-based ID |

### channel_log

Distribution audit trail for all announcements.

| Column | Type | Description |
|--------|------|-------------|
| `pick_id` | uuid (FK) | Related pick |
| `channel` | text | `web`, `telegram`, `x`, `facebook` |
| `external_id` | text | TG message ID or FB post ID |

### gl_daily_cards (Daily Line)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `card_number` | integer | Sequential card number |
| `utc_date` | date | Card date |
| `goal_line` | numeric | Combined goal line (e.g. 7.5) |
| `over_odds` | numeric | De-vigged Over odds |
| `under_odds` | numeric | De-vigged Under odds |
| `cutoff_time_utc` | timestamptz | Pick deadline (2min before first kickoff) |
| `status` | enum | `draft`, `scheduled`, `open`, `locked`, `live`, `settled`, `voided` |
| `settlement_result` | text | `over`, `under`, `void`, null |
| `void_reason` | text | Reason if voided |

### gl_matches

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `external_match_id` | text | Livescore fixture ID |
| `home_team`, `away_team` | text | Team names |
| `kickoff_time_utc` | timestamptz | Match kickoff |
| `status` | enum | `scheduled`, `live`, `finished`, `postponed`, `abandoned` |
| `home_score`, `away_score` | integer | Current/final scores |
| `valid_goals` | integer | Total goals (home + away) |

### gl_daily_card_matches

Junction table linking cards to matches (daily_card_id, match_id, sort_order).

### gl_picks

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (FK) | References gl_users |
| `daily_card_id` | uuid (FK) | References gl_daily_cards |
| `side` | enum | `over`, `under` |
| `odds_locked` | numeric | Odds at pick time |
| `stake_points` | integer | Always 100 |
| `status` | enum | `locked`, `won`, `lost`, `void` |
| `net_profit` | numeric | Points won/lost |

### gl_users

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `device_id` | text | localStorage device identifier |
| `display_name` | text | e.g. "Anonymous Penguin" |
| `discriminator` | text | 4-digit suffix |

### gl_weekly_leaderboard (view)

Materialized weekly rankings: user_id, display_name, discriminator, score, winning_days, current_streak, rank.

### feature_flags

Simple key-value feature flags. Additions: `booth` (OFF), `epl_standings` (OFF).

### booth_shadow

Shadow commentary table for The Booth AI live commentary.

| Column | Type | Description |
|--------|------|-------------|
| `pick_id` | uuid (FK) | References picks |
| `match_id` | text | Livescore match ID |
| `event_type` | text | GOAL, GOAL_PENALTY, OWN_GOAL, RED_CARD, HT, FT |
| `event_minute` | text | Minute of the event (text for "45+2" stoppage time) |
| `event_detail` | jsonb | Event metadata |
| `lead_voice` | text | Sonny or Cole |
| `lines_en` | jsonb | English commentary lines |
| `lines_vi` | jsonb | Vietnamese commentary lines |
| `lines_th` | jsonb | Thai commentary lines |
| `lines_es` | jsonb | Spanish commentary lines |
| `lint_passed` | boolean | Whether regex lint passed |
| `lint_flags` | text[] | Lint rule violations if any |
| `model` | text | Claude model used |
| `created_at` | timestamptz | When generated |

### teams

Team registry with canonical names, short names, and provider aliases.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `canonical_name` | text | Official team name |
| `short_name` | text | 3-letter code (e.g. MUN, ARS) |
| `country` | text | Country of origin |
| `slug` | text | URL-safe slug |
| `aliases` | text[] | All known name variants for provider matching |
| `odds_api_name` | text | Name used by odds-api.io |
| `livescore_name` | text | Name used by livescore-api.com |
| `logo_url` | text | Team logo URL |

EPL 20 teams seeded (2026-27 composition: +Coventry/Hull/Leeds/Sunderland, kept Leicester/Southampton/West Ham/Wolves for history). Comprehensive aliases for provider matching (Man Utd/MU/MUFC, Spurs/THFC, Wolves/WWFC etc). "City" bare-word excluded from Man City aliases to prevent false-match.

### track_record (view)

Materialized summary: wins, losses, pushes, units_pl, settled count from settled picks.

---

## 6. Architecture Decisions

Key design decisions referenced in code comments:

- **Picks are immutable** — odds at publish never change. DB trigger enforces this.
- **Display rule** — half-win shows as WON badge, half-loss as LOST badge; real math always shown in raw_outcome + units_pl.
- **Fire-and-forget pattern** — AI generation (previews, recaps, analysis, translations, buzz) never blocks the main pipeline. Failures are logged and skipped.
- **No accounts in v1** — crowd poll uses anonymous cookie-based voter IDs.
- **Forum gated by feature flag** — schema built, enabled at ~200 daily visitors.
- **Running picks** — AH settles on goals scored AFTER entry; OU/1x2/BTTS settle on full final score.
- **CLV strict matching** — if the exact line is gone at close, odds_close stays null. Transparency over coverage.
- **Analysis skipped for running picks** — no SEO value for mid-match articles.
- **Settlement math is deterministic code** — lives in `packages/settlement`, no AI involved.
- **Live status from real score, not clock** — a match is "live" only when the API returns a real score after true kickoff; the live feed listing a match early does not flip it to live (prevents false `2'` before kickoff). Kickoff read from `scheduled`, not `added`.
- **Watching expires, buzz stops at kickoff** — watching auto-expires ~3h post-kickoff and buzz fetches stop once a match starts; keeps the homepage current and saves Serper/AI quota. Articles + `/match` hub remain the durable (anti-orphan) path after a teaser disappears.
- **livescore feed has no HT/FT state** — `fixtures` returns upcoming only; the live endpoint drops a match at half-time and full-time. HT/FT must be inferred from the last-known minute, and persistence (planned Vercel KV) is needed to keep a match visible across the gap (serverless = no in-memory cache).

---

## 7. Cron / Background Jobs Summary

| Job | Interval | Module | Description |
|-----|----------|--------|-------------|
| Daily Line cron | 15 min | worker `index.ts` | Auto-create, auto-lock, auto-settle Daily Line cards via `/api/goalline/cron` |
| Auto-settle poller | 10 min | `poll.ts` | Settle published picks via odds-api.io |
| CLV capture | 10 min (during poll) | `clv.ts` | Capture closing odds near kickoff |
| Buzz cycle | 3 hours | `buzz.ts` | Community sentiment for active watching |
| Buzz pre-kickoff | 30 min | `buzz.ts` | Tighter buzz updates 1-2h before kickoff |
| Watching auto-expire | 30 min (in buzz cycle) | `buzz.ts` | Expire watching ~3h after kickoff; drop from homepage teasers |
| Analysis cron | 12 hours | `news.ts` | Auto-generate analysis articles (cap 1/run, default 2/day max) |
| Weekly digest | Hourly check, fires Sundays 13:00 UTC | `digest.ts` | Weekly record summary to TG + FB |
| Booth shadow cron | 30 sec | `booth-shadow.ts` | Event-driven AI commentary. Polls events_url for live pick-matches, diffs new events, triggers AI gen. 90s debounce per match. Railway worker. |

---

## 8. Strategic Context & Go-to-Market

*(Product/business context — not in code. Added by Jane to complement the technical doc.)*

### Brand & Positioning
- **"The Curator @ WildlyPlay"** — the human Curator picks the match + kèo + thesis (the irreplaceable human judgment); AI runs ~90% of everything downstream (settlement, articles, translations, announcements, buzz). 100% disclosure: picks are human-made, articles AI-written.
- Telegram-first football media; transparency-led tipster brand (full public track record, units P/L, CLV).
- **The Booth**: dual-persona AI commentary (Sonny optimist + Cole skeptic) bantering on each key event — honesty-led (no tips, no victory-lap, calibrated), tied to the Curator's thesis, in 4 languages. The "two-way concede" creates emergent humour + honesty a single-voice tipster can't manufacture.

### Launch Timeline
- **Official launch: ~mid-August 2026** (start of the English Premier League season).
- **WC 2026 (now): internal dry-run** — full pipeline runs live but treated as a soft test, posted to Telegram.
- **EPL launch prep (24/6):** infra ready — 20-team 2026-27 registry + aliases, EPL standings league-mode behind `epl_standings` flag (OFF). Remaining: fixtures (July) → E8 E2E → flip flag (Aug).

### Markets / Language Rollout
- Launch: **EN + VI**.
- **/th** (Thai tipster niche): phase 2 — entertainment framing, no bookmaker links.
- **/es**: phase 3.

### Monetization
- **Donation only**, crypto **USDT TRC-20** (wallet at wildlyplay.com/donate).
- No bookmaker affiliate links (Google-compliance + entertainment framing).

### Data Budget
- ~$30–50/mo approved. Paid: livescore-api.com (€11/mo if kept past 14-day trial). odds-api.io + Serper.dev on free tiers (Serper 2500/mo, est. ~300 used).

### Forum Activation
- Built + feature-flagged OFF; enable at **~200 daily visitors**.

### Buzz Cadence (tuned)
- High-value updates: at /watching (T-0) + ~T-1h kickoff (after lineup confirm). Mid-window 3h cron kept light to save Serper quota — sentiment changes slowly.

### Daily Line (formerly GoalLine)

Route: `/daily-line` (308 permanent redirect from `/goalline`). A daily Over/Under prediction game on aggregate football goals.

- **Daily cards** — 3 WC matches per card with a combined goal line derived from Sbobet totals (de-vigged to ~50/50 probability). Users pick Over or Under before a cutoff time, staking 100 pts per card.
- **Lifecycle** — open → locked (at cutoff) → live (matches in progress) → settled/voided. Card status transitions are enforced by the cron and admin actions.
- **Line derivation** — odds-api.io `/events/search` + `/odds?bookmakers=Sbobet` → totals decimal odds, de-vigged. `SEARCH_ALIASES` map team name differences (Turkey→Turkiye, Czech Republic→Czechia, etc.). Guardrails: line must be 1.5–12.5, odds 1.3–4.0.
- **Auto-lifecycle cron** — Railway worker polls `POST /api/goalline/cron` every 15 minutes. Three steps run concurrently: (1) auto-create tomorrow's card if ≥3 WC matches + odds available, (2) auto-lock open cards past cutoff, (3) auto-settle locked/live cards when all matches finished. Score sync from livescore-api.com (live feed + fixture feed). Vercel cron backup: daily at 18:00 UTC.
- **Settlement rules** — Over wins when total goals > line (can clinch mid-card before all matches finish). Under wins when all matches finish and total ≤ line. Void if any match postponed/abandoned (unless Over already clinched).
- **Anonymous users** — device_id via localStorage, auto-generated random animal names (Anonymous Penguin, Anonymous Bear, etc.). No accounts required.
- **Community split** — Over/Under percentage revealed after user picks (spec §10).
- **Leaderboard** — Weekly tab (from `gl_weekly_leaderboard` materialized view) + All-Time tab (aggregated from `gl_picks`). Medal emoji for top 3.
- **My Picks** — per-device pick history with card links and P/L.
- **Archive** — all cards with status badges and settlement results.
- **Admin** — `/admin/goalline` shows cards with match details (teams, scores, status, kickoff), Settle/Void buttons.

**UX features:**
- **Sticky goal tracker** — fixed bar at top showing "4/7.5 — Under leading" when scrolling past the goal line card. Pulsing green dot for live status.
- **Match timeline dots** — colored dots per goal (green=home, blue=away) below match list.
- **How-it-works onboarding** — 3-step dismissible card (Check the line → Make your pick → Watch & climb). Remembers dismissal in localStorage. Eager-loaded (above fold).
- **Streak counter** — "🔥 X day streak" for consecutive daily picks.
- **Social proof** — "👥 X players picked today" via `/api/goalline/card-stats`.
- **Pre-match insights** — "Avg 2.5 goals/match implied" + progress tracker ("4 goals in 2 matches · 1 to go").
- **Pick toast notifications** — real-time "🐧 Anonymous Penguin picked Over" toast at bottom. Polls `/api/goalline/recent-picks` every 30s, pauses when tab hidden (visibilitychange). Auto-dismiss after 4s.
- **Loading skeletons** — shimmer placeholders for GoalLine, News, Archive, Stats pages (Next.js `loading.tsx`).

**i18n (4 languages):**
- EN (default), VI, TH, ES via `?lang=xx` query parameter.
- All UI strings translated: nav (Lượt chọn/Lưu trữ/BXH), onboarding, card labels (Tài/Xỉu, สูง/ต่ำ, Más/Menos), confirmation, states, leaderboard, engagement.
- Dict pattern: `getDailyLineDict(lang)` returns typed string object per language.
- Thai font (`Noto Sans Thai`) loaded conditionally only when `html[lang="th"]`.

### Design System v1 (Phase B→C)

Brand guide authored by Jane (Phase B), implemented by Gwen (Phase C). Anchored to live site CSS audit — formalization, not redesign.

- **Tokens in `globals.css`**: primary green `#00E676` (dark) / `#059652` (light), semantic colors (warning `#FCBB00`, info `#54A2FF`, secondary, brand-hover `#00D294`/pressed `#059652`), radius scale (sm 6px / md 10px / card 14px / pill 999px), shadows (card / raised / focus-glow), indigo light-safe `#4F46E5`.
- **Typography**: Space Grotesk (display/headings, 600/700) + Inter (body/UI, 400/500/600). Noto Sans Thai fallback for Thai locale.
- **Theme**: dark-first (default). Light theme uses darker brand greens and indigo for contrast on white. Over/Under colors are theme-aware (`--t-over`, `--t-under`).
- **Accessibility**: `prefers-reduced-motion` disables all animations/transitions. `*:focus-visible` green outline ring site-wide. Skip-to-content link. Touch targets ≥44px (hamburger menu fixed from 26x18 to 44x44).
- **Components**: shadow-card applied to all interactive cards (PickCard, MatchCard, NewsCard, WatchingTeaser, About cards). Status badges use tinted backgrounds (Open=green, Locked=amber, Live=green+pulse, Settled=muted, Voided=red).
- **Performance**: lazy-load below-fold components (Toast, EngagementBar) via React.lazy + Suspense. HowItWorks eager (above-fold). Polls 30s + pause on tab hidden. Reserved min-height for async data (CLS prevention). News card excerpts (140 char preview).

### SEO Status (Gaps — spec ready, pending implementation)

**Already done:** `/play` slug SEO + canonical, `/match` SportsEvent JSON-LD, sitemap.ts, robots.ts, OG/Twitter meta, per-page metadata, homepage title fixed.

**Gaps (spec at `seo-spec-v1.md`):**
- ❌ 0 structured data sitewide (need WebSite/Organization + SportsEvent on match pages + NewsArticle on news + FAQPage for Daily Line how-it-works)
- ❌ 0 hreflang despite 4 languages → need cluster (?lang=vi/th/es + x-default)
- ❌ `<html lang>` always "en" even when ?lang= is different
- ❌ canonical missing on home/daily-line/card pages
- ❌ `/daily-line` not in sitemap.xml

### Daily Line Strategic Context

Daily Line serves as a **daily engagement/retention game** (free, 100 pts/card, leaderboard + streak — no real money → entertainment framing, Google-compliant):
- **Habit loop**: new card every day → users return daily (retention).
- **Community/competition**: leaderboard + streak + social proof → competitive engagement.
- **Acquisition funnel**: low barrier entry (simple OU game) → upsell to Curator picks/follow.
- Complements brand: Curator = expert judgment picks; Daily Line = community playground. Same transparency philosophy.

---
*Tài liệu: phần 1–7 do Gwen viết từ code thật; phần 8 (chiến lược/GTM) do Jane bổ sung. Cập nhật 24/06/2026 (Gwen + Jane) — bổ sung 24/6: Post AI Regen Phase 2, Watching Translate, Standings All/Form tabs + EPL league-mode, The Booth (P0→P1c), live ticker shortNames, EPL team registry 20 đội 2026-27, OG cache fix, Channel Management (scoped). §1-7 Gwen; §8 Jane.*

> **Cập nhật 20/6:** Daily Line (game OU hàng ngày), Design System v1, i18n 4 ngôn ngữ, performance optimization, route /goalline→/daily-line, UX features (sticky tracker, toast, streak, social proof, skeletons). Phần 1–7 + Daily Line technical do Gwen viết từ code. Design/SEO/i18n/§8 do Jane bổ sung. Verify: Playwright runtime (Gwen), static audit (Jane).
