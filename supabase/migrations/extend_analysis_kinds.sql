-- Nick 17/8: "Tag phải đúng thể loại." Season previews (Nhận định Tottenham
-- 2026/27...) are 'analysis', transfer stories (João Pedro) are 'news' —
-- neither fits the original preview/recap/roundup set, and the CHECK below
-- blocked relabeling them.
-- Constraint name CONFIRMED live (Jane, 17/8): a test relabel was rejected
-- citing analysis_articles_kind_check — the DROP below hits the right name.
-- Drop-and-rebuild on purpose: the guard stays, only the allowed set grows.
-- Verify after applying: relabel ONE article to 'analysis' before batch-running.
ALTER TABLE analysis_articles DROP CONSTRAINT IF EXISTS analysis_articles_kind_check;
ALTER TABLE analysis_articles ADD CONSTRAINT analysis_articles_kind_check
  CHECK (kind IN ('preview', 'recap', 'roundup', 'analysis', 'news'));
