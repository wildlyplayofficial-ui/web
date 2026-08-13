# Buildspec — Tạo PICK / WATCHING / HÌNH (cho Mac Mini)
*Agent tạo nội dung (Mac Mini) đẩy kèo + trận theo dõi + ảnh vào WildlyPlay. Worker lo settle/announce/preview — Mac Mini CHỈ tạo.*

## §0. Vì sao (context 30s)
Trang chủ mới (ESPN, đã live) khoe **dự đoán** + **phân tích** + **thumbnail thật**. Nhưng mùa chưa khai mạc nên board trống. Mac Mini cần biết đường tạo **pick** (kèo), **watching** (trận theo dõi), **no-play** (trận bỏ qua), và **hình** đúng chuẩn để đổ đầy nội dung — không bịa, không phá firewall Curator/Scout, không tự settle.

Kèo GỐC nằm ở web (worker `picks` table) → Telegram/FB chỉ là kênh phát. Tạo đúng 1 lần, hệ thống tự lo preview + dịch + đăng + thông báo.

## §1. Non-goals — KHÔNG làm
- ❌ **KHÔNG settle** (chấm thắng/thua). Worker tự settle qua `/api/score` khi có tỉ số. Mac Mini tạo kèo `status=published`, xong.
- ❌ **KHÔNG tự đặt `author_type`**. Server tự suy: scout→`fictional_ai`, curator→`real_human`. Chỉ set `author`.
- ❌ **KHÔNG trộn ledger**: kèo Curator và Scout tính riêng. Đừng gán bừa author.
- ❌ **KHÔNG bịa số** (odds, tỉ lệ, confidence). Odds lấy từ nguồn thật; thesis phải có lý do thật.
- ❌ **KHÔNG xoá/sửa kèo đã published** (DB chặn: chỉ field settlement + status đổi được sau publish).
- ❌ **KHÔNG dán hình vẽ tay logo** — logo giải lấy transparent chuẩn (xem §2E).

## §2. BUILD

### A. Tạo PICK (kèo) — `POST {WORKER_URL}/api/pick`
🔴 **AUTH — bắt buộc**: header `x-webhook-secret: $REVALIDATE_SECRET`. Sai/thiếu → 401.
Body: `{"text": "<khối key:value, mỗi dòng 1 field, thesis: cuối cùng>"}`. Server tự ép `status=published`, `published_at=now`.

| field | bắt buộc? | giá trị hợp lệ / ghi chú |
|---|---|---|
| `match` | ✅ | `<home> vs <away>` |
| `league` | ✅ | free text (vd "Premier League") |
| `kickoff` | ✅ | ISO, PHẢI tương lai (trừ khi kèo in-play có `score`) |
| `market` | ✅ | `ah` \| `ou` \| `1x2` \| `btts` \| `other` |
| `line` | ⚠️ điều kiện | BẮT BUỘC cho `ah`/`ou`; CẤM cho `1x2`/`btts`. numeric (vd -0.5, 2.5) |
| `selection` | ✅ | vd "Home -0.5", "Over 2.5", "yes" |
| `odds` | ✅ | 1.01–100 (odds thật lúc đăng, immutable sau publish) |
| `stake` | ✅ | 0.25–5, bước 0.25 (mặc định 1) |
| `confidence` | ✅ | `low` \| `medium` \| `high` |
| `edge` | ✅ | 1 trong: `PRICE_VALUE` `TACTICAL_MATCHUP` `TEAM_NEWS` `SCHEDULE_FATIGUE` `MOTIVATION` `LIVE_STATE` `MARKET_MOVEMENT` |
| `thesis` | ✅ | lý do (PHẢI là dòng CUỐI, free text nhiều dòng) |
| `author` | tùy | `curator` (mặc định) \| `scout` |
| `event` | tùy | fixture id numeric (bỏ trống → server tự tìm qua match+kickoff) |
| `score` | tùy | `H-A` → đánh dấu kèo in-play (điểm lúc vào) |
| `edge_pct` | tùy | signed (âm = bất lợi) |
| `evidence` | tùy | ≤2 CSV: `RECENT_FORM` `HISTORICAL_DATA` `EXPECTED_GOALS` `CONFIRMED_LINEUP` `HOME_AWAY_SPLIT` `SET_PIECES` `DEFENSIVE_WEAKNESS` `PUBLIC_SENTIMENT` `SHOT_CHANCE_QUALITY` `INJURY_SUSPENSION` |
| `hook` | tùy | câu hook cho card |
| `against_market` | tùy | `yes`/`no` |

Parse lỗi → **422** `{ok:false, errors:[...]}`. OK → **200** `{ok,id,match,selection,author,author_type}`.
**Sau khi tạo, worker tự**: revalidate, gen preview, dịch thesis, gen bài phân tích, `announcePick` (Telegram/FB). Mac Mini KHÔNG làm mấy cái đó.

Ví dụ body:
```
{"text": "match: Arsenal vs Man City\nleague: Premier League\nkickoff: 2026-08-16T20:00:00Z\nmarket: ah\nline: -0.5\nselection: Man City -0.5\nodds: 1.95\nstake: 1\nconfidence: medium\nedge: TACTICAL_MATCHUP\nauthor: curator\nthesis: City chiều sâu đội hình nhỉnh hơn, Arsenal thiếu trục giữa..."}
```

### B. Tạo WATCHING (trận theo dõi) — `POST {WORKER_URL}/api/watching`
Auth như trên. Body `{"text": "<khối>", "presence"?: true}`.

| field | bắt buộc? | ghi chú |
|---|---|---|
| `match` | ✅ | `<home> vs <away>` |
| `kickoff` | ✅ | ISO tương lai |
| `league` | tùy | mặc định "FIFA World Cup 2026" — nên set đúng giải |
| `note` | tùy | gợi ý của curator (free text, dòng cuối) |
| `reason` | tùy | hook cho card |
| `author` | tùy | `curator` \| `scout` |
| `presence` (JSON, không phải text) | tùy | `true` = card "watch-lite" tối giản |

→ tạo watching `status=active`, worker tự enqueue dịch note + tin trận + buzz. Hiện ở `WatchingTeaser` + `/daily-board`.

### C. NO-PLAY — 2 loại KHÁC NHAU
1. **No-play trên board** (đếm/list ở /daily-board): KHÔNG phải pick trạng thái lạ. Cách đúng: tạo watching (B) → rồi **expire** nó qua `POST /api/unwatch` (kèm `note` → thành `close_note` = lý do bỏ qua 1 dòng). Board query watching `status=expired` kickoff hôm nay.
2. **Bài no-play** (prose SEO): `POST /api/noplay` → tạo posts `type=no-play`. Nội dung riêng, KHÔNG lên list board.

### D. Gắn PICK vào bài phân tích (funnel)
`analysis_articles.linked_pick_id` = **UUID của pick** (lấy từ response 200 khi tạo pick). Trang bài sẽ hiện thẻ "View play →" trỏ `/play/{id}`. Set qua API bài: `POST /api/analysis` (auth x-webhook-secret) hoặc PATCH row. Đây là cách để **Super Sunday** trang chủ khoe được dự đoán: bài marquee (`tier=T2_marquee`) gắn `linked_pick_id` → card hiện dự đoán.
> Firewall: bài CHỈ link tới kèo, KHÔNG nhúng W-L record vào bài.

### E. TẠO HÌNH (workflow wp-thumbnail) — 1200×630 chuẩn
Skill: `~/.claude/skills/wp-thumbnail/` (SKILL.md + scripts/). Mọi hình 1200×630 (render 2400×1260 @2x).

**E1. Thumbnail TRẬN (cartoon, cho pick/preview):**
1. Ảnh cầu thủ: `lib.wikimedia_player(name)` — Wikipedia→Commons, GHI credit tác giả + license.
2. Cartoon hoá: `lib.cartoon_ify(anh, kit_desc)` — **gpt-image-2 EDIT (prompt + ẢNH thật)** để giữ giống mặt; nền XANH đặc. (Key `~/.config/openai/api_key`. ~vài cent/ảnh — chỉ hình cartoon mới tốn GPT.)
3. Tách nền: `lib.chroma_key` (PIL, hue-based; KHÔNG dùng rembg).
4. Ghép: `compose_match.py` — nền xanh radial, panel giữa, badge giải vàng, VS, giờ VN (`lib.uk_to_vn`), tên đội + badge 3D (drop-shadow, KHÔNG plate trắng), credit góc.

**E2. Card GUIDE (giải, cho bài roundup/hướng dẫn):** `guide_card.py <league_key> "<Tên>" "<NHÃN>" <out> "<sub>"`.
- Logo giải: bucket Supabase `competition-logos` (mls, serie-a, bundesliga, ligue-1, la-liga, champions-league, liga-mx, premier-league).
- ⚠️ mls + serie-a bucket **nền trắng** → dùng logo transparent chuẩn ở `assets/league-logos/` (đã rasterize từ Commons SVG). bundesliga ô đỏ = logo gốc, giữ.
- Logo WP góc: `assets/wp_logo_white.png` (bản trắng), size ~198px.

**E3. Upload + gắn hero:** POST `{SUPABASE_URL}/storage/v1/object/player-photos/<name>.png` header `x-upsert:true` + Bearer service key → URL public. Gắn vào `hero_image` của bài/pick. (Supabase upsert phục vụ bản mới ngay.)

## §3. Contract (nhịp)
- Mac Mini tạo trước mỗi vòng đấu: watching cho các trận tâm điểm, pick khi có lợi thế thật, bài phân tích + hình kèm.
- Mỗi pick → 1 bài phân tích + 1 thumbnail trận. Mỗi bài guide → 1 card.
- KHÔNG spam kèo: chỉ đăng khi có edge (đúng tinh thần "chỉ khi có lợi thế").

## §4. Acceptance (kiểm được)
- [ ] `POST /api/pick` trả 200 + id; kèo hiện ở `/daily-board` + `/play/{id}`.
- [ ] `market=ah/ou` có `line`; `1x2/btts` không có `line`.
- [ ] `confidence` + `edge` hợp enum; parse 422 nếu thiếu.
- [ ] `author` đúng persona; `author_type` do server set (không gửi từ client).
- [ ] Watching hiện ở `WatchingTeaser`; no-play (expire) hiện ở list board.
- [ ] Bài marquee gắn `linked_pick_id` → Super Sunday trang chủ hiện được dự đoán.
- [ ] Hình 1200×630, thumbnail trận giữ mặt cầu thủ, card guide logo transparent, có credit ảnh.
- [ ] Verify byte hình live == local sau upload.

## §5. Out of scope (worker/hệ thống lo, Mac Mini KHÔNG đụng)
Settle (`/api/score`), void, postmortem, gen preview, dịch, `announcePick`, revalidate — worker tự chạy sau khi nhận pick. CLV `odds_close` worker tự bắt gần kickoff.

## §6. Phasing (pilot trước)
1. **Pilot 1 trận**: tạo 1 watching + 1 pick (Ars-MC) + 1 thumbnail + gắn linked_pick_id → kiểm Super Sunday hiện dự đoán trên trang chủ.
2. Ổn → mở rộng: mỗi vòng vài watching + pick khi có edge.
3. Auto hoá: nối vào pipeline tin (gom → chấm → viết → hình → đăng).

---
**Env cần**: `WORKER_URL` (worker public /api), `REVALIDATE_SECRET`, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI` key (chỉ cho cartoon). Chạy qua `railway run --service wildlyplay-worker` để có env, hoặc gọi HTTP tới worker URL với secret.

**File nguồn** (đọc khi cần): `apps/worker/src/{parse-pick.ts, parse-watching.ts, api-routes.ts, store.ts, settle.ts}`, `apps/web/lib/{types.ts, data.ts, analysis-articles.ts}`, `supabase/schema.sql`. Skill hình: `~/.claude/skills/wp-thumbnail/`.
