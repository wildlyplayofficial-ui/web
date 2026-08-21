-- Hub theo đội (/doi/[slug]): gắn nhãn đội cho bài để lọc.
-- 1 bài nhiều đội (tin chuyển nhượng dính 2 đội) → text[]. GIN index cho truy vấn mảng ở quy mô pSEO.
alter table if exists news_items add column if not exists teams text[] not null default '{}';
alter table if exists analysis_articles add column if not exists teams text[] not null default '{}';

create index if not exists news_items_teams_gin on news_items using gin (teams);
create index if not exists analysis_articles_teams_gin on analysis_articles using gin (teams);
