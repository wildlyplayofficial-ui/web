# WildlyPlay Debugging Playbook

Recurring bug families mined from git history + codebase. Read this BEFORE debugging — most "new" bugs are re-runs of families 1-9 below.

**Note on commit SHAs:** the SHAs cited below come from a prior git-history research pass; they could not be re-verified in this environment (git access unavailable). Every fix pattern was instead verified directly against the current code, with exact file paths and line numbers. Trust the file paths first.

## Systematic 4-phase debugging

Each phase has an exit criterion. Do not skip ahead.

1. **Reproduce** — exit: you can trigger the bug on demand (URL, curl, failing test case). No repro = no fix.
2. **Isolate** — exit: bug narrowed to one layer (external feed vs DB vs cache vs render vs translation vs routing).
3. **Root-cause** — exit: you can explain *why* it happens, not just *where*. Check this playbook first — it is probably a known family.
4. **Fix** — exit: fix follows the established pattern below, plus a regression test (worker code: vitest colocated next to source, e.g. `booth-detector.test.ts`).

**Verify live after deploy — deployed ≠ working.** Curl the production URL, query the DB, and check all 4 languages before reporting done. Multiple past incidents were "fixed" only in code while production stayed broken.

---

## 1. Author firewall leaks (Scout vs Curator byline/color mixed)

- **Symptom:** Scout (fictional AI persona) picks render with Curator byline or brand color; Curator's public track record / OG card includes Scout results (or vice versa). This is a credibility + AI-disclosure violation, not cosmetic.
- **Root cause:** `author` is a per-row field (`"curator" | "scout"`, default `curator`). Any query or component that forgets to filter or branch on it silently blends the two ledgers/identities — the default masks the omission.
- **Fix pattern** (commits 932c2f0, adf3893):
  - `apps/web/components/pick-card.tsx` — `const isScout = pick.author === "scout"` branches every color class (`text-scout` / `bg-scout-dim` vs `text-brand` / `bg-brand-dim`) and every label/disclosure string (`dict.pick.scoutLabel`, `dict.pick.disclosureScout`).
  - `apps/web/lib/data.ts` — `getTrackRecordForAuthorImpl` (comment: "Bug B: Scout OG card must not show Curator record") for author-scoped records.
  - `apps/worker/src/store.ts` — `listByStatus(statuses, author?)` with doc comment: "callers computing a public record/board/recap MUST pass the relevant author to avoid blending ledgers" (§12.A credibility firewall).
  - API contract: `apps/worker/CHANGELOG_author_firewall.md` — `author_type` (`real_human` / `fictional_ai`) is **server-derived only**; `author` is immutable after publish (DB trigger); there is deliberately NO blended "all authors" record endpoint.
- **How to check you're not reintroducing it:** any new surface that shows a pick, record, byline, or OG card must (a) branch UI on `pick.author`, (b) pass `author` into record/board/recap queries. Grep the new file for `author` — if it's absent, it leaks. Verify live with one Scout pick and one Curator pick side by side.

## 2. i18n missing translations (EN changed, VI/TH/ES forgotten)

- **Symptom:** English UI copy updated, but VI/TH/ES pages still show the old text — or a new feature renders English strings inside a Vietnamese/Thai/Spanish page.
- **Root cause:** all shared UI strings live in one file with 4 parallel dictionaries. Editing only the `en` block compiles fine when the key already exists in the other dictionaries — TypeScript only catches **new** keys (missing from the `Dict` interface), not stale values.
- **Fix pattern:**
  - `apps/web/lib/i18n.ts` — single `Dict` interface + `en` / `vi` / `th` / `es` dictionary objects in the same file. When adding a string, add the key to the `Dict` interface first: the compiler then forces all 4 dictionaries.
  - Long-form content translations are per-lang DB rows, not dict keys: `pick_content` upserted on `(pick_id, lang)` by `apps/worker/src/translate.ts` (test: `translate.test.ts` "generates and upserts the vi/th/es rows"); pages fall back to EN when a lang row is missing (`apps/web/lib/data.ts` `getPost` / `getThesisTranslations`).
- **How to check you're not reintroducing it:** every PR that touches an `en:` value in `i18n.ts` must touch the same key in `vi:`, `th:`, `es:`. Quick audit: search the key name in the file — it must appear 5 times (interface + 4 dicts). Then load the page on `/vi/...`, `/th/...`, `/es/...` live.

## 3. Stale live data (match stuck "live" forever)

- **Symptom:** a finished match keeps showing LIVE at minute 90 on the homepage/ticker/matches page, hours or days after full time.
- **Root cause:** the LiveScore feed sometimes never flips a match to `FT` — it keeps returning a live-ish status string. Code that trusts the feed status alone shows "live" forever. Same failure exists in DB-persisted state (`match_live_state` rows stuck at `status='live'`).
- **Fix pattern** (commit 3b50630): a time-based guard that overrides any status string.
  - `apps/web/lib/match-constants.ts` — `MAX_LIVE_MS = 3.5h`: "Beyond this, a match is treated as finished even if the data feed is stuck reporting it live." 3.5h clears ET + penalties without misfiring on a genuine live match.
  - Applied at **every** live-status derivation site in `apps/web/lib/matches.ts`: `deriveStatus()` (both branches), the live-feed merge block, the live-not-in-fixtures block, the Supabase fallback, and `fetchTodaysMatchesFromDb`.
  - Client fallback uses the **same shared constant**: `apps/web/app/[lang]/matches/match-status.tsx` — "so both agree on the same threshold — no disagreement window."
- **How to check you're not reintroducing it:** any new code path that outputs `status: "live"` (new feed, new fallback, new component) must apply the `MAX_LIVE_MS` guard imported from `match-constants.ts`. Never inline a different threshold, never trust `status` strings from the feed alone.

## 4. `unstable_cache` defined in wrong scope

- **Symptom:** a data fetch runs on every request — cache never hits, LiveScore API quota burns down, pages get slow; or `revalidateTag()` appears to do nothing.
- **Root cause:** `unstable_cache(...)` was created inside a request/component scope. Each render constructed a *new* cache wrapper, so entries were never shared or found again.
- **Fix pattern** (commits a32e464, 6c3ca94 — hoist to module scope). Repo-wide convention: private `fooImpl()` async function + module-level cached export:
  ```ts
  export const getTodaysMatches = unstable_cache(
    fetchTodaysMatchesImpl,
    ["todays-matches"],
    { revalidate: 300, tags: ["matches"] },
  );
  ```
  See `apps/web/lib/matches.ts:347`, ~15 examples in `apps/web/lib/data.ts`, plus `standings.ts`, `standings-extra.ts`, `news.ts`, `booth-data.ts`. Tag names (`"matches"`, `"picks"`, `"posts"`, `"watching"`) line up with `apps/web/app/api/revalidate/route.ts`.
- **How to check you're not reintroducing it:** grep the diff — every `unstable_cache(` must sit at module top level in the `export const X = unstable_cache(XImpl, ...)` shape. If it appears inside a function/component body, it's this bug. Dynamic arguments flow through the wrapped function's parameters (they become part of the cache key), never through closure capture.

## 5. Rotating external event IDs breaking dedupe

- **Symptom:** the same goal/red card is announced twice (Booth commentary lines, Telegram posts) on consecutive polls. Dedupe `seen` sets keep growing but never match anything.
- **Root cause:** LiveScore event `id`s are NOT stable across polls — the API returns fresh ids for the same events every fetch. Keying dedupe state by API id therefore never dedupes.
- **Fix pattern** (commit d6440a0 — key by scoreline instead): derive a stable, content-based key.
  - `apps/worker/src/booth-detector.ts:93-98`: "Livescore event ids are NOT stable across polls (they rotate), so we derive our own stable key: goals by resulting score, others by player" — goals → `goal:1-0`, other events → `red_card:<player>`.
  - Regression test: `apps/worker/src/booth-detector.test.ts` — "bug 3/7: livescore ids rotate between polls": same events with rotated api ids are not re-detected once seen.
- **How to check you're not reintroducing it:** never persist, compare, or dedupe on a raw LiveScore `id` / `fixture event id`. New event-driven features must key off content-derived identity (resulting scoreline, team pair, player+event-type). If an external id must be stored, assume it is different on the next poll and write a rotated-id test like the one above.

## 6. Timezone boundary misses in date-window queries

- **Symptom:** matches near UTC midnight vanish from "today's matches" / the daily board — a match that kicked off 23:00 UTC yesterday and is still live isn't listed; early-morning matches missing at the start of the day.
- **Root cause:** querying exactly one UTC calendar day (`date=today`) misses matches whose lifetime straddles the boundary; "today" for a user in UTC+7 is not UTC today; closed ranges (`lte` on a `23:59:59` string) drop edge rows.
- **Fix pattern** (commit a32e464 — window padding, not exact-day queries):
  - `apps/web/lib/matches.ts:144-157` — fetch fixtures for **today AND yesterday** per competition, then filter in code with a rolling window: `effectiveStart = min(startOfTodayUTC, now − 6h)` (lines 331-339); DB reads bounded by `now + WINDOW_MS` (6h) on the upper side.
  - Midnight-crossover kickoff derivation: `matches.ts:259-266` — if scheduled time < feed-added time, kickoff is the **next** day (`needsNextDay`).
  - Half-open day ranges: `utcDayRange()` in `apps/web/lib/data.ts:15-21` — `gte start`, `lt end`, where `end = start + 1 day`. Same shape in `getTodaysNoPlaysImpl` (`dayStart` / `nextDay`).
- **How to check you're not reintroducing it:** any new date-window query must (a) pad the fetch by ±1 day around the boundary and filter in code, (b) use half-open `[start, end)` ranges, (c) compute everything in UTC (`setUTCHours`, `Date.UTC`) — never local time. Manually test with a fixture kicking off 23:30 UTC.

## 7. `/en` canonical duplicate pages

- **Symptom:** Google Search Console flags duplicate pages: `/en/foo` and `/foo` both reachable with identical content; canonical confusion splits ranking signal across two URLs per EN page.
- **Root cause:** English is the prefix-less canonical — the proxy rewrites bare paths to `/en/...` **internally**. But `/en/...` also stayed *directly* reachable from outside, so every EN page existed at two public URLs.
- **Fix pattern** (commit c86168c): 301 the prefixed form away.
  - `apps/web/proxy.ts:30-37` — "`/en` prefix is redundant... 301 strip it so Google sees one": any request to `/en` or `/en/...` redirects to the stripped path; bare paths are then rewritten internally to `/en/...` (lines 74-80).
  - Canonical + hreflang generation lives in one helper: `buildAlternates()` in `apps/web/lib/i18n.ts:26-43` — EN alternate and `x-default` carry no prefix; VI/TH/ES carry theirs. Internal links go through `withLang()` (returns unprefixed href for EN).
  - Related gotcha from the sitemap incident (memory, 9/7): non-www → www is a 308 at the platform layer — always test against the exact production host `https://www.wildlyplay.com`.
- **How to check you're not reintroducing it:** after any proxy/routing change, `curl -sI https://www.wildlyplay.com/en/` must return 301 → `/`. New pages must build metadata via `buildAlternates()` — never hand-write a canonical containing `/en/`. Check the proxy `matcher` still covers the new route.

## 8. Concurrent insert race (unique-constraint loser crashes)

- **Symptom:** sporadic 500s / null ids when two requests create the same resource at the same moment — e.g. two members of one Telegram group opening the Daily Line TMA simultaneously, both trying to create the `gl_groups` row.
- **Root cause:** "select to check, then insert if missing" is not atomic. Both requests pass the check; the first insert wins the unique constraint (`tg_group_id`), the loser's insert returns no row, and the code treated that as fatal instead of recovering.
- **Fix pattern** (commit ff43602 — re-select on lost race):
  - `apps/web/app/api/goalline/tma-auth/route.ts:213-229` — attempt the insert; if no row comes back: "Lost a concurrent-create race (unique tg_group_id) — re-select" → select the winner's row by the unique key and continue with its id.
  - Where the DB constraint allows, prefer the atomic form instead: `SupabaseStore.upsertGroup` in `apps/worker/src/store.ts:458-469` — `.upsert({...}, { onConflict: 'tg_group_id' })`; same pattern for translations: `upsertPickContent` with `onConflict: 'pick_id,lang'`.
- **How to check you're not reintroducing it:** every "create if not exists" path needs either (a) a DB upsert with `onConflict` on the real unique key, or (b) insert → on failure, re-select and proceed. Never rely on a prior existence check alone; never treat a unique violation as a fatal error.

## 9. Banned vocabulary appearing across languages

- **Symptom:** AI-generated articles/commentary ship with gambling-hype or guaranteed-outcome language ("lock", "banker", "sure win", VI "kèo thơm", TH "ได้ชัวร์") — or stray out-of-script glyphs inside TH/VI text (e.g. "แพรากουย": Thai with two Greek letters). Compliance (YMYL) + brand-voice risk, in all 4 languages.
- **Root cause:** prompt-level bans are probabilistic — `recap.ts` / `booth-gen.ts` prompts list "BANNED VOCABULARY", yet the model still emits banned terms occasionally, and early ban lists were English-only while output is 4 languages. Wordlists also can't catch stray-script glitches that read fluently.
- **Fix pattern** (commits 062cf97, d66f96f — deterministic code gate, not prompt tweaks):
  - `apps/worker/src/seo-lint.ts` — regex rule table with per-language banned lists (EN + VI + TH), template-speak and AI-tell detection, and `STRAY_SCRIPT_RE` rejecting any CJK/Greek/Cyrillic codepoint (none of en/vi/th/es uses those scripts — Nick 4/7 item ②).
  - Enforced at the single write path: `SupabaseStore.insertPost` (`apps/worker/src/store.ts:361`) **throws** `seo-lint BLOCK ...` — a failing article cannot reach the `posts` table. Mirrors the `booth-lint.ts` pattern for commentary.
- **How to check you're not reintroducing it:** new content-generation pipelines must publish through `insertPost` (never a raw `.from('posts').insert` elsewhere). New banned terms go into the `rules` table in `seo-lint.ts` **for every language**, not only into the prompt. Per CLAUDE.md §16: enforcement is deterministic code, never the LLM.

---

## Cross-cutting habits

- **External feed data lies.** Status strings (family 3), event ids (family 5), team names (`TEAM_ALIASES` in `matches.ts`, `TEAM_CANONICAL` / `cleanTeamName` in `data.ts`) — normalize and guard in our code; never trust the feed's identity or state fields raw.
- **Four languages, always.** Every user-facing change is verified on `/`, `/vi/`, `/th/`, `/es/` (families 2, 7, 9).
- **Two authors, always.** Every pick-related surface handles both `curator` and `scout` (family 1).
- **Regression test per fix.** Every worker-side fix above has a colocated vitest file (`apps/worker/src/*.test.ts`) that encodes the bug — keep that bar for new fixes.
- **Deterministic code > prompts** for anything that must never happen (families 5, 9).
