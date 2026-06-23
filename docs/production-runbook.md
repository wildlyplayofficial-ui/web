# WildlyPlay Production Runbook (R10)

## Infrastructure

| Component | Platform | URL | Deploy |
|-----------|----------|-----|--------|
| Web (Next.js) | Vercel | wildlyplay.com | `vercel --prod` from apps/web |
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
| Telegram Bot | Railway env vars | TELEGRAM_BOT_TOKEN |

## Health Checks

### Worker (check first — most critical)
```bash
# Railway logs
railway logs

# Expected: "Curator bot started", "poller started", "persist-state cron started"
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
# If updated_at > 15 min old during live matches → persist-state stuck
```

## Common Issues & Fixes

### 1. Bot not responding
**Symptom:** Telegram commands ignored
**Check:** `railway logs | grep "bot started"`
**Fix:** Worker crashed → `railway up --detach` to redeploy

### 2. Live scores stale / match stuck as "live"
**Symptom:** Match shows old score or "LIVE" after FT
**Check:** DB match_live_state status + updated_at
**Fixes:**
- Persist-state cron not running → redeploy worker
- Match dropped from livescore feed → auto-FT kicks in after 3 polls (6 min at 2-min interval, or 30 min at 10-min idle)
- Manual fix: update match_live_state status to "finished" in Supabase

### 3. Page shows stale data
**Symptom:** /matches or homepage shows old scores/picks
**Fix:** Force revalidate:
```bash
curl -X POST https://www.wildlyplay.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: $SECRET" \
  -d '{"tags": ["picks", "watching", "matches", "posts"]}'
```

### 4. Article generation fails
**Symptom:** No preview/analysis/post-mortem article after pick
**Check:** `railway logs | grep "error\|warn\|failed"`
**Common causes:**
- Anthropic API key expired/rate limited
- Job queue stuck → check job_queue table for status="running" > 5 min
- `retryStaleJobs()` runs on worker boot — redeploy clears stuck jobs

### 5. Facebook post fails
**Symptom:** Article published on web but not on FB
**Check:** `railway logs | grep "Facebook\|FB"`
**Fix:** FB_PAGE_TOKEN expires ~60 days. Regenerate long-lived token.

### 6. Dark mode flash (FOUC)
**Resolved:** Theme script is first child of `<head>`. ThemeToggle re-syncs from localStorage.

## Deploy Checklist

### Web (Vercel)
1. `cd apps/web && npx next build` — must pass
2. `vercel --prod`
3. Verify: `curl -s -o /dev/null -w "%{http_code}" https://www.wildlyplay.com` → 200
4. Force revalidate if needed

### Worker (Railway)
1. `cd apps/worker && railway up --detach`
2. Check logs: `railway logs` — "bot started" + "poller started"
3. Test bot: send /board to Telegram
4. Verify persist-state: check match_live_state updated_at

### Both
1. Push to GitHub: `git push`
2. No secrets in source (grep for patterns before push)
3. Announce in WildlyPlay group (-5152855985)

## Adaptive Sync Intervals

| State | Persist Interval | Revalidate |
|-------|-----------------|------------|
| No live matches | 10 min | On data change |
| Live matches | 2 min | Every sync |
| Near kickoff (±5 min) | 2 min (auto-detect) | Every sync |

## FT Detection

- Threshold: 140 min after kickoff (covers ET + penalties)
- Requires 3 consecutive absences from live feed
- Knockout-safe since session 23/6/2026

## Escalation

1. Worker down → redeploy Railway
2. Web down → check Vercel dashboard, redeploy
3. DB down → Supabase dashboard, check service status
4. Livescore API down → matches degrade gracefully (Supabase fallback)
5. Anthropic down → picks still publish, articles skip (fire-and-forget)
