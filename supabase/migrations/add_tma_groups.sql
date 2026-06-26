-- gl_groups: Telegram groups that have activated Daily Line
create table if not exists gl_groups (
  id              uuid primary key default gen_random_uuid(),
  tg_group_id     bigint not null unique,
  title           text not null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by_tg   bigint not null
);

-- gl_group_members: link gl_users to groups
create table if not exists gl_group_members (
  group_id        uuid not null references gl_groups(id),
  user_id         uuid not null references gl_users(id),
  joined_at       timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists gl_group_members_user_idx on gl_group_members (user_id);
create index if not exists gl_groups_tg_idx on gl_groups (tg_group_id);

alter table gl_groups enable row level security;
alter table gl_group_members enable row level security;
create policy gl_groups_public_read on gl_groups for select using (true);
create policy gl_group_members_public_read on gl_group_members for select using (true);
