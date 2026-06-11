# WildlyPlay

Curator-led football picks, AI-operated media. A human (The Curator) picks the matches
and the angles — the system does everything else: writes, publishes, settles, recaps,
and archives every pick publicly, forever.

> Every pick, public forever. We post our losses too.

## Architecture

| Component | Tech | Where |
|---|---|---|
| Web (Daily Board, Play Archive, Newsroom, Forum) | Next.js App Router, ISR | Vercel |
| Database, auth, realtime | Supabase (Postgres + RLS) | Supabase cloud |
| Worker (results polling, settlement, content pipeline) | TypeScript + Claude Agent SDK | Railway |
| Curator input + ops alerts | Telegram bot | Railway (same worker) |
| Analytics | Umami | self-host |

### Pipeline (the 90/10 rule)

The ONLY human input is at the front: The Curator submits match + market + line +
odds + a 1-2 line thesis via the Telegram bot. After that, fully automated:

```
Curator submits pick (TG bot)
  → pick row created + odds snapshot (immutable after publish)
  → AI writes analysis (EN + VI)
  → publish: web (ISR revalidate) + Telegram + X
  → worker polls API-Football for final score
  → deterministic settlement engine (no LLM)
  → morning recap generated + published (recaps are the SEO product)
  → archive + track record update
```

## Settlement rules (decided 11/6/2026)

- Odds are snapshotted **at publish time** — never closing odds.
- Public badge: **half-win counts as WON, half-loss counts as LOST**, push stays PUSH.
- Real Asian-handicap math (incl. quarter lines) is kept in `raw_outcome` and
  `units_pl` and shown next to the W-L record for full transparency.
- Settlement is pure deterministic TypeScript: `packages/settlement` (31 tests).

## Repo layout

```
supabase/schema.sql        # full Postgres schema, RLS, immutability triggers
packages/settlement/       # pure settlement engine + vitest suite
apps/web/                  # Next.js site (TODO)
apps/worker/               # pipeline worker + Telegram bot (TODO)
docs/                      # product decisions
```

## Product decisions log

See `docs/DECISIONS.md`. Key calls: persona "The Curator @ WildlyPlay" (human picks,
AI operates, 100% disclosed), track record starts at 0, forum ships behind a feature
flag (enable ~200 daily visitors), EN+VI first (`/th` phase 2, `/es` phase 3),
donations crypto-only (USDT TRC-20), public launch mid-August 2026 (PL season start).
