/**
 * Analysis article API — Desk-authored content ingest.
 * Mirrors the pattern of api-routes.ts but uses a dedicated Supabase table
 * (analysis_articles) instead of the posts table.
 *
 * Auth: REVALIDATE_SECRET via x-webhook-secret header (same as other endpoints).
 * Server-enforced: author_type is always 'desk_ai' — client value ignored.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

// ── Types ──

const VALID_KINDS = ['preview', 'recap', 'roundup'] as const;
type AnalysisKind = typeof VALID_KINDS[number];

const VALID_TIERS = ['T1_covered', 'T2_marquee'] as const;
type AnalysisTier = typeof VALID_TIERS[number];

const VALID_STATUSES = ['draft', 'published'] as const;
type AnalysisStatus = typeof VALID_STATUSES[number];

export interface AnalysisArticle {
  slug: string;
  kind: AnalysisKind;
  tier: AnalysisTier;
  title: string;
  league: string;
  body: string;
  byline: string;
  author_type: 'desk_ai';
  match_id: string | null;
  linked_pick_id: string | null;
  hero_image: string | null;
  published_at: string;
  status: AnalysisStatus;
  created_at: string;
  updated_at: string;
}

export interface AnalysisApiDeps {
  db: SupabaseClient;
  revalidate: (tags: string[]) => Promise<void>;
}

type Json = Record<string, unknown>;

function json(res: ServerResponse, status: number, body: Json) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// ── Validation ──

interface ValidatedPayload {
  slug: string;
  kind: AnalysisKind;
  tier: AnalysisTier;
  title: string;
  league: string;
  body: string;
  byline: string;
  match_id: string | null;
  linked_pick_id: string | null;
  hero_image: string | null;
  published_at: string;
  status: AnalysisStatus;
}

function validatePayload(payload: Json): { ok: true; data: ValidatedPayload } | { ok: false; error: string } {
  const errors: string[] = [];

  const slug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
  if (!slug) errors.push('slug required');

  const kind = payload.kind as string;
  if (!VALID_KINDS.includes(kind as AnalysisKind)) errors.push(`kind must be one of: ${VALID_KINDS.join(', ')}`);

  const tier = payload.tier as string;
  if (!VALID_TIERS.includes(tier as AnalysisTier)) errors.push(`tier must be one of: ${VALID_TIERS.join(', ')}`);

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) errors.push('title required');

  const league = typeof payload.league === 'string' ? payload.league.trim() : '';
  if (!league) errors.push('league required');

  const body = typeof payload.body === 'string' ? payload.body : '';
  if (!body) errors.push('body required');

  const status = (payload.status as string) ?? 'draft';
  if (!VALID_STATUSES.includes(status as AnalysisStatus)) errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);

  if (errors.length > 0) return { ok: false, error: errors.join('; ') };

  return {
    ok: true,
    data: {
      slug,
      kind: kind as AnalysisKind,
      tier: tier as AnalysisTier,
      title,
      league,
      body,
      byline: typeof payload.byline === 'string' ? payload.byline.trim() : 'WildlyPlay Desk',
      match_id: typeof payload.match_id === 'string' ? payload.match_id : null,
      linked_pick_id: typeof payload.linked_pick_id === 'string' ? payload.linked_pick_id : null,
      hero_image: typeof payload.hero_image === 'string' ? payload.hero_image : null,
      published_at: typeof payload.published_at === 'string' ? payload.published_at : new Date().toISOString(),
      status: status as AnalysisStatus,
    },
  };
}

// ── Route handler ──

export async function handleAnalysisRoute(
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
  deps: AnalysisApiDeps,
): Promise<boolean> {
  const url = req.url ?? '';
  const method = req.method ?? '';

  // POST /api/analysis — create
  if (url === '/api/analysis' && method === 'POST') {
    let payload: Json;
    try { payload = JSON.parse(body); } catch {
      json(res, 400, { ok: false, error: 'invalid JSON' });
      return true;
    }
    const validation = validatePayload(payload);
    if (!validation.ok) {
      json(res, 422, { ok: false, error: validation.error });
      return true;
    }
    if (!/^[a-z0-9-]+$/.test(validation.data.slug)) {
      json(res, 400, { ok: false, error: 'slug must match /^[a-z0-9-]+$/' });
      return true;
    }
    const row = {
      ...validation.data,
      author_type: 'desk_ai' as const, // server-enforced — ignore client value
      updated_at: new Date().toISOString(),
    };
    try {
      const { data, error } = await deps.db
        .from('analysis_articles')
        .insert(row)
        .select()
        .single();
      if (error) throw new Error(error.message);
      log.info(`analysis-api: created "${row.slug}" (${row.kind}/${row.tier})`);
      void deps.revalidate(['analysis-articles']);
      json(res, 201, { ok: true, slug: data.slug, status: data.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Duplicate slug → 409
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
        json(res, 409, { ok: false, error: `slug "${row.slug}" already exists` });
      } else {
        log.warn(`analysis-api POST failed: ${msg}`);
        json(res, 500, { ok: false, error: msg });
      }
    }
    return true;
  }

  // Slug-based routes: /api/analysis/:slug
  const slugMatch = url.match(/^\/api\/analysis\/([a-z0-9][a-z0-9-]*)$/);
  if (!slugMatch) return false;
  const slug = slugMatch[1];

  // PUT /api/analysis/:slug — edit
  if (method === 'PUT') {
    let payload: Json;
    try { payload = JSON.parse(body); } catch {
      json(res, 400, { ok: false, error: 'invalid JSON' });
      return true;
    }

    // Build patch from allowed fields only
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof payload.title === 'string') patch.title = payload.title.trim();
    if (typeof payload.body === 'string') patch.body = payload.body;
    if (typeof payload.league === 'string') patch.league = payload.league.trim();
    if (typeof payload.byline === 'string') patch.byline = payload.byline.trim();
    if (typeof payload.match_id === 'string') patch.match_id = payload.match_id;
    if (typeof payload.linked_pick_id === 'string') patch.linked_pick_id = payload.linked_pick_id;
    if (typeof payload.hero_image === 'string') patch.hero_image = payload.hero_image;
    if (typeof payload.published_at === 'string') patch.published_at = payload.published_at;
    if (payload.match_id === null) patch.match_id = null;
    if (payload.linked_pick_id === null) patch.linked_pick_id = null;
    if (payload.hero_image === null) patch.hero_image = null;

    if (typeof payload.kind === 'string') {
      if (!VALID_KINDS.includes(payload.kind as AnalysisKind)) {
        json(res, 422, { ok: false, error: `kind must be one of: ${VALID_KINDS.join(', ')}` });
        return true;
      }
      patch.kind = payload.kind;
    }
    if (typeof payload.tier === 'string') {
      if (!VALID_TIERS.includes(payload.tier as AnalysisTier)) {
        json(res, 422, { ok: false, error: `tier must be one of: ${VALID_TIERS.join(', ')}` });
        return true;
      }
      patch.tier = payload.tier;
    }
    if (typeof payload.status === 'string') {
      if (!VALID_STATUSES.includes(payload.status as AnalysisStatus)) {
        json(res, 422, { ok: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
        return true;
      }
      patch.status = payload.status;
    }

    // author_type is NEVER accepted from client
    try {
      const { data, error } = await deps.db
        .from('analysis_articles')
        .update(patch)
        .eq('slug', slug)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        json(res, 404, { ok: false, error: 'article not found' });
        return true;
      }
      log.info(`analysis-api: updated "${slug}"`);
      void deps.revalidate(['analysis-articles']);
      json(res, 200, { ok: true, slug: data.slug, status: data.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`analysis-api PUT failed: ${msg}`);
      json(res, 500, { ok: false, error: msg });
    }
    return true;
  }

  // DELETE /api/analysis/:slug — retract/unpublish
  if (method === 'DELETE') {
    try {
      const { data, error } = await deps.db
        .from('analysis_articles')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('slug', slug)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        json(res, 404, { ok: false, error: 'article not found' });
        return true;
      }
      log.info(`analysis-api: retracted "${slug}"`);
      void deps.revalidate(['analysis-articles']);
      json(res, 200, { ok: true, slug: data.slug, status: 'draft' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`analysis-api DELETE failed: ${msg}`);
      json(res, 500, { ok: false, error: msg });
    }
    return true;
  }

  // GET /api/analysis/:slug — read single article (verification)
  if (method === 'GET') {
    try {
      const { data, error } = await deps.db
        .from('analysis_articles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        json(res, 404, { ok: false, error: 'article not found' });
        return true;
      }
      json(res, 200, { ok: true, article: data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`analysis-api GET failed: ${msg}`);
      json(res, 500, { ok: false, error: msg });
    }
    return true;
  }

  return false;
}
