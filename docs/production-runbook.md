*Last updated: 2026-07-21*

# WildlyPlay Production Runbook (R10)

## Infrastructure

| Component | Platform | URL | Deploy |
|-----------|----------|-----|--------|
| Web (Next.js) | Vercel | wildlyplay.com | `git push` (auto-deploy) or `vercel --prod` from apps/web |
| Worker (Bot+Cron) | Railway | wildlyplay-worker-production.up.railway.app | `railway up --detach` from apps/worker |
| Database | Supabase | rtsyrktpodspdobelyqs.supabase.co | Dashboard |
| DNS/CDN | Vercel | Automatic | Vercel dashboard |
| Code | GitHub | github.com/namnextdigital/wildlyplay-code (private) | git push |

## Credentials

| Service | Location | Notes |
|---------|----------|-------|
| Supabase | Railway env vars | SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY |
| Livescore API | Railway env vars | LIVESCORE_API_KEY + LIVESCORE_API_SECRET |
| Odds API | Railway env vars | ODDS_API_KEY |
| Facebook | Railway env vars | FB_PAGE_ID + FB_PAGE_TOKEN |
| Anthropic | Railway env vars | ANTHROPIC_API_KEY |
| Revalidate | Railway + Vercel env vars | REVALIDATE_SECRET |
| Telegram Bot | Railway env vars | CURATOR_BOT_TOKEN |
| Bot Allowlist | Railway env vars | CURATOR_USER_IDS (comma-separated Telegram user IDs) |
| TG Channel | Railway env vars | CHANNEL_CHAT_ID |
| Site URL | Railway env vars | SITE_URL (default: https://www.wildlyplay.com) |
| AI Models | Railway env vars | RECAP_MODEL (recap/buzz, Haiku) + ANALYSIS_MODEL (analysis; Sonnet-tier intended, currently Haiku fallback per news.ts until key upgraded) |
| Webhook Port | Railway env vars | WEBHOOK_PORT or PORT (default: 8080) |

## Health Checks

### Worker (check first — most critical)
```bash
# Railway logs
railway logs

# Expected boot messages (in order):
#   "provider-matcher: boot + every 6h"
#   "persist-state cron started (every 10 min)"
#   "seed-tick: cron started (every 30 min)"
#   "news-gen: disabled ..." or cron started
#   "job-queue: started (poll every 60s)"
#   "Curator bot started as @<username> (long polling)"
#   "webhook server listening on port 8080"
#   "GoalLine cron started (every 15 min)"
#   "dl-monitor started (every 15 min)"
# Red flags: "ReferenceError", "crash", no logs after deploy
```

### Web
```bash
# Homepage loads
curl -s -o /dev/null -w "%{http_code}" https://www.wildlyplay.com

# API health
curl -s https://www.wildlyplay.com/api/matches | head -100
```

### Live Score Sync
```bash
# Check match_live_state freshness
# If updated_at > 5 min old during live matches → persist-state stuck
# (persist-state runs every 3 min when live matches detected, 15 min when idle)
```

## Common Issues & Fixes

### 1. Bot not responding
**Symptom:** Telegram commands ignored
**Check:** `railway logs | grep "Curator bot started"`
**Fix:** Worker crashed → `railway up --detach` to redeploy
**Also check:** CURATOR_USER_IDS env var — if empty, the bot ignores all messages

### 2. Live scores stale / match stuck as "live"
**Symptom:** Match shows old score or "LIVE" after FT
**Check:** DB match_live_state status + updated_at
**Fixes:**
- Persist-state cron not running → redeploy worker
- Match dropped from livescore feed → auto-FT kicks in after 3 consecutive absences AND 140 min past kickoff (knockout-safe: covers 90' + 30' ET + 15' penalties + 5' buffer)
- At 3-min fast interval: auto-FT takes ~9 min of absence; at 15-min idle interval: ~45 min
- Manual fix: update match_live_state status to "finished" in Supabase

### 3. Page shows stale data
**Symptom:** /matches or homepage shows old scores/picks
**Fix:** Force revalidate:
```bash
curl -X POST https://www.wildlyplay.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: $SECRET" \
  -d '{"tags": ["picks", "watching", "matches", "posts", "votes"]}'
```

Valid tags: `picks`, `posts`, `votes`, `matches`, `watching`.

### 4. Article generation fails
**Symptom:** No preview/analysis/post-mortem article after pick
**Check:** `railway logs | grep "error\|warn\|failed"`
**Common causes:**
- Anthropic API key expired/rate limited
- Job queue stuck → check job_queue table for status="running" > 5 min
- `retryStaleJobs()` runs on worker boot — redeploy clears stuck jobs
- Durable job handlers: `note-translate`, `watching-news`, `postmortem`, `postmortem-article`
- Job queue polls every 60 seconds

### 5. Facebook post fails
**Symptom:** Article published on web but not on FB
**Check:** `railway logs | grep "Facebook\|FB"`
**Fix:** FB_PAGE_TOKEN expires ~60 days. Regenerate long-lived token.

### 6. Dark mode flash (FOUC)
**Resolved:** Theme script is first child of `<head>`. ThemeToggle re-syncs from localStorage.

## Rollback

### Web (Vercel)
```bash
# List recent deployments
vercel ls

# Rollback to previous production deployment
vercel rollback
# Or: Vercel Dashboard → Deployments → click previous → Promote to Production
```

### Worker (Railway)
- Railway Dashboard → Deployments → click previous successful deploy → Redeploy
- Or: `git revert HEAD && git push` then `railway up --detach`

## Secret Rotation

When a secret is leaked:

| Secret | Rotate at | Update at |
|--------|-----------|-----------|
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard → Settings → API | Railway env + Vercel env |
| LIVESCORE_API_KEY/SECRET | livescore-api.com dashboard | Railway env |
| ANTHROPIC_API_KEY | console.anthropic.com | Railway env |
| FB_PAGE_TOKEN | Facebook Graph API Explorer (60-day token) | Railway env |
| REVALIDATE_SECRET | Generate new: `openssl rand -hex 24` | Railway env + Vercel env |
| ODDS_API_KEY | the-odds-api.com dashboard | Railway env |
| CURATOR_BOT_TOKEN | @BotFather → /revoke + /newtoken | Railway env |

After rotation: redeploy worker (`railway up --detach`).

## Monitoring

- **Daily Line monitor** (`dl-monitor.ts`): auto-alerts TG group (-5152855985) on settlement issues, cron failures, and stuck jobs (every 15 min, 2h dedup)
- **Job tracker** (`job-tracker.ts`): captures warn-level logs containing "failed" as tracked failures
- **Uptime**: manual check (no external uptime ping yet)

## Database Backup & Restore

Supabase auto-backups daily (Pro plan). Access: Supabase Dashboard → Settings → Database → Backups.

**Restore from backup:**
1. Supabase Dashboard → Settings → Database → Backups
2. Select backup point → Restore

**Manual point-in-time restore:**
- Supabase supports PITR (point-in-time recovery) on Pro plan
- Contact Supabase support for granular restore

**Critical tables:** picks, watching, posts, pick_content, pick_votes, match_live_state, job_queue, channel_log, gl_daily_cards, gl_daily_card_matches, gl_picks, gl_users, gl_matches, gl_weekly_leaderboard, gl_groups, gl_group_members, teams, fixtures, competitions, provider_mappings, feature_flags, api_call_counters, profiles, forum_threads, forum_comments

## Vercel Cron Jobs

Defined in `apps/web/vercel.json`:

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/goalline/cron` | `0 18 * * *` (18:00 UTC daily) | Daily GoalLine card creation/settlement backup |

Note: The worker also calls `/api/goalline/cron` every 15 minutes for more frequent lock+settle.

## Architecture Note

**Score display: SINGLE SOURCE OF TRUTH = match_live_state table.**
All components (ticker, cards, /matches, match detail) read scores from match_live_state.
NEVER use picks table for live scores (picks only has final settled scores).

## Deploy Checklist

### Web (Vercel)
1. `cd apps/web && npx next build` — must pass
2. Deploy via `git push` to main (Vercel auto-deploys), OR `vercel --prod` for manual
3. Verify: `curl -s -o /dev/null -w "%{http_code}" https://www.wildlyplay.com` → 200
4. Force revalidate if needed
5. Vercel region: sin1 (Singapore)

### Worker (Railway)
1. `cd apps/worker && railway up --detach`
2. Check logs: `railway logs` — look for all boot messages (see Health Checks above)
3. Test bot: send /board to Telegram
4. Verify persist-state: check match_live_state updated_at
5. Verify job queue: check job_queue table for stuck jobs

### Both
1. Push to GitHub: `git push`
2. No secrets in source (grep for patterns before push)
3. Announce in WildlyPlay group (-5152855985)

## Adaptive Sync Intervals

| State | Persist Interval | Revalidate |
|-------|-----------------|------------|
| No live matches | 15 min (PERSIST_SLOW) | On data change |
| Live matches | 3 min (PERSIST_FAST) | Every sync |
| Near kickoff | Auto-switches to 3 min when first live match detected | Every sync |

Active competitions refreshed hourly from `competitions` table (fallback: WC id 362).

## FT Detection

- Threshold: 140 min after kickoff (covers 90' + 30' ET + 15' penalties + 5' buffer)
- Requires 3 consecutive absences from live feed (ABSENT_THRESHOLD = 3)
- Both conditions must be met: past 140 min AND 3 absences
- Knockout-safe since session 23/6/2026

## Worker Background Services

| Service | Interval | Description |
|---------|----------|-------------|
| Persist-state | 3 min (live) / 15 min (idle) | Live score sync to match_live_state |
| GoalLine cron | 15 min | Auto-lock + settle Daily Line cards |
| Daily Line monitor | 15 min | Alert TG group on settlement issues |
| Seed-tick | 30 min | Gradual Daily Line card seeding |
| Buzz cron | 3 hours + pre-kickoff | Community sentiment snapshots for watched matches |
| Analysis cron | ENV-driven | Auto-generate analysis articles |
| News-gen pipeline | Cron (requires Supabase) | Deterministic preview/result/standings articles |
| Booth shadow | Ongoing (requires Supabase + Anthropic) | AI commentary for live pick-matches (admin-only) |
| Provider matcher | Boot + every 6h | Cross-provider fixture mapping (odds-api + livescore) |
| Fixture ingest | After provider matcher | Populate unified fixtures table |
| Job queue | Every 60s | Process durable jobs (note-translate, watching-news, postmortem, postmortem-article) |
| Weekly digest | Sundays 13:00 UTC | Weekly ledger card to TG + FB |
| Competition refresh | Hourly | Refresh active competition IDs from DB |

## Escalation

1. Worker down → redeploy Railway
2. Web down → check Vercel dashboard, redeploy
3. DB down → Supabase dashboard, check service status
4. Livescore API down → matches degrade gracefully (Supabase fallback)
5. Anthropic down → picks still publish, articles skip (fire-and-forget)
