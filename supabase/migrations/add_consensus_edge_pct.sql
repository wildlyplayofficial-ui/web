-- Signed consensus pricing figure (negative = disadvantage vs market, positive = edge).
-- Lets the analysis-article generator state pricing polarity from structured data
-- instead of paraphrasing free-text thesis (root cause of a live polarity-inversion bug, 3/7).
ALTER TABLE picks ADD COLUMN IF NOT EXISTS consensus_edge_pct numeric;
