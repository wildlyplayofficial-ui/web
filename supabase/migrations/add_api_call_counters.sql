-- Daily API call counters (livescore-api.com quota tracking).
-- day is UTC (current_date at UTC), matching livescore-api's quota reset.
create table if not exists api_call_counters (
  day date not null,
  source text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, source)
);

alter table api_call_counters enable row level security;

create or replace function increment_api_calls(p_source text, p_n integer default 1)
returns void
language sql
security definer
set search_path = public
as $$
  insert into api_call_counters (day, source, count)
  select current_date, p_source, p_n
  where p_n > 0
  on conflict (day, source)
  do update set count = api_call_counters.count + p_n, updated_at = now();
$$;

-- security definer bypasses RLS — only the service role may call this.
revoke execute on function increment_api_calls(text, integer) from public, anon, authenticated;
grant execute on function increment_api_calls(text, integer) to service_role;
