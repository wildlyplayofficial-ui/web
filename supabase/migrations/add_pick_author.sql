-- Tiered Picks (§12, spec locked 3/7): author-separation firewall, Group A item 1.
-- `author` is the ONLY field the client sets; author_type disclosure is always
-- server-derived from it (see store.ts authorTypeOf) — never accepted from the client.
-- Safe default 'curator' preserves 100% backward-compatible behavior for existing rows.

alter table picks    add column if not exists author text not null default 'curator' check (author in ('curator', 'scout'));
alter table watching add column if not exists author text not null default 'curator' check (author in ('curator', 'scout'));
alter table posts    add column if not exists author text not null default 'curator' check (author in ('curator', 'scout'));

create index if not exists picks_author_idx on picks (author);

-- Immutability: `author` joins the guarded fields — a pick's author can never be
-- reassigned after publish (strongest enforcement of the firewall, at the DB layer).
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
    or new.published_at is distinct from old.published_at
    or new.author       is distinct from old.author then
      raise exception 'published picks are immutable (id=%)', old.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
