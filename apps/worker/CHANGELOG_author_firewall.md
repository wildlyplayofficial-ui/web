# API Delta — Tiered Picks author firewall (§12 Group A)

For Mac Mini (curator_send.py client update). Jane: please review before Mac Mini implements.

## New field: `author`

- Values: `"curator"` | `"scout"`. **This is the only field the client sets.**
- Optional on every publish endpoint below. **Default: `"curator"`** — omit it and nothing changes for existing callers.
- Invalid value → `400 { ok: false, error: "author must be curator/scout" }`.
- Immutable after publish (DB trigger blocks changing it once a pick leaves `draft`).

## New field: `author_type`

- Values: `"real_human"` | `"fictional_ai"`.
- **Server-derived only** — computed from `author` (`scout` → `fictional_ai`, `curator` → `real_human`). The client cannot set or override this. It exists purely for disclosure; if you send it, it's ignored.

## Endpoints touched

### `/api/pick`, `/api/watching`, `/api/noplay` (publish)
Add optional `author: "scout"` to the request body/text command. Response now includes `author` and `author_type`, e.g.:
```json
{ "ok": true, "id": 123, "match": "Mexico vs South Africa", "author": "scout", "author_type": "fictional_ai" }
```
Text-command parsers (`/pick`, `/watching`, `/noplay`): add a line `author: scout` anywhere before the free-text field (`thesis:` / `note:`).

### `/api/void`, `/api/review`
No new request fields. Response now also includes `author` / `author_type` of the affected pick.

### `/api/board`
New optional query param `author` (defaults to `curator`). Filters today's published picks by author. Each pick in the response now includes `author` / `author_type`.

### `/api/record`
New optional query param `author` (defaults to `curator`). **No blended "all authors" total exists** — every call is scoped to one author. Response adds:
```json
{ "ok": true, "author": "curator", "wins": 5, "losses": 2, "pushes": 1, "units": 3.25, "total": 8, "no_play_count": 4 }
```
`no_play_count` = per-author, English-only no-play article count (§12.A item 3).

## Not in this delta
- Item 4 (curator_send.py itself) — Mac Mini's own change, not covered here.
- Item 5 (`sources[]` on `/api/pick`) — separate, not yet started.

## DB migration required before scout data goes live
`supabase/migrations/add_pick_author.sql` adds the `author` column (+ check constraint, default `curator`, index) to `picks`, `watching`, `posts`, and extends the immutability trigger to guard `author`. **Not yet applied — needs manual run via Supabase Dashboard SQL Editor** (no DDL access from here).
