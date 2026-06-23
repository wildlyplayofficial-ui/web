# WildlyPlay Curator API

Internal API for automating all Curator workflows. Every endpoint uses the same pipelines as the Telegram bot — 4-lang articles, TG+FB announcements, web cache revalidation.

## Base URL

```
https://wildlyplay-worker-production.up.railway.app
```

## Authentication

```
x-webhook-secret: <REVALIDATE_SECRET>
```

All requests: `POST`, `Content-Type: application/json`.

---

## Create Commands

### POST /api/pick

Create a new pick and trigger the full pipeline (preview article, thesis translation, analysis, TG+FB announce).

**Payload:**
```json
{
  "text": "match: Argentina vs Austria\nleague: FIFA World Cup 2026 — Group J\nkickoff: 2026-06-22T17:00:00Z\nmarket: ah\nline: -1.25\nselection: Argentina -1.25\nodds: 1.95\nstake: 1.5\nconfidence: HIGH\nedge: TACTICAL_MATCHUP\nevidence: RECENT_FORM, EXPECTED_GOALS\nthesis: Argentina's pressing intensity should overwhelm Austria's build-up..."
}
```

**Required fields in text:** match, league, kickoff, market (enum: `ah`/`ou`/`1x2`/`btts`/`other`), line (required for ah/ou), selection, odds, stake, thesis, confidence, edge

**Optional:** evidence (max 2, comma-separated), event (odds-api event ID)

**Response 200:**
```json
{ "ok": true, "id": "uuid", "match": "Argentina vs Austria", "selection": "Argentina -1.25" }
```

**Response 422:**
```json
{ "ok": false, "error": "parse_failed", "errors": ["missing field: odds", "..."] }
```

---

### POST /api/watching

Start watching a match. Triggers: note translation (4 langs), watching news article (4 langs), buzz snapshot, TG+FB announce.

**Payload:**
```json
{
  "text": "match: France vs Iraq\nleague: FIFA World Cup 2026 — Group F\nkickoff: 2026-06-22T21:00:00Z\nnote: Watching for late-game value if France chases..."
}
```

**Required:** match, league, kickoff  
**Optional:** note

**Response 200:**
```json
{ "ok": true, "id": "uuid", "match": "France vs Iraq" }
```

---

### POST /api/noplay

Log a no-play decision. Triggers: no-play article (4 langs), TG+FB announce.

**Payload:**
```json
{
  "text": "match: Argentina vs Austria\nleague: FIFA World Cup 2026 — Group J\nreason: MARKET_EFFICIENT\nwatching: Lineups are in — Argentina full-strength...\nnote: Both sides won openers, draw advances both..."
}
```

**Required:** match, league, reason  
**Optional:** watching, note

**Reason values:** `NO_EDGE` · `PRICE_TOO_SHORT` · `VARIANCE_TOO_HIGH` · `TEAM_NEWS_UNCLEAR` · `MARKET_EFFICIENT` · `SIGNAL_UNSTABLE` · `VALUE_GONE`

**Response 200:**
```json
{ "ok": true, "match": "Argentina vs Austria", "reason": "MARKET_EFFICIENT" }
```

---

### POST /api/score

Manually settle a pick with a final score. Triggers: post-mortem draft, recap article, result announcement.

**Payload:**
```json
{
  "pickId": "uuid",
  "home": 2,
  "away": 1
}
```

**Response 200:**
```json
{ "ok": true, "id": "uuid", "status": "won", "units_pl": 1.43 }
```

---

### POST /api/approve

Approve a post-mortem review. Triggers: post-mortem article (4 langs), TG+FB announce.

**Payload:**
```json
{
  "pickId": "uuid",
  "lossType": "variance",
  "reviewText": "Optional edited review text (uses AI draft if omitted)"
}
```

**Required:** pickId  
**Required for losses:** lossType (`variance` · `thesis-error` · `price-error` · `model-error`)  
**Optional:** reviewText (EN) — this text is the BASIS for the 4-lang post-mortem article. It is faithfully reflected in vi/th/es (not just EN override)

**Response 200:**
```json
{ "ok": true, "id": "uuid", "match": "Argentina vs Austria" }
```

---

### POST /api/void

Void a pick before kickoff.

**Payload:**
```json
{ "pickId": "uuid" }
```

**Response 200:**
```json
{ "ok": true, "id": "uuid", "match": "Argentina vs Austria" }
```

---

### POST /api/unwatch

Stop watching a match.

**Payload:**
```json
{ "watchingId": "uuid" }
```

**Response 200:**
```json
{ "ok": true, "id": "uuid", "match": "France vs Iraq" }
```

---

## Read-Only Endpoints

### POST /api/board

Today's active picks.

**Payload:** `{}`

**Response:**
```json
{
  "ok": true,
  "count": 2,
  "picks": [
    { "id": "uuid", "match": "Argentina vs Austria", "selection": "Argentina -1.25", "odds": 1.95, "stake": 1.5, "kickoff": "2026-06-22T17:00:00Z" }
  ]
}
```

---

### POST /api/record

Season track record.

**Payload:** `{}`

**Response:**
```json
{ "ok": true, "wins": 12, "losses": 8, "pushes": 2, "units": 4.35, "total": 22 }
```

---

### POST /api/review

View post-mortem details for a settled pick.

**Payload:**
```json
{ "pickId": "uuid" }
```

**Response:**
```json
{
  "ok": true, "id": "uuid", "match": "Argentina vs Austria",
  "status": "lost", "postmortem_status": "approved",
  "draft": "AI-generated review...", "approved": "Curator-approved review..."
}
```

---

### POST /api/overdue

List post-mortems pending >24h.

**Payload:** `{}`

**Response:**
```json
{
  "ok": true, "count": 2,
  "picks": [
    { "id": "uuid", "match": "Brazil vs Haiti", "status": "lost", "settled_at": "2026-06-20T..." }
  ]
}
```

---

## Pipeline Triggers (Existing)

Trigger pipelines for rows already in the database. Use when data is created externally.

### POST /webhook/watching
```json
{ "watchingId": "uuid" }
```

### POST /webhook/pick
```json
{ "pickId": "uuid" }
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Missing/invalid parameters |
| 401 | Bad or missing `x-webhook-secret` |
| 404 | Resource not found |
| 422 | Validation failed (parse errors, wrong status, etc.) |
| 500 | Server error |

---

## Examples

### cURL — Create a pick
```bash
curl -X POST https://wildlyplay-worker-production.up.railway.app/api/pick \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{
    "text": "match: Argentina vs Austria\nleague: FIFA World Cup 2026\nkickoff: 2026-06-22T17:00:00Z\nmarket: ah\nline: -1.25\nselection: Argentina -1.25\nodds: 1.95\nstake: 1.5\nconfidence: HIGH\nedge: TACTICAL_MATCHUP\nthesis: Argentina pressing intensity..."
  }'
```

### Python — Full workflow
```python
import requests

BASE = "https://wildlyplay-worker-production.up.railway.app"
H = {"Content-Type": "application/json", "x-webhook-secret": SECRET}

# 1. Create watching
r = requests.post(f"{BASE}/api/watching", headers=H, json={
    "text": "match: France vs Iraq\nleague: FIFA World Cup 2026\nkickoff: 2026-06-22T21:00:00Z\nnote: Watching for value..."
})
print(r.json())  # {"ok": true, "id": "...", "match": "France vs Iraq"}

# 2. Create pick
r = requests.post(f"{BASE}/api/pick", headers=H, json={
    "text": "match: France vs Iraq\nleague: FIFA World Cup 2026\nkickoff: 2026-06-22T21:00:00Z\nmarket: ou\nline: 2.5\nselection: Over 2.5\nodds: 1.87\nstake: 1\nconfidence: MEDIUM\nedge: TACTICAL_MATCHUP\nthesis: France attacking quality..."
})
pick_id = r.json()["id"]

# 3. Settle
r = requests.post(f"{BASE}/api/score", headers=H, json={
    "pickId": pick_id, "home": 3, "away": 1
})
print(r.json())  # {"ok": true, "status": "won", "units_pl": 0.87}

# 4. Approve post-mortem
r = requests.post(f"{BASE}/api/approve", headers=H, json={
    "pickId": pick_id
})
```

### Node.js
```javascript
const BASE = "https://wildlyplay-worker-production.up.railway.app";
const headers = { "Content-Type": "application/json", "x-webhook-secret": SECRET };

const res = await fetch(`${BASE}/api/noplay`, {
  method: "POST", headers,
  body: JSON.stringify({
    text: "match: Argentina vs Austria\nleague: FIFA World Cup 2026\nreason: MARKET_EFFICIENT\nnote: No value at current prices"
  })
});
console.log(await res.json());
```
