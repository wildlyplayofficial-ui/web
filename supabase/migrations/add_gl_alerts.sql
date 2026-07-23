-- D7 (§9): Daily Line Telegram alerts — opt-in flag + dedup table.
-- Idempotent: all IF NOT EXISTS.

alter table gl_users add column if not exists tg_alerts boolean not null default true;

create table if not exists gl_alerts_sent (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references gl_daily_cards(id),
  user_id     uuid not null references gl_users(id),
  kind        text not null check (kind in ('card_live', 'nudge', 'settled')),
  sent_at     timestamptz not null default now(),
  unique (card_id, user_id, kind)
);

create index if not exists gl_alerts_sent_card_idx on gl_alerts_sent (card_id);
