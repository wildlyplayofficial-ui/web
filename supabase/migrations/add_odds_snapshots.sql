-- Bảng lưu KÈO theo thời gian (banhbong, 23/8/2026)
-- Mục đích: hiện kèo hiện tại + kèo đã chạy thế nào từ lúc mở tới giờ bóng lăn.
-- Nguồn: odds-api.io, bookmaker Bet365 (gói free đủ dùng — Nick xác nhận).
-- Tần suất ghi: 3 tiếng/lần (Nick chốt). Kèo quá khứ KHÔNG mua lại được nên
-- bảng này chỉ dày lên theo thời gian, bật càng sớm càng tốt.

create table if not exists odds_snapshots (
  id            bigserial primary key,
  event_id      bigint      not null,              -- id trận bên odds-api
  fixture_id    uuid        references fixtures(id) on delete set null,
  competition_id text,
  home_team     text        not null,
  away_team     text        not null,
  kickoff_utc   timestamptz not null,
  bookmaker     text        not null default 'Bet365',
  market        text        not null,              -- ML | Spread | Totals | European Handicap
                                                   -- + bản hiệp 1: ML HT | Spread HT | Totals HT
  hdp           numeric,                           -- mức chấp / mức tài xỉu (null với ML)
  home_odds     numeric,
  draw_odds     numeric,
  away_odds     numeric,
  over_odds     numeric,
  under_odds    numeric,
  captured_at   timestamptz not null default now(),
  source_updated_at timestamptz                    -- giờ nhà cái đổi kèo (API trả)
);

-- Một mốc thời gian chỉ ghi 1 dòng cho mỗi (trận, nhà cái, loại kèo, mức chấp):
-- job chạy lại/chồng nhau cũng không đẻ dữ liệu rác.
create unique index if not exists odds_snapshots_uniq
  on odds_snapshots (event_id, bookmaker, market, coalesce(hdp, -999), captured_at);

-- Truy vấn chính của trang kèo: lấy theo trận, sắp theo thời gian.
create index if not exists odds_snapshots_event_time
  on odds_snapshots (event_id, captured_at desc);

-- Trang danh sách: các trận sắp đá có kèo.
create index if not exists odds_snapshots_kickoff
  on odds_snapshots (kickoff_utc desc);

alter table odds_snapshots enable row level security;

-- Đọc công khai (trang kèo là nội dung công khai); ghi chỉ qua service role của worker.
drop policy if exists odds_snapshots_public_read on odds_snapshots;
create policy odds_snapshots_public_read on odds_snapshots for select using (true);
