-- Analysis articles: Desk-authored content (preview/recap/roundup).
-- Separate table from posts — analysis is a distinct content type with its own schema.
CREATE TABLE IF NOT EXISTS analysis_articles (
  slug text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('preview', 'recap', 'roundup')),
  tier text NOT NULL CHECK (tier IN ('T1_covered', 'T2_marquee')),
  title text NOT NULL,
  league text NOT NULL,
  body text NOT NULL,
  byline text NOT NULL DEFAULT 'WildlyPlay Desk',
  author_type text NOT NULL DEFAULT 'desk_ai' CHECK (author_type = 'desk_ai'),
  match_id text,
  linked_pick_id text,
  hero_image text,
  published_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analysis_articles_status ON analysis_articles (status);
CREATE INDEX IF NOT EXISTS idx_analysis_articles_league ON analysis_articles (league);
CREATE INDEX IF NOT EXISTS idx_analysis_articles_published_at ON analysis_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_articles_kind ON analysis_articles (kind);
