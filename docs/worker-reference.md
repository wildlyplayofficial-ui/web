# Worker Reference

**Path:** `apps/worker/`
**Runtime:** Node.js (ESM, tsx)
**Deploys to:** Railway (production), local via `tsx src/index.ts` (dev)

---

## 1. Overview

The Worker is a long-running Node.js process that powers WildlyPlay's backend automation. It runs three primary systems simultaneously:

1. **Curator Bot** — A Telegram bot (grammY, long polling) that lets authorized users manage picks, watching entries, and post-mortems via chat commands.
2. **HTTP API Server** — A plain `node:http` server exposing webhook and REST endpoints that mirror every bot command, enabling the admin dashboard to drive the same pipelines.
3. **Cron Loops** — A set of `setInterval`-based schedulers for settlement polling, live score persistence, article generation, community sentiment, monitoring alerts, and more.

All three share a single `Store` abstraction backed by Supabase (production) or an in-memory mock (local smoke tests).

---

## 2. Architecture

```
index.ts (entrypoint)
  ├── bot.ts ─────────── Telegram bot (grammY, long polling)
  ├── api-routes.ts ──── HTTP API handler (/api/pick, /api/watching, etc.)
  ├── poll.ts ────────── Results poller (every 10 min)
  ├── persist-state.ts ─ Live match state persistence (adaptive 3-15 min)
  ├── buzz.ts ────────── Community sentiment cron (every 3h + 30 min pre-kickoff)
  ├── digest.ts ──────── Weekly ledger (Sundays 13:00 UTC)
  ├── news.ts ────────── Analysis article cron (every 12h)
  ├── news-gen.ts ────── News pipeline: preview/result/standings (deterministic)
  ├── booth-shadow.ts ── Live commentary shadow gen (every 30s when matches live)
  ├── dl-monitor.ts ──── Daily Line health monitor (every 15 min)
  ├── job-queue.ts ───── Durable job queue processor (every 60s)
  └── (HTTP server) ──── Webhooks + API routes on WEBHOOK_PORT/PORT
```

### Key Design Principles

- **Fire-and-forget AI**: Every AI generation (recap, preview, analysis, translation, buzz, postmortem) runs asynchronously and never blocks the primary operation. A failed generation logs a warning but never breaks the pick/watching/settlement pipeline.
- **Fail-safe announcements**: Telegram and Facebook posting follows a cascade — OG data-card image, then branded banner image, then plain text. Each channel is independent; a Facebook failure never blocks the Telegram announcement.
- **Deterministic settlement**: All settlement math lives in the shared `@wildlyplay/settlement` package. The worker only orchestrates — no math in this codebase.
- **4-language output**: All AI-generated content produces en/vi/th/es sections. Language splitting uses flag-emoji delimiters parsed by `splitLangSections()` in `recap.ts`.
- **Author firewall**: Every pick, watching, and article carries an `author` field (`curator` or `scout`). The `author_type` disclosure (`real_human` / `fictional_ai`) is always server-derived via `authorTypeOf()` — never accepted from the client.

---

## 3. Modules

### 3.1 Store (`store.ts`)

Abstraction over Supabase. Two implementations:

- **`SupabaseStore`** — Production. Uses service-role key for full DB access. Handles picks, watching, posts, pick_content, channel_log, and gl_groups tables.
- **`MemoryStore`** — Smoke testing. In-memory maps, no external dependencies.

Selection is automatic: if `SUPABASE_URL` is unset, the worker runs in mock mode.

The store also enforces an SEO lint gate on article insertion (`seo-lint.ts`) — articles that fail deterministic quality checks are rejected before reaching the database. Presence (watch-lite) posts bypass this gate via `skipLint: true`.

### 3.2 Allowlist (`allowlist.ts`)

Parses the `CURATOR_USER_IDS` environment variable (comma-separated Telegram user IDs) into a `Set<number>`. The bot middleware silently ignores messages from users not on the list.

### 3.3 Telegram Bot (`bot.ts`)

Built on grammY. Commands:

| Command | Description |
|---------|-------------|
| `/pick` | Publish a new pick. Triggers: preview article, thesis translation, analysis article, TG/FB announcement, event auto-attach. |
| `/board` | Show today's published picks (curator only). |
| `/record` | Show W-L-P record and total units. |
| `/score <id> <home>-<away>` | Manually settle a pick with a final score. |
| `/void <id>` | Void a pick before kickoff. Stays visible with VOID badge. |
| `/watching` | Add a match to the watch list. Triggers: note translation, news article, buzz snapshot, TG/FB card. |
| `/noplay` | Log a deliberate pass on a match. Triggers: no-play article, TG/FB card. |
| `/review <id>` | View the AI-generated post-mortem draft for a settled pick. |
| `/approve <id> [loss_type]` | Approve a post-mortem. Loss type required for losses: `variance`, `thesis-error`, `price-error`, `model-error`. |
| `/overdue` | List picks with pending post-mortems past the 24h SLA. |
| `/unwatch <id>` | Expire a watching entry. Removes orphan presence articles. |

The bot also handles `my_chat_member` events for Daily Line TMA group lifecycle (registering/deregistering groups when the bot is added/removed).

### 3.4 HTTP API (`api-routes.ts`)

Every bot command has a corresponding HTTP endpoint for the admin dashboard. All routes are POST (the server only accepts POST). Auth is via `x-webhook-secret` header matching `REVALIDATE_SECRET`.

| Route | Description |
|-------|-------------|
| `POST /api/pick` | Publish a pick (same pipeline as `/pick` bot command). |
| `POST /api/watching` | Add a watching entry. Supports `presence` field for watch-lite cards. |
| `POST /api/noplay` | Log a no-play decision. |
| `POST /api/score` | Settle a pick: `{ pickId, home, away }`. |
| `POST /api/void` | Void a pick before kickoff: `{ pickId }`. |
| `POST /api/approve` | Approve a post-mortem: `{ pickId, lossType?, reviewText? }`. |
| `POST /api/unwatch` | Expire a watching entry: `{ watchingId, note? }`. |
| `POST /api/board` | List today's published picks. Optional `author` filter. |
| `POST /api/record` | Get W-L-P record and units. Optional `author` filter. |
| `POST /api/review` | Get post-mortem details for a pick: `{ pickId }`. |
| `POST /api/overdue` | List overdue post-mortems. |
| `POST /api/fixtures/finished` | Fetch finished fixtures from LiveScore (last N days). |
| `POST /api/fixtures/upcoming` | Fetch upcoming fixtures from LiveScore (next N days). |

Legacy webhook routes:

| Route | Description |
|-------|-------------|
| `POST /webhook/watching` | Trigger watching pipeline for a `watchingId`. |
| `POST /webhook/pick` | Trigger pick pipeline for a `pickId`. |

### 3.5 Parsers

Pure functions with no I/O. Each returns a typed result or an error list.

- **`parse-pick.ts`** — Parses the `/pick` command text into a `ParsedPick`. Validates match, league, kickoff (future), market (ah/ou/1x2/btts/other), selection, line, odds (1.01-100), stake (0.25-5 in 0.25 steps), confidence (low/medium/high), edge taxonomy, supporting evidence (max 2), author (curator/scout), hook, and against_market flag. Thesis is free-text and must be the last field.
- **`parse-watching.ts`** — Parses `/watching`. Fields: match, league, kickoff, note (free-text, last field), reason, author, presence.
- **`parse-noplay.ts`** — Parses `/noplay`. Reasons: `NO_EDGE`, `PRICE_TOO_SHORT`, `VARIANCE_TOO_HIGH`, `TEAM_NEWS_UNCLEAR`, `MARKET_EFFICIENT`, `SIGNAL_UNSTABLE`, `VALUE_GONE`.

### 3.6 Settlement (`settle.ts`, `scores.ts`)

- **`settle.ts`** — Orchestration only. Maps market/selection onto `@wildlyplay/settlement` functions (`settleAsianHandicap`, `settleOverUnder`, `settle1x2`, `settleBtts`). Handles running picks (in-play AH offset). Persists `home_score`, `away_score`, `raw_outcome`, `units_pl`, `status`, `settled_at`.
- **`scores.ts`** — Fetches the 90-minute regulation score from odds-api.io. Uses `periods["ft"]` to avoid settling on ET/penalty goals. Falls back to top-level score with a warning if periods data is missing.

### 3.7 Results Poller (`poll.ts`)

Runs every 10 minutes. For each published pick:

1. Skips if < 100 minutes since kickoff (match not plausibly finished).
2. Skips if > 8 hours since kickoff (past polling window — settle manually).
3. Skips if `fixture_id` is 0 (no event attached).
4. Fetches score. If finished, settles the pick and fires `onSettled` (announce result, revalidate, enqueue postmortem, ping IndexNow).

Also runs CLV capture during each poll cycle (see 3.8).

### 3.8 CLV Capture (`clv.ts`)

Closing Line Value: captures Bet365 closing odds for each pick near kickoff. Window: kickoff -15 min to kickoff +45 min. Strict matching — if the exact line is gone at close, `odds_close` stays null. Supports AH (Spread market), OU (Goals Over/Under), and 1X2 (ML market). BTTS is not supported in v1.

### 3.9 Announcements

Three modules handle distribution:

- **`announce-pick.ts`** — Announces new picks and voids to TG channel + FB Page. OG data-card cascade: OG card image -> branded PICK banner -> plain text. FB gets branded hero image with OG data-card as first comment.
- **`announce.ts`** — Announces settlement results. Same cascade pattern. Includes record summary line. After announcing, generates recap posts (web-only, no extra TG push).
- **`announce-article.ts`** — Generic article announcer for any newsroom post type (preview, recap, analysis, no-play, post-mortem). Builds UTM-tagged links, sends branded type-specific images.

### 3.10 AI Content Generation

All AI content uses the Anthropic Messages API via `callClaude()` in `recap.ts` (plain fetch, no SDK). Default model: `claude-haiku-4-5-20251001`. Timeout: 120 seconds.

#### Preview (`preview.ts`)
Pre-match article generated when a pick publishes. 4 languages, 150-250 words each. Web/SEO-only — no TG/FB notification (the PICK card is the canonical announcement).

#### Recap (`recap.ts`)
Post-match recap generated after settlement. Two variants:
- **Channel recap**: Short (60 words per language), posted to the newsroom.
- **Recap article**: Longer (150-250 words per language), published to `/news`.

Includes a fabrication guard (`detectClosingLineFabrication`) that blocks recaps that reference closing odds when none were captured.

#### Analysis (`news.ts`)
Pre-match analysis articles. Run on-demand (pick-triggered) and via cron (default every 12h, cap 1/run, max 2/day). Configurable via `ANALYSIS_INTERVAL_H`, `ANALYSIS_CAP` env vars. Includes a polarity guard (`detectPolarityInversion`) that blocks articles where a negative consensus edge is inverted into a positive "edge" claim.

#### Thesis Translation (`translate.ts`)
Translates the curator's English thesis into vi/th/es. Stored in `pick_content` table for the 4-language web UI.

#### Post-mortem (`postmortem.ts`, `postmortem-article.ts`)
Two-phase workflow:
1. **Draft** (`postmortem.ts`): AI generates a review draft after settlement. 100-150 words. Fires via durable job queue.
2. **Article** (`postmortem-article.ts`): After curator `/approve`, generates a 4-language newsroom article. Published to `/news` and announced on TG/FB.

Loss types for failed picks: `variance`, `thesis-error`, `price-error`, `model-error`.

#### Watching News (`watching-news.ts`)
Pre-match preview article generated when `/watching` is used. Deep-gate watching entries get full AI-generated 400-600 word articles. Presence (watch-lite) entries get minimal note-only posts (no AI). Includes player photo hero injection from `player_photos` table.

#### No-Play Article (`noplay-article.ts`)
Discipline-framed article when the curator passes on a match. 4 languages, 300-500 words each.

#### Note Translation (`buzz-note.ts`)
Translates the curator's watching note into 4 languages. Stored as `note_translations` on the watching row. For presence cards, propagates translations into already-published posts.

### 3.11 Community Buzz (`buzz.ts`)

AI-powered community sentiment snapshots for watched matches. Uses Serper (Google Search API) to search real forum content from Reddit, Covers, AsianBookie, VOZ, etc.

Output: JSON with `sentiment_pct` (0-100), `lean_label` (4 langs), `themes` (3 per lang), and `confidence` (low/medium/high). Stored as `buzz_history` array on the watching row.

Three cycles:
- **Main**: Every 3 hours, all active watching entries (dedup: skip if last buzz < 2h ago).
- **Pre-kickoff**: Every 30 minutes, matches 1-2h from kickoff (tighter dedup: 30 min).
- **Auto-expire**: Every 30 minutes, expire watching entries where kickoff passed 2+ hours ago.

### 3.12 Weekly Digest (`digest.ts`)

Weekly ledger card posted to TG channel + FB Page. Schedule: Sundays 13:00 UTC (20:00 ICT). Includes all-time W-L-P record, weekly picks/passes count, and calibration by confidence level. Skips silently on zero-activity weeks.

### 3.13 Live Match Persistence (`persist-state.ts`)

Persists live scores, minute, status, and period to `match_live_state` in Supabase. Adaptive interval:
- **FAST** (3 min): When any match is live.
- **SLOW** (15 min): When idle (no live matches).

Data sources:
- **Global live feed**: 1 LiveScore API call, filtered locally to active competitions.
- **Per-competition fixtures**: 1 call per active competition per day (plus yesterday before 06:00 UTC).
- **GoalLine seed**: Seeds from `gl_matches` on boot for finished matches that LiveScore dropped.

Also handles **finished match detection**: marks matches as "finished" after 3 consecutive absences from the live feed, with a 140-minute safety threshold (covers 90' + 30' ET + 15' penalties + 5' buffer).

Active competition IDs are refreshed hourly from the `competitions` table.

### 3.14 The Booth (`booth-detector.ts`, `booth-gen.ts`, `booth-shadow.ts`, `booth-lint.ts`)

Live football commentary system with two AI personas:
- **Sonny** (Strategist, optimist): Reads momentum and upside.
- **Cole** (Skeptic, realist): Reads what the board already priced.

Pipeline per key event (goal, penalty goal, own goal, red card, HT, FT):
1. **Detect** (`booth-detector.ts`): Polls events URL, diffs against seen events, returns new key events.
2. **Generate** (`booth-gen.ts`): Sonnet generates a 2-3 line EN exchange, then translates to vi/th/es. Lead voice determined by whether the event confirms or subverts the thesis.
3. **Lint** (`booth-lint.ts`): Deterministic regex guard — checks for betting directives, edge claims, victory laps, fabricated stats, and overconfident language across en/vi/th/es.
4. **Store** (`booth-shadow.ts`): Writes to `booth_shadow` table (admin-only, NOT public). Records lint results even on failure.

Cron: Every 30 seconds when live pick-matches exist. 90-second debounce per match.

### 3.15 Provider Matcher (`provider-matcher.ts`)

Auto-matches fixtures across odds-api.io and LiveScore API. Populates `provider_mappings` table. Team name normalization handles aliases (Turkey/Turkiye, Czech Republic/Czechia, etc.). Runs on boot + every 6 hours.

### 3.16 Fixture Ingest (`fixture-ingest.ts`)

Populates the unified `fixtures` table from `provider_mappings`. Resolves team IDs from the `teams` table. Runs after provider-matcher. Calls `backfill_fixture_links` RPC to auto-link unlinked picks/watching.

### 3.17 Fixture Link (`fixture-link.ts`)

Auto-links picks and watching entries to unified fixtures at creation time. Fuzzy team name matching by normalized name + kickoff date.

### 3.18 News Pipeline (`news-gen.ts`, `news-gen-templates.ts`, `news-gen-p2.ts`)

Two-tier automated news generation:

**P1 (Deterministic Templates)** — Zero LLM, zero hallucination. Numbers and names interpolate into fixed 4-language template strings.
- **Preview**: Upcoming fixtures within 24h window. Includes recent form (W-D-L from finished matches).
- **Result**: Finished matches within 24h. Score + winner/draw.
- **Standings**: Top 5 of competition table, daily after matches finish.

**P2 (Enriched Pipeline)** — Guardian API + Google News RSS + H2H + player photos, synthesized by Sonnet. Grounding rules: every claim must be cited, doubt reported as-is. Falls back to P1 on any failure.

Fixture scoring system: each fixture is scored by competition tier (0-40), team importance (0-30), matchup (derby/knockout bonus, 0-35), recency (0-10), and pick/watching bonus (+10). Only fixtures scoring >= 45 get articles. P2 enrichment triggers at score >= 60.

Daily caps: preview 20, result 6, standings 3. Quality gate: EN body must be >= 800 chars for auto-publish.

Cron intervals: preview every 45 min, result every 15 min, standings daily at 06:30 UTC.

### 3.19 SEO Lint (`seo-lint.ts`)

Deterministic checks on AI-generated articles before publish:
- Thin content (< 100 words EN, < 40 words non-EN, < 300 chars)
- Banned vocabulary (gambling hype in en/vi/th)
- Template-speak ("in this article we will", "without further ado")
- AI tell phrases ("delve into", "tapestry of")
- Script consistency (CJK/Greek/Cyrillic characters in en/vi/th/es output)
- Data anchors (odds, scores, units must be present in recap/analysis/post-mortem)
- GEO readiness (atomic answer in first 300 chars, analysis markers present)

### 3.20 Event Lookup (`event-lookup.ts`)

Auto-attaches odds-api.io event IDs at pick time. Conservative: only attaches when EXACTLY one event matches (both teams + same UTC date). Ambiguity or failure returns null — the pick publishes with `fixture_id: 0` and settles manually. 5-second timeout.

### 3.21 Revalidation (`revalidate.ts`)

On-demand web cache busting. POSTs to the Next.js site's `/api/revalidate` endpoint after pick lifecycle events. Disabled when `REVALIDATE_SECRET` is unset.

### 3.22 IndexNow (`indexnow.ts`)

Pings Bing/Yandex via the site's `/api/indexnow` endpoint after article publish/settle. Fire-and-forget.

### 3.23 Durable Job Queue (`job-queue.ts`)

Backed by Supabase `job_queue` table. Job types: `watching-news`, `note-translate`, `postmortem`, `postmortem-article`, `noplay-article`, `analysis`.

- Jobs are claimed (status: `running`), executed, then marked `completed` or `failed`.
- Max attempts enforced per job (DB column `max_attempts`).
- On boot: stale jobs stuck in `running` for > 5 min are reset to `pending`.
- Processing: every 60 seconds, picks up to 10 pending jobs.

### 3.24 Job Tracker (`job-tracker.ts`)

In-memory failure tracker. Captures failures from fire-and-forget pipelines (30-minute retention window). The DL monitor drains and alerts on accumulated failures.

### 3.25 Daily Line Monitor (`dl-monitor.ts`)

Health monitor running every 15 minutes. Checks:

1. **Stale live cards**: All matches finished but card still "live" (settlement may have failed).
2. **Missing scores**: Kickoff > 3h ago but status still "scheduled".
3. **Cron health**: GoalLine cron last succeeded > 20 min ago.
4. **Missed card create**: No card for tomorrow by 20:00 UTC.
5. **Missed lock**: Card still "open" past cutoff time.
6. **Missed live transition**: Card "locked" but matches are live.
7. **Inconsistent totals**: Settled card result does not match sum of match goals vs line.
8. **Job failures**: Drains accumulated failures from the job tracker.

Alerts are sent to a Telegram group. Dedup TTL: 2 hours per alert key.

### 3.26 LiveScore Fetch Wrapper (`ls-fetch.ts`)

Wraps `fetch()` for LiveScore API calls with batched usage counting via Supabase RPC (`increment_api_calls`). Flushes every 60 seconds or every 20 calls. Best-effort — counting never blocks or fails the actual fetch.

### 3.27 Finished / Upcoming Fixtures (`finished-fixtures.ts`, `upcoming-fixtures.ts`)

API endpoints that reshape LiveScore data for R0 Triage:
- **Finished**: Historical WC matches (FT/AET/PEN status).
- **Upcoming**: Next N days of WC fixtures (kickoff times only).

### 3.28 Logger (`log.ts`)

Timestamped console logger. The only place `console` is used. Supports failure listeners — `log.warn` and `log.error` notify registered callbacks when messages contain "failed" or "error" (used by `job-tracker.ts`).

---

## 4. Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `CURATOR_BOT_TOKEN` | Telegram bot token. Worker exits if unset. |

### Required for Production

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL. Unset = in-memory mock mode. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. Required when SUPABASE_URL is set. |

### Feature-Gating Variables

| Variable | Description | Features Disabled When Unset |
|----------|-------------|------------------------------|
| `CURATOR_USER_IDS` | Comma-separated Telegram user IDs. | Bot ignores everyone. |
| `ODDS_API_KEY` | odds-api.io API key. | Auto-settlement, event lookup, CLV capture. |
| `ANTHROPIC_API_KEY` | Anthropic API key. | All AI generation (recap, preview, analysis, translation, buzz, postmortem, booth). |
| `CHANNEL_CHAT_ID` | Telegram channel ID for announcements. | Channel announcements skipped. |
| `FB_PAGE_ID` | Facebook Page ID. | Facebook posting disabled. |
| `FB_PAGE_TOKEN` | Facebook Page access token. | Facebook posting disabled. |
| `REVALIDATE_SECRET` | Shared secret for web revalidation + webhooks. | On-demand revalidation and IndexNow disabled. |
| `LIVESCORE_API_KEY` | LiveScore API key. | Live score persistence, provider matcher, standings, finished/upcoming fixtures. |
| `LIVESCORE_API_SECRET` | LiveScore API secret. | Same as above. |
| `SERPER_API_KEY` | Serper (Google Search) API key. | Buzz grounding from real forum snippets (falls back to AI-only). |
| `GUARDIAN_API_KEY` | Guardian Content API key. | P2 enriched news pipeline (falls back to P1 templates). |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_URL` | `https://www.wildlyplay.com` | Base URL for links and revalidation. |
| `WEBHOOK_PORT` / `PORT` | `8080` | HTTP server port. |
| `RECAP_MODEL` | `claude-haiku-4-5-20251001` | Model for recaps and general AI. |
| `ANALYSIS_MODEL` | `claude-haiku-4-5-20251001` | Model for analysis articles. |
| `ANALYSIS_INTERVAL_H` | `12` | Hours between analysis cron runs. |
| `ANALYSIS_CAP` | `1` | Max analysis articles per cron run. |
| `NEWS_AUTOPUBLISH` | `false` | Set to `true` to auto-publish news-gen articles. |

---

## 5. Running the Worker

### Local Development

```bash
cd apps/worker
cp .env.example .env  # fill in your values
npm run dev
```

Minimum `.env` for local smoke testing (mock mode, no external APIs):
```
CURATOR_BOT_TOKEN=your-bot-token
CURATOR_USER_IDS=your-telegram-id
```

Full local development with Supabase + APIs:
```
CURATOR_BOT_TOKEN=...
CURATOR_USER_IDS=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ODDS_API_KEY=...
ANTHROPIC_API_KEY=...
CHANNEL_CHAT_ID=...
```

### Production (Railway)

All environment variables are set in Railway's service settings. Deploy via:
```bash
railway up --detach
```

Or via git push to main (Railway auto-deploys from the configured branch).

Expected startup log lines:
```
INFO  Curator bot started as @CuratorBot (long polling)
INFO  poller started (every 10 min)
INFO  weekly ledger scheduler started (Sundays 13:00 UTC)
INFO  buzz cron: started (interval 180min)
INFO  persist-state cron started (every 10 min)
INFO  webhook server listening on port 8080
INFO  GoalLine cron started (every 15 min)
INFO  dl-monitor started (every 15 min)
INFO  job-queue: started (poll every 60s)
INFO  news-gen: started (preview 45m, result 15m, standings ~06:30 UTC)
```

---

## 6. Scheduled Tasks / Cron Jobs

All cron jobs are `setInterval`-based within the single Node.js process. No external cron scheduler.

| Task | Interval | Description |
|------|----------|-------------|
| Results poller | 10 min | Settle published picks with finished events. |
| CLV capture | 10 min (with poller) | Capture closing odds near kickoff. |
| Persist state | 3 min (live) / 15 min (idle) | Upsert live scores to `match_live_state`. |
| Active competitions refresh | 1 hour | Refresh competition IDs from DB. |
| Buzz cycle | 3 hours | Community sentiment for all active watching. |
| Pre-kickoff buzz | 30 min | Tighter sentiment updates for matches 1-2h away. |
| Auto-expire watching | 30 min | Expire watching entries 2h+ past kickoff. |
| Weekly digest | 1 hour (check) | Sunday 13:00 UTC ledger card. |
| Analysis cron | 12 hours (configurable) | Auto-generate pre-match analysis articles. |
| GoalLine cron | 15 min | Auto-lock + settle Daily Line cards via web API. |
| DL health monitor | 15 min | Check for stale cards, missing scores, cron health. |
| Job queue processor | 60 sec | Process pending durable jobs. |
| Seed tick | 30 min | Gradual Daily Line card seeding via web API. |
| Provider matcher | 6 hours | Cross-match odds-api and LiveScore fixtures. |
| News-gen preview | 45 min | Generate preview articles for upcoming fixtures. |
| News-gen result | 15 min | Generate result articles for finished matches. |
| News-gen standings | Daily ~06:30 UTC | Generate standings updates. |
| Booth shadow | 30 sec | Live commentary gen for active pick-matches. |

---

## 7. Graceful Shutdown

The worker handles `SIGTERM` and `SIGINT`. On shutdown:
1. Clears all interval timers (GoalLine cron, DL monitor, persist state, job queue).
2. Stops the poller, digest, analysis, buzz, and news-gen cron loops.
3. Stops the Telegram bot (grammY `bot.stop()`).
4. Logs "shutdown complete" and exits with code 0.

---

## 8. Error Handling

### Principles

1. **AI failures never break the pipeline.** Every AI call (`callClaude`) returns `null` on failure. Callers check for null and skip the AI step.
2. **Announcement failures never break state.** The pick/watching/settlement is already persisted before any announcement runs.
3. **Channel independence.** Telegram and Facebook are separate try/catch blocks. A Facebook failure never prevents a Telegram announcement.
4. **Dedup guards.** `channel_log` table prevents duplicate announcements. The `hasChannelLog` check runs before every announce.
5. **Log warnings propagate to alerts.** `log.warn` calls containing "failed" or "error" are piped to `job-tracker.ts`, which the DL monitor drains every 15 minutes.
6. **Durable retry for AI jobs.** Post-mortem, note translation, and watching-news are enqueued in the `job_queue` table. Stale jobs (stuck > 5 min) are auto-recovered on boot.

### SEO Content Guards

All AI-generated articles pass through deterministic lint gates before publication:

- **`seo-lint.ts`**: Thin content, banned vocabulary, template-speak, AI tells, script consistency, data anchors, GEO readiness.
- **`booth-lint.ts`**: No-tip, no-edge, no-victory-lap, no-fabrication, calibration guards for live commentary.
- **Closing line fabrication** (`recap.ts`): Blocks recaps that reference closing odds when `odds_close` is null.
- **Polarity inversion** (`news.ts`): Blocks analysis articles where a negative consensus edge is presented as a positive.
- **Stray script sanitization** (`store.ts`): Strips CJK/Greek/Cyrillic characters from AI translations at insert time.

---

## 9. Testing

```bash
cd apps/worker
npm test          # vitest run
```

Test files follow the `*.test.ts` convention alongside their source files. Tests exercise parsers, settlement logic, prompt builders, post builders, lint rules, and scoring functions. The `MemoryStore` is used in tests — no Supabase required.
