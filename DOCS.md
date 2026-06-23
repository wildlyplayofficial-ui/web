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
- **/unwatch command** — expires a watching entry.

### Website

- **Daily Board (homepage)** — today's published picks with pick cards, crowd poll, form strip (last 30 days, W/L/P circles, scrollable), and track record badge.
- **Archive** — all settled picks with month filter/pagination. Sticky record summary bar.
- **Play detail pages** — full transparency: thesis, odds at publish, market, line, stake. After settlement: raw outcome, units P/L, result badge. Includes recap article, match events, crowd poll, share bar.
- **Stats page** — ROI, average CLV, cumulative units P/L chart (server-rendered SVG), breakdown by league and by market.
- **Newsroom** — all AI-generated articles with filter tabs (All, Picks & Recaps, Analysis, News), pagination (10 per page), type badges. Latest picks & recaps pinned rail on the Picks tab.
- **Today's Matches widget** — FIFA World Cup 2026 fixtures from livescore-api.com, cached 5 minutes.
- **Live Scores ticker** — live match data via `/api/live-clock/{eventId}`, auto-refresh.
- **Match Events/Commentary** — per-match events via `/api/events/{matchId}` from livescore-api.com.
- **Team logos** — served via `/api/team-logo/{id}` using odds-api.io participant IDs.
- **Watching teasers with Community Buzz** — active watching entries displayed on the homepage with sentiment data, themes, and source attribution.
- **4 languages** — EN (default), VI, TH, ES. Language via `?lang=xx` query parameter. All UI strings, newsroom articles, thesis, buzz, and watching notes available in all 4 languages.
- **Light/dark mode** — theme support with CSS custom properties.
- **Share bar** — social sharing on play detail pages.
- **SEO** — sitemap.ts, robots.ts, Open Graph meta, Twitter cards, per-page metadata.
- **Static pages** — About, Donate, Responsible Play, Forum (feature-flagged).
- **On-demand revalidation** — worker sends POST to `/api/revalidate` with secret header after pick lifecycle events. ISR fallback at 5min (homepage/news) or 10min (archive/stats).

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

### feature_flags

Simple key-value feature flags.

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

---

## 7. Cron / Background Jobs Summary

| Job | Interval | Module | Description |
|-----|----------|--------|-------------|
| Auto-settle poller | 10 min | `poll.ts` | Settle published picks via odds-api.io |
| CLV capture | 10 min (during poll) | `clv.ts` | Capture closing odds near kickoff |
| Buzz cycle | 3 hours | `buzz.ts` | Community sentiment for active watching |
| Buzz pre-kickoff | 30 min | `buzz.ts` | Tighter buzz updates 1-2h before kickoff |
| Analysis cron | 12 hours | `news.ts` | Auto-generate analysis articles (cap 2/day) |
| Weekly digest | Hourly check, fires Sundays 13:00 UTC | `digest.ts` | Weekly record summary to TG + FB |
