# WildlyPlay — Repo Operating Manual

Durable operating knowledge for contributors and AI agents. Every claim below is
grounded in code — file paths are cited. When this manual and the code disagree,
**the code wins**; fix the manual.

Related docs: `docs/DECISIONS.md` (product decisions log), `DOCS.md` (feature
inventory), `docs/production-runbook.md` (infra/health checks — see caveat in §5),
`docs/goalline-daily-spec.md` (GoalLine Daily game spec).

---

## 1. Architecture map

Monorepo, npm workspaces-style layout (plain `file:` deps, no turborepo):

| Path | What it is | Runs where |
|---|---|---|
| `apps/web/` | Next.js 16 App Router site (wildlyplay.com): Board, Play detail, Archive, Stats, News/Analysis, Guides, Competitions, GoalLine Daily (`/daily-line`), TMA, admin | Vercel (`sin1`, `apps/web/vercel.json`), prod deploy = push to `main` |
| `apps/worker/` | Pipeline worker: Telegram Curator bot (grammY, long polling), results poller, settlement, AI article generation (preview/analysis/recap), announcements (TG channel + Facebook), buzz cron, HTTP API mirroring bot commands (`src/api-routes.ts`) | Railway, auto-deploy from `main` (root `package.json` build/start scripts point at `apps/worker`) |
| `apps/goalline/` | Original standalone GoalLine Daily Next.js app (port 3001). The live version was merged into web under `apps/web/app/[lang]/goalline` + `apps/web/lib/goalline/`; treat the standalone app as legacy/prototype |
| `packages/settlement/` | Pure deterministic Asian-handicap settlement engine (`@wildlyplay/settlement`), used by worker. No LLM in settlement — ever |
| `packages/goalline-settlement/` | GoalLine Daily settlement (`@wildlyplay/goalline-settlement`), used by web |
| `supabase/` | `schema.sql` (full Postgres schema + RLS + immutability triggers) and `migrations/*.sql`. Migrations are applied **manually** via Supabase Dashboard SQL Editor (see `apps/worker/CHANGELOG_author_firewall.md`) |
| `scripts/` | One-off/cron ops scripts (backfills, transparency report, citation monitor) |

**How they connect:** Curator submits a pick via TG bot or worker HTTP API →
worker writes to Supabase (service role) → worker POSTs `{tags}` to web
`/api/revalidate` with `x-revalidate-secret` for instant cache bust
(`apps/worker/src/revalidate.ts`) → web reads Supabase with the anon key
(`apps/web/lib/supabase.ts`) under RLS. Web falls back to typed mock data when
`NEXT_PUBLIC_SUPABASE_*` env vars are missing (`apps/web/lib/data.ts` header).

Data pipeline (README.md): pick → odds snapshot (immutable after publish, DB
trigger) → AI articles → publish web/TG/FB → poll final score → deterministic
settlement → recap → archive/track record.

---

## 2. i18n system

4 languages: **EN, VI, TH, ES**. Source of truth: `apps/web/lib/i18n.ts`.

- **EN is the prefix-less canonical.** `/vi/...`, `/th/...`, `/es/...` are path
  prefixes; bare paths are rewritten internally to `/en/...` by
  `apps/web/proxy.ts` (Next.js 16 Proxy). `withLang(href, lang)` builds internal
  links — returns the href unchanged for EN.
- **`/en/...` is 301-stripped** by `proxy.ts` so Google never sees a canonical
  duplicate. Legacy `?lang=xx` query params are also 301'd to path-based URLs.
- **Dict structure:** one `Dict` interface in `lib/i18n.ts` with per-page/section
  namespaces (`nav`, `board`, `home`, `archive`, `stats`, `news`, `analysis`,
  `guides`, `transparency`, `calculators`, `pick`, `play`, ...). Dictionaries for
  all 4 langs live in the same file; `getDict(lang)` returns the whole dict.
- **RULE — one namespace per page/section, never share.** `/analysis` borrowing
  `dict.news` produced two pages with duplicate headers (fixed in bb7bf38; note
  `news` and `analysis` are now separate namespaces in `lib/i18n.ts`). New page →
  new namespace, with all 4 languages filled in the same commit.
- **RULE — never hardcode a locale.** Use `locales[lang]` from
  `apps/web/lib/format.ts` (`en-GB`, `vi-VN`, `th-TH-u-ca-gregory`, `es-419` —
  Gregorian calendar forced for TH). Exception already in code: `formatKickoff`
  intentionally uses `en-GB` for the *time* portion only, to get a stable 24h
  `HH:MM UTC` string.
- **hreflang/canonical:** `buildAlternates(path, lang)` in `lib/i18n.ts` emits
  self-canonical + `en/vi/th/es/x-default` alternates. Every new route's
  `generateMetadata` must use it.
- The banned legacy name "Newsroom" must not reappear in dicts, breadcrumbs, or
  og titles (see review skill, §6).

---

## 3. Date/time convention

**User-facing dates/times render client-side in the browser's timezone.**
Server-side `Intl` rendering of a user-facing wall-clock time is a bug (it
renders in the server's TZ, i.e. UTC).

Canonical patterns — reuse these, don't invent new ones:

- `apps/web/components/local-kickoff-time.tsx` — `"use client"`; SSR fallback
  prints UTC (`HH:MM UTC`), `useEffect` swaps to browser-local after hydration.
  Renders a `<span>`.
- `apps/web/components/local-date.tsx` — same pattern for dates; takes
  `locale` (pass `locales[lang]`), SSR fallback formats the same fields with
  `timeZone: "UTC"`, and wraps output in `<time dateTime={iso}>`.

OK on the server: relative time ("3h ago", TZ-agnostic) and deliberately-UTC
strings labeled as UTC (`formatKickoff`/`formatBoardDate` in `lib/format.ts`
pass explicit `timeZone: "UTC"`).

---

## 4. Data layer (Supabase)

Clients: `apps/web/lib/supabase.ts` (anon, RLS-scoped reads; returns `null`
when unconfigured → callers fall back to mocks), worker uses the service role
key (`apps/worker/src/index.ts`, Railway env).

Conventions (all visible in `apps/web/lib/news.ts` and `apps/web/lib/data.ts`):

- **RLS double-lock.** RLS already restricts public reads
  (`supabase/schema.sql` ~L204: `picks_public_read using (status <> 'draft')`,
  `posts_public_read using (status = 'published')`), but every public read in
  app code ALSO filters `.eq("status", "published")`. Never rely on RLS alone.
  Note the picks RLS policy is `<> 'draft'`, which is looser than the app
  filter — another reason the app-side filter is mandatory.
- **`.single()` + PGRST116.** `.single()` returns error code `PGRST116` when no
  row matches. Handle it as "not found → return null", throw on anything else
  (`lib/news.ts` `getNewsItemBySlugImpl`).
- **`unstable_cache` usage.** Wrap the impl function at **module scope** (never
  construct a cache inside a request handler), with `revalidate` (typically 300)
  + `tags` (e.g. `["news"]`, `["picks"]`). Tags are what the worker busts via
  `/api/revalidate`. Gotcha: `unstable_cache` includes fn args in the cache key
  (`lib/standings-extra.ts` L283).
- **Canonical enum lists** are exported once from web `lib` and are the single
  source of truth — e.g. `NEWS_TYPES` in `apps/web/lib/news.ts`
  ("worker/generator must use these values"), `LANGS` in `lib/i18n.ts`,
  `marketLabels` keys in `lib/format.ts`. Caveat: the worker cannot import from
  `apps/web` (separate package), so this is a **by-convention contract** —
  worker literals like `type: 'preview'` (`apps/worker/src/preview.ts`) must
  stay within the canonical list. Changing an enum = change it in `lib` first,
  then align worker literals.
- **`updated_at` never auto-updates.** No trigger exists for it in
  `supabase/schema.sql`; the worker sets it manually on every UPDATE/upsert
  (`apps/worker/src/persist-state.ts`, `fixture-ingest.ts`,
  `provider-matcher.ts`: `updated_at: new Date().toISOString()`).
- TS interfaces must match the real DB: nullable columns are `string | null`
  (see `NewsItem` in `lib/news.ts`).
- Picks are **immutable after publish** (DB trigger); to change one, `/void` +
  new `/pick`. All writes go through the server/service role — there are no
  public insert policies except forum/profile self-writes (`schema.sql`).

---

## 5. Deploy & verify

**Web (Vercel):**
- Prod deploy = `git push` to `main` → Vercel auto-deploy. **Do NOT deploy prod
  via Vercel CLI** (standing process rule).
- `apps/web/vercel.json`: region `sin1`, one cron (`/api/goalline/cron` daily
  18:00 UTC).

**Worker (Railway):**
- Auto-deploys from `main`; the root `package.json` `build`/`start` scripts
  (`cd apps/worker && npm ci` / `npm start`) are what Railway executes.
- One-off tasks (backfills, manual sends, debug) run with prod env injected:
  `railway run --service wildlyplay-worker <cmd>` — env vars (SUPABASE_*,
  CURATOR_BOT_TOKEN, FB_*, SITE_URL, REVALIDATE_SECRET...) come from Railway;
  local `.env.local` is a placeholder, don't read it.
- Health: `railway logs` — expect "Curator bot started", "poller started"
  (`docs/production-runbook.md`).

**Process rules (non-negotiable):**
1. Announce every WildlyPlay deploy in the WP Telegram group (-5152855985)
   **before** deploying.
2. After deploy, **verify live with curl** — real H1, og tags, redirect chains.
   "Deployed" ≠ "working". Example: `curl -s https://www.wildlyplay.com | grep -o '<h1[^>]*>.*</h1>'`.
3. Verify all 4 languages when text changed.

**Build gotchas:**
- `tsc --noEmit` (worker: `npm run build` runs tsc; web: run in `apps/web`) and
  `next build` must pass before calling anything "done".
- **Turbopack fails on symlinked `node_modules`.** In git worktrees, don't
  symlink `node_modules` from the main checkout — use APFS clone copies:
  `cp -Rc /path/main/apps/web/node_modules apps/web/node_modules`. (Process
  knowledge; not documented elsewhere in-repo.)
- `apps/web/AGENTS.md`: this is Next.js 16 — read
  `node_modules/next/dist/docs/` before assuming App Router APIs from training
  data.

> **Caveat:** `docs/production-runbook.md` (R10) still says web deploy =
> `vercel --prod` and worker = `railway up --detach`. That is **outdated** —
> current rule is git push to `main` only for both. Trust this section.

---

## 6. Review process

Full checklist lives in the skill `~/.claude/skills/wp-review-standards/SKILL.md`
("chuẩn Jane") — read it before any WildlyPlay review; don't re-derive it. Core:

- **2-stage review, never mixed:** Stage 1 = spec compliance (exactly what
  Nick/Peter agreed, no scope creep, empty/error states render); Stage 2 = code
  quality (timezone, i18n, data layer, SEO/routing, author firewall — the
  sections above mirror its checklist).
- **Review before push to `main`.** Sole exception: Peter explicitly says
  "self-review, self-push" — then note it in the commit/group so Jane can
  double-check later.
- **Branch/worktree per feature.** Never code on a main branch that has other
  work in flight; merge only after verification.
- `tsc --noEmit` + `next build` pass + live curl verification before reporting
  "done".
- Output format: `✅ Đạt` / `⚠️ Fix N` (must fix) / `Minor` / `📌 Process note`;
  every Fix must point to an existing in-repo pattern to reuse.

---

## 7. Author firewall (Curator vs Scout)

Two authors, two ledgers, two colors — **never mixed on any surface** (pick
cards, article cards, og/share images, /about, /stats, track record):

- **Curator** = real human, brand **green** (`--t-brand: #059652` light /
  `#00e676` dark, `apps/web/app/globals.css`), human tone, zero AI motif.
- **Scout** = disclosed fictional AI persona, **teal** (`--t-scout: #3f716e`
  light / `#5f9c99` dark, `globals.css`).
- Type: `author?: "curator" | "scout"` on picks/posts/watching
  (`apps/web/lib/types.ts` §12 comment); legacy rows default to `"curator"`.
  `author_type` (`real_human`/`fictional_ai`) is **server-derived only** and
  immutable after publish (DB trigger) — see
  `apps/worker/CHANGELOG_author_firewall.md`.
- UI switches on author everywhere: `components/pick-card.tsx` (`isScout` →
  `text-scout`/`bg-scout-dim` vs `text-brand`/`bg-brand-dim`, and
  `dict.pick.scoutLabel` vs `dict.pick.curator`).
- **No blended totals.** W-L-P, units, ROI, CLV are always per-author
  (`lib/data.ts` `getTrackRecordForAuthor`; worker `/api/record` is scoped to
  one author, no "all authors" total exists).

---

## 8. Routing gotchas

- **non-www → www is a 308** at the Vercel platform level (domain config, not
  in repo code). Any curl verification or sitemap work against
  `wildlyplay.com` must expect the 308 hop; canonical host is
  `https://www.wildlyplay.com` (`BASE` in `lib/i18n.ts`).
- **`/en` must never produce canonical duplicates** — `proxy.ts` 301-strips
  `/en` and `/en/...`; the internal rewrite to `/en/...` is invisible to users.
  Don't add links or sitemap entries with an `/en` prefix.
- **Redirect patterns: `:slug` vs `:path*`/`:rest*`.** A `*` matcher swallows
  sub-paths (burned once, 47c8c5b) — when redirecting a single segment use
  `:slug`; when migrating a whole tree use `:path*` deliberately and test child
  URLs. Live examples of both in `apps/web/next.config.ts`: `/goalline` →
  `/daily-line` (tree, 308 via `permanent: true`), `/standings` →
  `/competitions` (301 via `statusCode: 301`), and the narrow
  `/news/news-:slug` → `/analysis/news-:slug` that intentionally leaves the
  `/news` landing page and new slugs alone.
- Every redirect set must cover **both** the bare path and the
  `/:lang(en|vi|th|es)` prefixed variants (see any block in `next.config.ts`).
- `/daily-line` is a **rewrite** onto `/goalline` route code
  (`next.config.ts` rewrites) — the code directory stays `app/[lang]/goalline`.
- `proxy.ts` `config.matcher` excludes `_next`, `api`, sitemaps, manifest,
  icons, sw.js — new static top-level files may need adding to that regex or
  they'll get lang-rewritten.
- URL renames: 301 + update internal links, sitemap (`app/sitemap.ts`),
  breadcrumb JSON-LD (`components/breadcrumb-jsonld.tsx`) together.

---

## 9. Quick reference

- Live site: https://www.wildlyplay.com · Supabase project + infra table:
  `docs/production-runbook.md`
- Worker TG channel chat_id `-1003912180135` (CURATOR_BOT); FB Page
  `1205046446014797`; WP ops group `-5152855985`
- Settlement display rule (decision #2, `docs/DECISIONS.md`): half-win badges
  as WON, half-loss as LOST; raw outcome + real units P/L always shown
  (`badgeFor`/`formatUnits` in `lib/format.ts`)
- Zero-pick days are normal — Board must render empty state gracefully
  (decision #11; `getTodaysPicks` in `lib/data.ts`)
- Root `DOCS.md` §Website still says language is `?lang=xx` — outdated;
  path-prefix routing (§2) is current.
