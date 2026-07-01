-- WildlyPlay — core schema v1 (11/6/2026)
-- Trust model: picks are immutable after publish (odds snapshot at publish time).
-- Settlement display rule (Nick, QnA 11/6): half-win shows as WON, half-loss as LOST,
-- push shows as PUSH. Real AH math is kept in raw_outcome + units_pl for transparency.

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type pick_market as enum ('ah', 'ou', '1x2', 'btts', 'other');
create type pick_status as enum ('draft', 'published', 'won', 'lost', 'push', 'void');
create type raw_outcome as enum ('win', 'half_win', 'push', 'half_loss', 'loss', 'void');
create type post_type   as enum ('recap', 'preview', 'news');
create type post_status as enum ('draft', 'published');
create type lang_code   as enum ('en', 'vi', 'th', 'es');
create type vote_kind   as enum ('follow', 'fade', 'skip');

-- ── Picks (the trust object) ─────────────────────────────────────────────────
create table picks (
  id            uuid primary key default gen_random_uuid(),
  fixture_id    bigint not null,                 -- API-Football fixture id
  league        text   not null,
  kickoff_utc   timestamptz not null,
  home_team     text   not null,
  away_team     text   not null,
  market        pick_market not null,
  selection     text   not null,                 -- "Home -0.5", "Over 2.5", "Away win"
  line          numeric(4,2),                    -- AH/OU line; null for 1x2/btts
  odds_publish  numeric(6,3) not null,           -- snapshot at publish — never updated
  stake_units   numeric(4,2) not null default 1,
  thesis        text   not null,                 -- The Curator's reasoning (human input)
  status        pick_status not null default 'draft',
  published_at  timestamptz,
  -- CLV (enhancement batch 12/6): closing odds for the SAME selection+line,
  -- captured by the poller near kickoff. Null = not captured (line gone / manual pick).
  odds_close    numeric(6,3),
  -- Running picks (Nick, 12/6): score when the bet was placed in-play. Null = pre-match.
  -- AH settles on goals scored AFTER this score; OU/1x2/btts settle on the full final score.
  publish_score_home integer,
  publish_score_away integer,
  -- odds-api participant ids for team logos (13/6); null for older picks / manual picks.
  home_id       integer,
  away_id       integer,
  sources       text[],                          -- domains that informed the thesis (1/7)
  -- settlement fields (the only writable fields after publish)
  home_score    int,
  away_score    int,
  raw_outcome   raw_outcome,
  units_pl      numeric(7,2),
  settled_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- migration 12/6 (running picks) — run on the live DB:
-- alter table picks
--   add column publish_score_home integer,
--   add column publish_score_away integer;

-- migration 13/6 (team logos) — run on the live DB:
-- alter table picks
--   add column home_id integer,
--   add column away_id integer;

-- migration 1/7 (source citations) — run on the live DB:
-- alter table picks add column sources text[];

create index picks_kickoff_idx   on picks (kickoff_utc desc);
create index picks_status_idx    on picks (status);
create index picks_fixture_idx   on picks (fixture_id);

-- Immutability: after publish, only settlement fields + status transitions allowed.
create or replace function picks_guard_immutable() returns trigger as $$
begin
  if old.status <> 'draft' then
    if new.fixture_id   is distinct from old.fixture_id
    or new.market       is distinct from old.market
    or new.selection    is distinct from old.selection
    or new.line         is distinct from old.line
    or new.odds_publish is distinct from old.odds_publish
    or new.stake_units  is distinct from old.stake_units
    or new.thesis       is distinct from old.thesis
    or new.published_at is distinct from old.published_at then
      raise exception 'published picks are immutable (id=%)', old.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger picks_immutable before update on picks
  for each row execute function picks_guard_immutable();

create rule picks_no_delete as on delete to picks do instead nothing;

-- ── AI-generated analysis per language ───────────────────────────────────────
create table pick_content (
  id         uuid primary key default gen_random_uuid(),
  pick_id    uuid not null references picks(id),
  lang       lang_code not null,
  title      text not null,
  body_md    text not null,
  model      text,                                -- which model generated it
  created_at timestamptz not null default now(),
  unique (pick_id, lang)
);

-- ── Newsroom (recap = SEO product) ───────────────────────────────────────────
create table posts (
  id           uuid primary key default gen_random_uuid(),
  type         post_type not null,
  slug         text not null,
  lang         lang_code not null,
  title        text not null,
  body_md      text not null,
  pick_ids     uuid[] not null default '{}',
  status       post_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (slug, lang)
);
create index posts_pub_idx on posts (status, published_at desc);

-- ── Distribution audit (web/telegram/x) ──────────────────────────────────────
create table channel_log (
  id          uuid primary key default gen_random_uuid(),
  pick_id     uuid references picks(id),
  post_id     uuid references posts(id),
  channel     text not null check (channel in ('web','telegram','x','facebook')),
  external_id text,
  ok          boolean not null default true,
  detail      text,
  posted_at   timestamptz not null default now()
);

-- ── Crowd poll: Follow / Fade / Skip (decision #5, 11/6: v1 lightweight engagement) ─
-- voter_id is an anonymous uuid from an httpOnly cookie — no accounts in v1.
create table pick_votes (
  id         uuid primary key default gen_random_uuid(),
  pick_id    uuid not null references picks(id),
  vote       vote_kind not null,
  voter_id   uuid not null,
  created_at timestamptz default now(),
  unique (pick_id, voter_id)                       -- one vote per voter; upsert to change it
);
create index pick_votes_pick_idx on pick_votes (pick_id);

-- ── Feature flags (forum off until ~200 daily visitors) ─────────────────────
create table feature_flags (
  key     text primary key,
  enabled boolean not null default false,
  note    text
);
insert into feature_flags (key, enabled, note) values
  ('forum', false, 'enable at ~200 daily visitors (Nick, QnA 11/6)');

-- ── Forum (built day 1, gated by flag) ───────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id),
  handle     text unique not null,
  banned     boolean not null default false,
  created_at timestamptz not null default now()
);

create table forum_threads (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references profiles(id),
  title      text not null,
  body_md    text not null,
  fixture_id bigint,
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

create table forum_comments (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references forum_threads(id),
  author_id  uuid not null references profiles(id),
  body_md    text not null,
  deleted    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Track record (display rule: half counts as full W/L; units show real math) ─
create view track_record as
select
  count(*) filter (where status = 'won')  as wins,
  count(*) filter (where status = 'lost') as losses,
  count(*) filter (where status = 'push') as pushes,
  coalesce(sum(units_pl), 0)              as units_pl,
  count(*) filter (where status in ('won','lost','push')) as settled
from picks
where status in ('won','lost','push');

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table picks          enable row level security;
alter table pick_content   enable row level security;
alter table pick_votes     enable row level security;
alter table posts          enable row level security;
alter table feature_flags  enable row level security;
alter table profiles       enable row level security;
alter table forum_threads  enable row level security;
alter table forum_comments enable row level security;
alter table channel_log    enable row level security;

-- public read: only published material
create policy picks_public_read on picks for select
  using (status <> 'draft');
create policy pick_content_public_read on pick_content for select
  using (exists (select 1 from picks p where p.id = pick_id and p.status <> 'draft'));
-- crowd poll counts are public; NO insert policy — votes go through the web
-- server with the service role, like all other writes (decision #5, 11/6)
create policy pick_votes_public_read on pick_votes for select
  using (exists (select 1 from picks p where p.id = pick_id and p.status <> 'draft'));
create policy posts_public_read on posts for select
  using (status = 'published');
create policy flags_public_read on feature_flags for select using (true);

-- forum: read public, write = authenticated + not banned (app also checks flag)
create policy profiles_public_read on profiles for select using (true);
create policy profiles_self_insert on profiles for insert
  with check (auth.uid() = id);
create policy threads_public_read on forum_threads for select using (true);
create policy threads_auth_insert on forum_threads for insert
  with check (auth.uid() = author_id
              and not exists (select 1 from profiles where id = auth.uid() and banned));
create policy comments_public_read on forum_comments for select using (deleted = false);
create policy comments_auth_insert on forum_comments for insert
  with check (auth.uid() = author_id
              and not exists (select 1 from profiles where id = auth.uid() and banned));

-- ── Watching (Curator teaser: "watching" a match before committing a pick) ────
create table watching (
  id          uuid primary key default gen_random_uuid(),
  home_team   text not null,
  away_team   text not null,
  league      text not null default 'FIFA World Cup 2026',
  kickoff_utc timestamptz not null,
  note        text,                                    -- optional curator hint e.g. "Thiếu Yamal"
  status      text not null default 'active'
    check (status in ('active', 'picked', 'expired')),
  created_at  timestamptz not null default now(),
  pick_id     uuid references picks(id)                -- set when /pick for this match
);

create index watching_status_idx on watching (status);

alter table watching enable row level security;
create policy watching_public_read on watching for select using (true);

-- writes to picks/pick_content/posts/channel_log/watching: service-role only (worker), no policies needed

-- ═══════════════════════════════════════════════════════════════════════════════
-- GoalLine Daily — schema (gl_ prefix avoids conflicts with WildlyPlay tables)
-- ═══════════════════════════════════════════════════════════════════════════════

create type gl_user_type    as enum ('guest', 'claimed');
create type gl_card_status  as enum ('draft', 'scheduled', 'open', 'locked', 'live', 'settled', 'voided');
create type gl_pick_side    as enum ('over', 'under');
create type gl_pick_status  as enum ('locked', 'won', 'lost', 'void');
create type gl_match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'abandoned');

-- ── GoalLine Users ──────────────────────────────────────────────────────────
create table gl_users (
  id                uuid primary key default gen_random_uuid(),
  type              gl_user_type not null default 'guest',
  display_name      text not null,
  discriminator     text not null default substring(gen_random_uuid()::text from 1 for 4),
  device_id         text,
  auth_provider     text check (auth_provider in ('telegram', 'google', 'apple', 'magic_link')),
  auth_ref          text,
  created_at        timestamptz not null default now(),
  current_streak    integer not null default 0,
  best_streak       integer not null default 0,
  total_picks       integer not null default 0,
  total_wins        integer not null default 0
);

create index gl_users_device_idx on gl_users (device_id);

-- ── GoalLine Daily Cards ────────────────────────────────────────────────────
create table gl_daily_cards (
  id                  uuid primary key default gen_random_uuid(),
  card_number         integer not null unique,
  utc_date            date not null,
  goal_line           numeric(4,1) not null,
  over_odds           numeric(6,3) not null,
  under_odds          numeric(6,3) not null,
  cutoff_time_utc     timestamptz not null,
  status              gl_card_status not null default 'draft',
  method_note         text,
  settlement_result   gl_pick_side,
  void_reason         text,
  published_at        timestamptz,
  locked_at           timestamptz,
  settled_at          timestamptz,
  created_at          timestamptz not null default now()
);

create index gl_daily_cards_date_idx   on gl_daily_cards (utc_date);
create index gl_daily_cards_status_idx on gl_daily_cards (status);

-- ── GoalLine Matches ────────────────────────────────────────────────────────
create table gl_matches (
  id                      uuid primary key default gen_random_uuid(),
  external_match_id       text not null,
  home_team               text not null,
  away_team               text not null,
  kickoff_time_utc        timestamptz not null,
  status                  gl_match_status not null default 'scheduled',
  home_score              integer,
  away_score              integer,
  valid_goals             integer,
  is_valid_for_settlement boolean not null default true
);

create index gl_matches_external_idx on gl_matches (external_match_id);

-- ── Junction: Daily Card ↔ Match (exactly 3 per card) ───────────────────────
create table gl_daily_card_matches (
  id              uuid primary key default gen_random_uuid(),
  daily_card_id   uuid not null references gl_daily_cards(id),
  match_id        uuid not null references gl_matches(id),
  sort_order      integer not null default 0,
  unique (daily_card_id, match_id)
);

-- ── GoalLine Picks ──────────────────────────────────────────────────────────
create table gl_picks (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references gl_users(id),
  daily_card_id         uuid not null references gl_daily_cards(id),
  side                  gl_pick_side not null,
  stake_points          integer not null default 100,
  odds_locked           numeric(6,3) not null,
  status                gl_pick_status not null default 'locked',
  server_received_at    timestamptz not null default now(),
  settled_at            timestamptz,
  net_profit            numeric(7,2),
  participation_bonus   integer not null default 5,
  points_added          numeric(7,2),
  unique (user_id, daily_card_id)                    -- 1 pick per user per card
);

create index gl_picks_card_idx on gl_picks (daily_card_id);
create index gl_picks_user_idx on gl_picks (user_id);

-- ── Weekly Leaderboard (materialized view or table, reset Mon-Sun) ──────────
create table gl_weekly_leaderboard (
  user_id              uuid not null references gl_users(id),
  week_start_utc       date not null,
  week_end_utc         date not null,
  score                numeric(9,2) not null default 0,
  winning_days         integer not null default 0,
  participation_days   integer not null default 0,
  current_streak       integer not null default 0,
  rank                 integer,
  primary key (user_id, week_start_utc)
);

-- ── Admin Audit Log ─────────────────────────────────────────────────────────
create table gl_admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   text not null,
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  old_value       jsonb,
  new_value       jsonb,
  created_at      timestamptz not null default now()
);

-- ── GoalLine RLS ────────────────────────────────────────────────────────────
alter table gl_users               enable row level security;
alter table gl_daily_cards         enable row level security;
alter table gl_matches             enable row level security;
alter table gl_daily_card_matches  enable row level security;
alter table gl_picks               enable row level security;
alter table gl_weekly_leaderboard  enable row level security;
alter table gl_admin_audit_log     enable row level security;

-- Anon read: cards (non-draft), matches, leaderboard
create policy gl_cards_public_read on gl_daily_cards for select
  using (status <> 'draft');
create policy gl_matches_public_read on gl_matches for select
  using (true);
create policy gl_card_matches_public_read on gl_daily_card_matches for select
  using (exists (
    select 1 from gl_daily_cards c
    where c.id = daily_card_id and c.status <> 'draft'
  ));
create policy gl_leaderboard_public_read on gl_weekly_leaderboard for select
  using (true);

-- Picks: users can read their own; service-role handles writes
create policy gl_picks_own_read on gl_picks for select
  using (true);

-- Users: read own profile
create policy gl_users_public_read on gl_users for select
  using (true);

-- Audit log: no public read (admin-only via service role)
