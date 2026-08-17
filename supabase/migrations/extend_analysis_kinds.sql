-- Nick 17/8: "Tag phải đúng thể loại." Season previews (Nhận định Tottenham
-- 2026/27...) are 'analysis', transfer stories (João Pedro) are 'news' —
-- neither fits the original preview/recap/roundup set, and the CHECK below
-- blocked relabeling them.
-- Verify after applying: UPDATE one article to kind='analysis' — if it still
-- errors, the original constraint carries a different auto-generated name;
-- look it up with \d analysis_articles and drop that one.
ALTER TABLE analysis_articles DROP CONSTRAINT IF EXISTS analysis_articles_kind_check;
ALTER TABLE analysis_articles ADD CONSTRAINT analysis_articles_kind_check
  CHECK (kind IN ('preview', 'recap', 'roundup', 'analysis', 'news'));
