*Last updated: 2026-08-15*

# Curator Commands — Cheatsheet cho Mac Mini

File gọn để Mac Mini gửi lệnh Curator (pick, watching, no-play, score, approve…).
Chi tiết đầy đủ từng field: xem `docs/curator-api.md`. File này = copy-paste chạy ngay.

## Setup (1 lần)

```bash
BASE="https://wildlyplay-worker-production.up.railway.app"
SECRET="<REVALIDATE_SECRET>"      # lấy từ Railway env, KHÔNG commit vào git
H=(-H "Content-Type: application/json" -H "x-webhook-secret: $SECRET")
```

> **Auth fail-closed:** thiếu hoặc sai `SECRET` → mọi request trả **401**. Secret là bắt buộc.

## Pipeline tự động sau mỗi lệnh tạo

Mỗi lệnh tạo (`/api/pick`, `/api/watching`, `/api/noplay`) kích hoạt trọn pipeline:
bài viết 4 ngôn ngữ → **tạo hình HERO (cartoon cầu thủ + logo 2 CLB, style mới — qua wp-thumbnail/cartoon_ify)** → đăng TG + FB → revalidate cache web.
Không cần gọi tạo hình riêng — hình đi kèm trong pipeline.

---

## Lệnh TẠO

### /api/pick — tạo kèo mới
```bash
curl -X POST "$BASE/api/pick" "${H[@]}" -d '{
  "text": "match: Arsenal vs Manchester City\nleague: Premier League 2026-27\nkickoff: 2026-08-16T14:00:00Z\nmarket: ah\nline: -0.5\nselection: Arsenal -0.5\nodds: 1.95\nstake: 1.5\nconfidence: HIGH\nedge: TACTICAL_MATCHUP\nevidence: RECENT_FORM, EXPECTED_GOALS\nthesis: Arsenal pressing intensity should overwhelm City build-up..."
}'
```
**Bắt buộc:** match, league, kickoff, market (`ah`/`ou`/`1x2`/`btts`/`other`), line (cho ah/ou), selection, odds, stake, thesis, confidence (LOW/MEDIUM/HIGH), edge (PRICE_VALUE/TACTICAL_MATCHUP/TEAM_NEWS/SCHEDULE_FATIGUE/MOTIVATION/LIVE_STATE/MARKET_MOVEMENT).
**Tuỳ chọn:** evidence (tối đa 2), event, edge_pct, hook, against_market (yes/no), score, author (`curator`/`scout`).

### /api/watching — bắt đầu theo dõi trận
```bash
curl -X POST "$BASE/api/watching" "${H[@]}" -d '{
  "text": "match: Chelsea vs Liverpool\nleague: Premier League 2026-27\nkickoff: 2026-08-17T15:30:00Z\nnote: Watching for late-game value if Chelsea chase..."
}'
```
**Bắt buộc:** match, kickoff. **Tuỳ chọn:** league, note, reason, author, presence (true/false — thẻ presence-only).

### /api/noplay — ghi quyết định không cược
```bash
curl -X POST "$BASE/api/noplay" "${H[@]}" -d '{
  "text": "match: Arsenal vs Manchester City\nleague: Premier League 2026-27\nreason: MARKET_EFFICIENT\nnote: No value at current prices..."
}'
```
**Bắt buộc:** match, reason (`NO_EDGE`/`PRICE_TOO_SHORT`/`VARIANCE_TOO_HIGH`/`TEAM_NEWS_UNCLEAR`/`MARKET_EFFICIENT`/`SIGNAL_UNSTABLE`/`VALUE_GONE`). **Tuỳ chọn:** league, watching, note, verdict, author.

---

## Lệnh SETTLE / QUẢN LÝ

### /api/score — chốt tỉ số
```bash
curl -X POST "$BASE/api/score" "${H[@]}" -d '{ "pickId": "uuid", "home": 2, "away": 1 }'
```

### /api/approve — duyệt post-mortem
```bash
curl -X POST "$BASE/api/approve" "${H[@]}" -d '{ "pickId": "uuid", "lossType": "variance" }'
```
**Bắt buộc:** pickId. **Cho trận thua:** lossType (`variance`/`thesis-error`/`price-error`/`model-error`). **Tuỳ chọn:** reviewText (EN, làm gốc cho bản 4 ngôn ngữ).

### /api/void — huỷ kèo trước giờ bóng lăn
```bash
curl -X POST "$BASE/api/void" "${H[@]}" -d '{ "pickId": "uuid" }'
```

### /api/unwatch — ngừng theo dõi
```bash
curl -X POST "$BASE/api/unwatch" "${H[@]}" -d '{ "watchingId": "uuid", "note": "optional closing line" }'
```

---

## Lệnh ĐỌC (không đổi dữ liệu)

```bash
curl -X POST "$BASE/api/board"   "${H[@]}" -d '{ "author": "curator" }'   # kèo active hôm nay
curl -X POST "$BASE/api/record"  "${H[@]}" -d '{ "author": "curator" }'   # thành tích mùa
curl -X POST "$BASE/api/review"  "${H[@]}" -d '{ "pickId": "uuid" }'       # chi tiết post-mortem
curl -X POST "$BASE/api/overdue" "${H[@]}" -d '{}'                          # post-mortem quá hạn >24h
curl -X POST "$BASE/api/fixtures/upcoming" "${H[@]}" -d '{ "days": 14 }'    # lịch sắp đá (livescore)
curl -X POST "$BASE/api/fixtures/finished" "${H[@]}" -d '{ "days": 10 }'    # trận đã đá
```

---

## Kích pipeline cho dữ liệu tạo sẵn ngoài (đã có row trong DB)

```bash
curl -X POST "$BASE/webhook/pick"     "${H[@]}" -d '{ "pickId": "uuid" }'
curl -X POST "$BASE/webhook/watching" "${H[@]}" -d '{ "watchingId": "uuid" }'
```

## Mã lỗi
| Mã | Nghĩa |
|----|----|
| 200 | OK |
| 400 | Thiếu/sai tham số |
| 401 | Sai/thiếu `x-webhook-secret` |
| 422 | Parse lỗi hoặc sai trạng thái |
| 500 | Lỗi server |
| 503 | Dịch vụ không sẵn (vd livescore chưa cấu hình) |
