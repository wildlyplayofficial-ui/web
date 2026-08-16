# SPEC: WildlyPlay máy tin tự động NHA (5h + 17h) — 16/8/2026

> Single source of truth cho task đa-agent (Jane + Gwen). ĐỌC spec này trước khi bắt tay.
> Không tự mở rộng scope ngoài spec; đổi scope phải sửa spec + báo Peter.

## 1. Goal

Mỗi ngày 05:00 và 17:00 (giờ VN), hệ thống tự sinh và đăng bài tin Ngoại hạng Anh lên WildlyPlay
mà không cần ai bấm tay, với chất lượng đủ để Google index (không phải bài mỏng).

Peter đã cấp quyền thường trực 16/8: **Jane được publish news WP không cần hỏi từng bài.**

## 2. Requirements

- Chạy trong worker Railway đang chạy 24/7 (`wildlyplay-worker`), KHÔNG dùng Windows Scheduled Task
  (phụ thuộc máy Jane bật). Bám nếp scheduler sẵn có trong repo: `src/buzz.ts` (`startBuzzCron`),
  `src/digest.ts` (weekly ledger, Chủ nhật 13:00 UTC), `src/booth-shadow.ts`.
- Hai nhịp mỗi ngày:
  - **05:00 VN** — dọn tin qua đêm: recap trận đã đá (từ `fixtures` có `home_score`/`away_score`),
    cập nhật BXH nếu vừa xong vòng.
  - **17:00 VN** — preview trận tối/đêm nay + cuối tuần.
- Nguồn dữ liệu là bảng `fixtures` trong DB (sau khi Gwen nạp 380 trận), KHÔNG bịa lịch/tỷ số.
- Bài phải có ảnh bìa, đúng khuôn hero hiện tại (badge CLB thật + nền brand WP).
- Sau khi đăng: revalidate tag `posts` → verify HTTP 200 + title trên bản live → đẩy IndexNow.
  Fail bất kỳ bước nào thì KHÔNG báo thành công, ghi log lỗi + báo Telegram.

## 3. Constraints

- Tuân CLAUDE.md: surgical, verify trước khi claim xong, không tự mở scope.
- **Lọc giải theo 3 tầng** (Peter + Jane + Gwen chốt 16/8):
  - T1 auto thoải mái: NHA (ưu tiên MU), UCL từ vòng bảng, La Liga, Serie A, Bundesliga, Ligue 1,
    VL World Cup châu Á + AFF khi có Việt Nam.
  - T2 nhỏ giọt ≤1-2 bài/tuần: MLS, Liga MX (trừ khi có sao lớn).
  - T3 KHÔNG đăng: vòng SƠ loại UCL, đội hạng thấp châu Âu. Đây là nguồn đẻ rác đã tạo ra
    26 bài draft kiểu "Atert Bissen vs Klaksvik".
- **KHÔNG auto tin chuyển nhượng / tin đồn.** Chỉ auto loại lấy từ DB thật: preview, recap, BXH.
  Lý do: mọi lỗi số liệu sáng 16/8 đều rơi vào tin chuyển nhượng (phí Spence sai đơn vị, phí Ferran).
- **KHÔNG đẻ thêm bài lịch/giờ/xem-ở-đâu cho NHA** — đã có 12 bài tra cứu, đẻ thêm là tự đá từ khoá.
- Pháp lý bản VI: không "kèo", "cược", "đặt tiền", không cam kết kết quả.
- Ảnh: logo CLB LUÔN dùng file badge thật (`wp_hero/badges/`), KHÔNG để AI vẽ logo. Ảnh người phải
  từ nguồn CC0/public domain. KHÔNG dùng ảnh chụp báo chí.
- Không auto-publish khi thiếu dữ liệu: fixture không có trong DB thì bỏ qua, không đoán.

## 4. Acceptance Criteria

- [ ] `fixtures` có đủ 380 trận EPL 2026/27, ngày giờ khớp lịch chính thức Premier League (spot-check
      ≥5 trận, gồm Arsenal–Coventry 21/8 và Hull–MU 22/8 12:30 giờ Anh).
- [ ] Scheduler nổ đúng 05:00 và 17:00 giờ VN, quan sát được trong log Railway 2 ngày liên tiếp.
- [ ] Một lần chạy thử (dry-run) sinh ra bài NHÁP đúng khuôn, KHÔNG publish, cho Jane soi trước.
- [ ] Sau khi bật thật: bài mới trả HTTP 200, `<title>` đúng, hero ảnh trả 200, IndexNow trả ok.
- [ ] Không có bài nào thuộc T3 được đăng.
- [ ] Không có bài chuyển nhượng nào được auto-publish.

## 5. Agent Assignment

| Phần việc | Owner | Ghi chú |
|-----------|-------|---------|
| Nạp 380 trận EPL từ openfootball vào `fixtures` | Gwen | Ghi dữ liệu thật → xin Peter gật trước khi ghi |
| Thêm scheduler 05:00/17:00 vào worker | Gwen | Bám nếp `startBuzzCron` / digest scheduler |
| Ráp phần ruột vào worker + deploy | Gwen | Jane không có GitHub trên máy |
| Thiết kế phần ruột: chọn bài gì, lấy data ra sao, khuôn bài | Jane | Spec này + skill `wp-news-writer` |
| Bộ mã dựng ảnh hero + đăng bài | Jane | Đã có, xem mục 8 |
| Soi bài dry-run + soi bài live sau khi bật | Jane | |
| Review chéo số liệu | Gwen | |

## 6. Out of scope

- Đăng tự động lên Facebook và Telegram (còn chờ token page `xemthethaotructiep`).
- Dịch tự động sang EN/TH/ES.
- Đổi disclaimer sang tiếng Việt (đang nằm ở PR 71, việc riêng).
- Nạp lịch cho các giải ngoài NHA.
- Bài chuyển nhượng (vẫn viết tay).

## 7. Decisions Log

- 16/8: Peter cấp quyền thường trực cho Jane publish news WP không cần hỏi từng bài.
- 16/8: Peter chốt nhịp chạy 05:00 và 17:00 mỗi ngày.
- 16/8: Chốt chia 3 tầng giải; cắt hẳn vòng sơ loại UCL.
- 16/8: Chốt tin chuyển nhượng KHÔNG auto, phải người soi.
- 16/8: Bỏ phương án Windows Scheduled Task, chuyển vào worker Railway 24/7.
- 16/8: Thứ tự thi công: nạp lịch trước → viết phần ruột → chạy thử 1 ngày → mới thả tự động.

## 8. Tài sản đã có (dùng lại, đừng viết lại)

Trong `apps/worker/`:
- `jane-upsert-article.mjs` — tạo/cập nhật bài: `<bodyFile> <slug> <title> <status> [publishedAtISO]`
- `jane-update-body.mjs` — sửa body + revalidate tag `posts`
- `jane-upload-hero.mjs` — upload ảnh lên bucket `player-photos`, HEAD kiểm 200, gắn `hero_image`, revalidate
- `jane-indexnow.mjs` — đẩy URL sang IndexNow

Trong `C:\Users\PC\wp_hero\` (chạy `PYTHONUTF8=1 python ...` từ chính thư mục đó):
- `cartoonify.py <ảnh> <out> "<mô tả áo>"` — ảnh CC0 → cartoon. **TỐN TIỀN**, chỉ dùng khi cần người mới.
- `cut_flat_green.py <cartoon> <cut> [tol=70]` — tách nền xanh phẳng
- `compose_team_hero.py <cut> <badge> "<TÊN>" "<dòng phụ>" "<pill>" <out>` — hero có người
- `compose_team_preview.py <badge> "<TÊN>" "<dòng phụ>" "<pill>" <out>` — hero chỉ có logo
- Cartoon đã cắt sẵn, miễn phí: `carrick_cut.png` (MU), `iraola_cut.png` (Liverpool),
  `bruno_arsenal_cut.png` (Arsenal), `rogers_chelsea_cut.png` (Chelsea), `maresca_cut.png` (Man City),
  `tonali_cut.png` (Tottenham)
- ⚠️ `*_cut.png` KHÔNG phải lúc nào cũng là cartoon — `bruno_cut.png`, `rogers_cut.png`,
  `maguire_cut.png`, `haaland_cut.png` là ẢNH CHỤP THẬT. Mở ra nhìn trước khi ghép.

## 9. Bảng dữ liệu

- `fixtures`: id, competition_id, home_team_id, away_team_id, home_team_name, away_team_name,
  kickoff_utc, status, home_score, away_score, minute, matchday, venue, slug, odds_api_event_id,
  livescore_match_id. (KHÔNG có bảng `upcoming_fixtures` / `matches`.)
- `competitions`: EPL = `epl-2026`. ⚠️ Cột `season_start` SAI (ghi 16/8), ngày thật phải lấy từ
  `fixtures` — trận đầu EPL là Arsenal vs Coventry 21/8 19:00 UTC.
- `analysis_articles` (/analysis): slug, kind (preview|recap|roundup), tier, league, byline,
  author_type, title, body (markdown, KHÔNG H1), hero_image, status, published_at. Cache tag `posts`.
- `news_items` (/news): đa ngôn ngữ trên 1 row, headline_{en,vi,th,es} + body_{en,vi,th,es}.
  Cache tag `news`.
- **Tag hợp lệ ở `/api/revalidate` (kiểm bằng lệnh thật 16/8, sau khi merge PR 69):**
  `picks | posts | votes | matches | watching | analysis-articles | news`.
  Secret truyền qua HEADER `x-revalidate-secret`, KHÔNG để trong body.
  → Tin ở `/news` giờ lên NGAY, không còn phải chờ ISR 300s. Máy tin đăng xong phải gọi revalidate
  đúng tag rồi mới verify bản live trong cùng lượt chạy.
  ⚠️ Skill `wp-news-writer` đang ghi 2 chỗ SAI so với thực tế: (a) "tag 'news' KHÔNG nhận được",
  (b) "tag 'analysis-articles' KHÔNG hợp lệ" — cả hai tag đều nằm trong danh sách hợp lệ. Cần sửa skill.
