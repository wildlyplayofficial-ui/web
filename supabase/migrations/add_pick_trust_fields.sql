-- Trust-data fields (§12 T1/T3/T4/T8/T9): pre-registered confidence + Primary Edge /
-- Supporting Evidence taxonomy + post-mortem loss-type + sub-dimension calibration tags.
--
-- These columns already exist in PRODUCTION (added directly to the DB; no migration was
-- ever committed) but were MISSING from the repo. A fresh DB provisioned from
-- schema.sql + migrations would lack them, and every insertPick would fail because
-- NewPick = Omit<PickRow,'id'> sends all of these fields (store.ts). This migration
-- back-fills the missing DDL so the repo reproduces prod.
--
-- Idempotent + nullable, matching prod exactly (all text / text[], no enum type,
-- no NOT NULL, no default). Discovered during the doc-refresh audit, 21/7/2026.

alter table picks add column if not exists confidence          text;
alter table picks add column if not exists primary_edge        text;
alter table picks add column if not exists supporting_evidence text[];
alter table picks add column if not exists loss_type           text;
alter table picks add column if not exists market_side         text;
alter table picks add column if not exists favored_dog         text;
