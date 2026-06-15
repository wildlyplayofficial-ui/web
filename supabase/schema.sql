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

-- writes to picks/pick_content/posts/channel_log: service-role only (worker), no policies needed
