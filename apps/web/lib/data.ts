import { unstable_cache } from "next/cache";
import eplSeason from "./data/epl-2026-27-season.json";
import laligaSeason from "./data/laliga-2026-27-season.json";
import serieaSeason from "./data/seriea-2026-27-season.json";
import bundesligaSeason from "./data/bundesliga-2026-27-season.json";
import ligue1Season from "./data/ligue1-2026-27-season.json";
import { getSupabase } from "./supabase";
import { viPersona, viPersonaFields } from "./persona";
import { mockFlags, mockPicks, mockPosts, mockVoteCounts } from "./mock";
import type { Lang } from "./i18n";
import type { MatchData, Pick, Post, TrackRecord, VoteCounts, VoteKind, WatchingRow } from "./types";

/**
 * Data layer. Every function queries Supabase when configured and falls back
 * to typed mock data when NEXT_PUBLIC_SUPABASE_* env vars are missing
 * (the Supabase project does not exist yet).
 */

const SETTLED = ["won", "lost", "push"] as const;

function utcDayRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Picks published within last 24h, any non-settled status. Zero results is normal (decision #11). */
async function getTodaysPicksImpl(): Promise<Pick[]> {
  // Nick 15/6: filter by published_at (not kickoff_utc) so picks appear on Board immediately after posting
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(start.getUTCHours() - 24); // picks posted in last 24h
  const startIso = start.toISOString();
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks
      .filter((p) => (p.published_at ?? "") >= startIso && p.status === "published")
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  }
  // Nick 14/6: hide settled picks from Board (they belong in Archive), newest first
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .gte("published_at", startIso)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getTodaysPicks: ${error.message}`);
  return (data ?? []) as Pick[];
}

export const getTodaysPicks = unstable_cache(getTodaysPicksImpl, ["todays-picks"], {
  revalidate: 300,
  tags: ["picks"],
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build an SEO-friendly slug for a pick: home-vs-away-selection-date (Nick 17/6).
 *  Date suffix prevents collision when same teams meet again in a different round. */
export function buildPlaySlug(pick: Pick): string {
  const date = pick.kickoff_utc.slice(0, 10);
  const homeSl = slugify(pick.home_team);
  const awaySl = slugify(pick.away_team);
  let selSl = slugify(pick.selection);
  // Avoid duplicating team name in slug (e.g. "bosnia-vs-X-bosnia" → "bosnia-vs-X-home")
  if (selSl === homeSl) selSl = "home";
  else if (selSl === awaySl) selSl = "away";
  return `${homeSl}-vs-${awaySl}-${selSl}-${date}`;
}

/** Look up a pick by its SEO slug. Returns the first match (slugs should be unique per match+selection). */
async function getPickBySlugImpl(slug: string): Promise<Pick | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks.find((p) => buildPlaySlug(p) === slug && (p.status as string) !== "draft") ?? null;
  }
  // Can't query by computed slug in Supabase — fetch all non-draft and match client-side.
  // This is acceptable because picks table is small (<100 rows during WC).
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .neq("status", "draft")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getPickBySlug: ${error.message}`);
  return (data as Pick[])?.find((p) => buildPlaySlug(p) === slug) ?? null;
}

export const getPickBySlug = unstable_cache(getPickBySlugImpl, ["pick-by-slug"], {
  revalidate: 300,
  tags: ["picks"],
});

/** Single pick by id for the play detail page (decisions #1, #3: full transparency).
 *  RLS already hides drafts; the mock path filters them too for parity. */
async function getPickImpl(id: string): Promise<Pick | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks.find((p) => p.id === id && (p.status as string) !== "draft") ?? null;
  }
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .eq("id", id)
    .neq("status", "draft")
    .maybeSingle();
  if (error) throw new Error(`getPick: ${error.message}`);
  return (data as Pick) ?? null;
}

export const getPick = unstable_cache(getPickImpl, ["pick"], {
  revalidate: 300,
  tags: ["picks"],
});

/** Settled picks (won/lost/push), newest first. Optional `month` filter: "YYYY-MM". */
async function getSettledPicksImpl(month?: string): Promise<Pick[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks
      .filter((p) => (SETTLED as readonly string[]).includes(p.status))
      .filter((p) => !month || p.kickoff_utc.startsWith(month))
      .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc));
  }
  let query = supabase
    .from("picks")
    .select("*")
    .in("status", [...SETTLED])
    .order("kickoff_utc", { ascending: false });
  if (month) {
    const start = `${month}-01T00:00:00Z`;
    const [y, m] = month.split("-").map(Number);
    const next = new Date(Date.UTC(y, m, 1)).toISOString();
    query = query.gte("kickoff_utc", start).lt("kickoff_utc", next);
  }
  const { data, error } = await query;
  if (error) throw new Error(`getSettledPicks: ${error.message}`);
  return (data ?? []) as Pick[];
}

export const getSettledPicks = unstable_cache(getSettledPicksImpl, ["settled-picks"], {
  revalidate: 900,
  tags: ["picks"],
});

/** W-L-P + real units P/L (mirrors the `track_record` view). */
async function getTrackRecordImpl(): Promise<TrackRecord> {
  const supabase = getSupabase();
  if (!supabase) {
    const settled = mockPicks.filter((p) => (SETTLED as readonly string[]).includes(p.status));
    return {
      wins: settled.filter((p) => p.status === "won").length,
      losses: settled.filter((p) => p.status === "lost").length,
      pushes: settled.filter((p) => p.status === "push").length,
      units_pl: Math.round(settled.reduce((sum, p) => sum + (p.units_pl ?? 0), 0) * 100) / 100,
      settled: settled.length,
    };
  }
  const { data, error } = await supabase.from("track_record").select("*").single();
  if (error) throw new Error(`getTrackRecord: ${error.message}`);
  return data as TrackRecord;
}

export const getTrackRecord = unstable_cache(getTrackRecordImpl, ["track-record"], {
  revalidate: 900,
  tags: ["picks"],
});

/** Track record filtered by author (Bug B: Scout OG card must not show Curator record). */
async function getTrackRecordForAuthorImpl(author: string): Promise<TrackRecord> {
  const supabase = getSupabase();
  if (!supabase) {
    const settled = mockPicks
      .filter((p) => (p.author ?? "curator") === author)
      .filter((p) => (SETTLED as readonly string[]).includes(p.status));
    return {
      wins: settled.filter((p) => p.status === "won").length,
      losses: settled.filter((p) => p.status === "lost").length,
      pushes: settled.filter((p) => p.status === "push").length,
      units_pl: Math.round(settled.reduce((sum, p) => sum + (p.units_pl ?? 0), 0) * 100) / 100,
      settled: settled.length,
    };
  }
  const { data, error } = await supabase
    .from("picks")
    .select("status, units_pl")
    .eq("author", author)
    .in("status", [...SETTLED]);
  if (error) throw new Error(`getTrackRecordForAuthor: ${error.message}`);
  const rows = (data ?? []) as { status: string; units_pl: number | null }[];
  return {
    wins: rows.filter((r) => r.status === "won").length,
    losses: rows.filter((r) => r.status === "lost").length,
    pushes: rows.filter((r) => r.status === "push").length,
    units_pl: Math.round(rows.reduce((sum, r) => sum + (r.units_pl ?? 0), 0) * 100) / 100,
    settled: rows.length,
  };
}

export const getTrackRecordForAuthor = unstable_cache(
  getTrackRecordForAuthorImpl,
  ["track-record-author"],
  { revalidate: 900, tags: ["picks"] },
);

/** Single pick by id — used by the news OG card to resolve teams/odds from post.pick_ids. */
async function getPickByIdImpl(id: string): Promise<Pick | null> {
  const supabase = getSupabase();
  if (!supabase) return mockPicks.find((p) => p.id === id) ?? null;
  const { data, error } = await supabase.from("picks").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getPickById: ${error.message}`);
  return (data as Pick) ?? null;
}

export const getPickById = unstable_cache(getPickByIdImpl, ["pick-by-id"], {
  revalidate: 300,
  tags: ["picks"],
});

/** Các trường chữ của bài có thể dính tên nhân vật cũ. */
const POST_TEXT_FIELDS = ["title", "body_md", "meta_title", "meta_description"] as const;

/** Published posts for a language, newest first. Falls back to EN when a VI version is missing. */
async function getPostsImpl(lang: Lang): Promise<Post[]> {
  const supabase = getSupabase();
  let all: Post[];
  if (!supabase) {
    all = mockPosts;
  } else {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .in("lang", ["en", lang])
      .order("published_at", { ascending: false });
    if (error) throw new Error(`getPosts: ${error.message}`);
    all = (data ?? []) as Post[];
  }
  // Nick 15/6: hide preview posts from /news listing — previews live on /play + social only
  const bySlug = new Map<string, Post>();
  for (const post of all.filter((p) => p.status === "published" && p.type !== "preview" && p.type !== "guide")) {
    const existing = bySlug.get(post.slug);
    if (!existing || (post.lang === lang && existing.lang !== lang)) {
      if (post.lang === lang || post.lang === "en") bySlug.set(post.slug, post);
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    // Tên nhân vật cũ còn nằm trong bài máy sinh — đổi lúc đọc (xem persona.ts).
    .map((p) => viPersonaFields(p, POST_TEXT_FIELDS));
}

export const getPosts = unstable_cache(getPostsImpl, ["posts"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Single published post by slug; prefers `lang`, falls back to EN. */
async function getPostImpl(slug: string, lang: Lang): Promise<Post | null> {
  const supabase = getSupabase();
  let candidates: Post[];
  if (!supabase) {
    candidates = mockPosts.filter((p) => p.slug === slug);
  } else {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published");
    if (error) throw new Error(`getPost: ${error.message}`);
    candidates = (data ?? []) as Post[];
  }
  const found = candidates.find((p) => p.lang === lang) ?? candidates.find((p) => p.lang === "en") ?? null;
  return found ? viPersonaFields(found, POST_TEXT_FIELDS) : null;
}

export const getPost = unstable_cache(getPostImpl, ["post"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Available languages for a post slug (M4: hreflang). */
async function getPostLangsImpl(slug: string): Promise<Lang[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPosts.filter((p) => p.slug === slug).map((p) => p.lang as Lang);
  }
  const { data, error } = await supabase
    .from("posts")
    .select("lang")
    .eq("slug", slug)
    .eq("status", "published");
  if (error) throw new Error(`getPostLangs: ${error.message}`);
  return (data ?? []).map((r) => r.lang as Lang);
}

export const getPostLangs = unstable_cache(getPostLangsImpl, ["post-langs"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Transparency report slugs follow the pattern "month-year" (e.g., "june-2026"). */
export const REPORT_SLUG_RE = /^(january|february|march|april|may|june|july|august|september|october|november|december)-\d{4}$/;

/** Published posts of one type for a language, newest first. Excludes transparency reports.
 *  Dùng chung cho /guides và /blog — hai mục khác nhau ở đúng giá trị `type`. */
async function getPostsOfTypeImpl(lang: Lang, loai: "guide" | "blog"): Promise<Post[]> {
  const supabase = getSupabase();
  let all: Post[];
  if (!supabase) {
    all = mockPosts;
  } else {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("type", loai)
      .in("lang", ["en", lang])
      .order("published_at", { ascending: false });
    if (error) throw new Error(`getPostsOfType(${loai}): ${error.message}`);
    all = (data ?? []) as Post[];
  }
  const bySlug = new Map<string, Post>();
  for (const post of all.filter((p) => p.status === "published" && p.type === loai && !REPORT_SLUG_RE.test(p.slug))) {
    const existing = bySlug.get(post.slug);
    if (!existing || (post.lang === lang && existing.lang !== lang)) {
      if (post.lang === lang || post.lang === "en") bySlug.set(post.slug, post);
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    // Tên nhân vật cũ còn nằm trong bài máy sinh — đổi lúc đọc (xem persona.ts).
    .map((p) => viPersonaFields(p, POST_TEXT_FIELDS));
}

export const getGuides = unstable_cache((lang: Lang) => getPostsOfTypeImpl(lang, "guide"), ["guides"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Bài Blog — bóng đá nói chung, KHÔNG dạy cá cược. Tách khỏi /guides vì 6 bài
 *  hướng dẫn đang bị cố ý ẩn khỏi Google (Nick+Peter 28/7) và cả mục đó không
 *  đem lên fanpage được (trang bị chặn tuổi). Blog thì index và đăng thoải mái. */
export const getBlogs = unstable_cache((lang: Lang) => getPostsOfTypeImpl(lang, "blog"), ["blogs"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Newest published recap posts (worker auto-recaps live in `posts`, not
 *  `analysis_articles`) — for the homepage "recent recaps" block (Nick 22/8).
 *  Same lang-preference/dedup dance as getGuides. */
async function getRecentRecapPostsImpl(lang: Lang, limit: number): Promise<Post[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("type", "recap")
    .in("lang", ["en", lang])
    .order("published_at", { ascending: false })
    .limit(limit * 8); // headroom: rows are per-language duplicates of each slug
  if (error) throw new Error(`getRecentRecapPosts: ${error.message}`);
  const bySlug = new Map<string, Post>();
  for (const post of (data ?? []) as Post[]) {
    const existing = bySlug.get(post.slug);
    if (!existing || (post.lang === lang && existing.lang !== lang)) {
      if (post.lang === lang || post.lang === "en") bySlug.set(post.slug, post);
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, limit);
}

export const getRecentRecapPosts = unstable_cache(getRecentRecapPostsImpl, ["recent-recaps"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Published transparency reports for a language, newest first. */
async function getReportsImpl(lang: Lang): Promise<Post[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("type", "guide")
    .in("lang", ["en", lang])
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getReports: ${error.message}`);
  const all = (data ?? []) as Post[];
  const bySlug = new Map<string, Post>();
  for (const post of all.filter((p) => REPORT_SLUG_RE.test(p.slug))) {
    const existing = bySlug.get(post.slug);
    if (!existing || (post.lang === lang && existing.lang !== lang)) {
      if (post.lang === lang || post.lang === "en") bySlug.set(post.slug, post);
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    // Tên nhân vật cũ còn nằm trong bài máy sinh — đổi lúc đọc (xem persona.ts).
    .map((p) => viPersonaFields(p, POST_TEXT_FIELDS));
}

export const getReports = unstable_cache(getReportsImpl, ["reports"], {
  revalidate: 300,
  tags: ["posts"],
});

/** All published guide slugs for sitemap. */
async function getAllGuideSlugsImpl(): Promise<{ slug: string; updated: string; title: string }[]> {
  const supabase = getSupabase();
  if (!supabase) {
    const seen = new Set<string>();
    return mockPosts.filter((p) => {
      if (p.type !== "guide" || seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    }).map((p) => ({ slug: p.slug, updated: p.published_at ?? new Date().toISOString(), title: p.title }));
  }
  // KHÔNG lọc theo lang. Bảng `posts` giữ mỗi ngôn ngữ một hàng cho cùng một slug,
  // nên trước đây lọc lang="en" để lấy mỗi slug đúng một lần. Nhưng bài viết THẲNG
  // bằng tiếng Việt (vd tai-xiu-la-gi-cach-doc-keo-over-under) KHÔNG có hàng en, nên
  // không bao giờ lọt vào sitemap — trang tiếng Việt mà cửa vào sitemap khoá theo
  // tiếng Anh. Giờ lấy hết rồi tự gộp trùng theo slug, giữ hàng mới nhất.
  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at, title, lang")
    .eq("status", "published")
    .eq("type", "guide")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getAllGuideSlugs: ${error.message}`);
  const theoSlug = new Map<string, { slug: string; updated: string; title: string }>();
  for (const r of data ?? []) {
    if (REPORT_SLUG_RE.test(r.slug)) continue;
    const cu2 = theoSlug.get(r.slug);
    // ưu tiên hàng tiếng Việt cho tiêu đề, vì sitemap khai bản vi
    if (!cu2 || r.lang === "vi") {
      theoSlug.set(r.slug, { slug: r.slug, updated: r.published_at ?? new Date().toISOString(), title: r.title });
    }
  }
  return [...theoSlug.values()];
}

/** Slug bài Blog cho sitemap. Cùng cách gộp trùng như guide: KHÔNG lọc theo lang,
 *  vì bài viết thẳng bằng tiếng Việt không có hàng `en`. */
async function getAllBlogSlugsImpl(): Promise<{ slug: string; updated: string; title: string }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at, title, lang")
    .eq("status", "published")
    .eq("type", "blog")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getAllBlogSlugs: ${error.message}`);
  const theoSlug = new Map<string, { slug: string; updated: string; title: string }>();
  for (const r of data ?? []) {
    const cu = theoSlug.get(r.slug);
    if (!cu || r.lang === "vi") {
      theoSlug.set(r.slug, { slug: r.slug, updated: r.published_at ?? new Date().toISOString(), title: r.title });
    }
  }
  return [...theoSlug.values()];
}

export const getAllBlogSlugs = unstable_cache(getAllBlogSlugsImpl, ["blog-slugs"], {
  revalidate: 3600,
  tags: ["posts"],
});

export const getAllGuideSlugs = unstable_cache(getAllGuideSlugsImpl, ["guide-slugs"], {
  revalidate: 3600,
  tags: ["posts"],
});

/** All published transparency report slugs for sitemap. */
async function getAllReportSlugsImpl(): Promise<{ slug: string; updated: string }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at")
    .eq("status", "published")
    .eq("type", "guide")
    .eq("lang", "en")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getAllReportSlugs: ${error.message}`);
  return (data ?? []).filter((r) => REPORT_SLUG_RE.test(r.slug)).map((r) => ({ slug: r.slug, updated: r.published_at ?? new Date().toISOString() }));
}

export const getAllReportSlugs = unstable_cache(getAllReportSlugsImpl, ["report-slugs"], {
  revalidate: 3600,
  tags: ["posts"],
});

/** All published post slugs for sitemap + news-sitemap. */
async function getAllPostSlugsImpl(): Promise<{ slug: string; updated: string; title: string }[]> {
  const supabase = getSupabase();
  if (!supabase) {
    const seen = new Set<string>();
    // Mock phải lọc guide y như query thật bên dưới — lệch nhau thì dev/test
    // mock-mode lại thấy 13 cặp URL trùng mà production đã dọn.
    return mockPosts.filter((p) => {
      if (p.type === "guide" || seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    }).map((p) => ({ slug: p.slug, updated: p.published_at ?? new Date().toISOString(), title: p.title }));
  }
  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at, title")
    .eq("status", "published")
    // Lấy bản TIẾNG VIỆT: bảng posts có 1 dòng mỗi ngôn ngữ, lọc theo lang chỉ
    // để mỗi slug ra đúng 1 dòng. Trước đây lọc "en" nên news-sitemap khai
    // news:language=vi mà tiêu đề lại tiếng Anh (Gwen bắt 25/8, 10/10 bài).
    // Slug giống nhau ở mọi ngôn ngữ nên sitemap chính không đổi gì.
    .eq("lang", "vi")
    // type=guide đã có nhà riêng (/guides + /transparency). Đổ thêm sang
    // /analysis tạo 13 cặp URL trùng tự cạnh tranh (kiểm kê 25/8) — loại hẳn.
    .neq("type", "guide")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getAllPostSlugs: ${error.message}`);
  return (data ?? []).map((r) => ({ slug: r.slug, updated: r.published_at ?? new Date().toISOString(), title: r.title }));
}

export const getAllPostSlugs = unstable_cache(getAllPostSlugsImpl, ["post-slugs"], {
  revalidate: 3600,
  tags: ["posts"],
});

/** Feature flag lookup — forum ships dark until ~200 daily visitors (decision #4). */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return mockFlags[key] ?? false;
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`isFeatureEnabled: ${error.message}`);
  return data?.enabled ?? false;
}

/** Crowd-poll tallies per pick (decision #5). Mock mode derives stable fake counts. */
async function getVoteCountsImpl(pickIds: string[]): Promise<Record<string, VoteCounts>> {
  if (pickIds.length === 0) return {};
  const counts: Record<string, VoteCounts> = Object.fromEntries(
    pickIds.map((id) => [id, { follow: 0, fade: 0, skip: 0 }]),
  );
  const supabase = getSupabase();
  if (!supabase) {
    for (const id of pickIds) counts[id] = mockVoteCounts(id);
    return counts;
  }
  const { data, error } = await supabase
    .from("pick_votes")
    .select("pick_id, vote")
    .in("pick_id", pickIds);
  if (error) throw new Error(`getVoteCounts: ${error.message}`);
  for (const row of (data ?? []) as { pick_id: string; vote: VoteKind }[]) {
    if (counts[row.pick_id]) counts[row.pick_id][row.vote] += 1;
  }
  return counts;
}

export const getVoteCounts = unstable_cache(getVoteCountsImpl, ["vote-counts"], {
  revalidate: 60,
  tags: ["votes"],
});

/** Thesis translations from `pick_content`, keyed by pick id then language.
 *  The English thesis lives on the pick itself — callers fall back to it. */
async function getThesisTranslationsImpl(
  pickIds: string[],
): Promise<Record<string, Partial<Record<Lang, string>>>> {
  if (pickIds.length === 0) return {};
  const supabase = getSupabase();
  if (!supabase) return {}; // mock mode: English thesis only
  const { data, error } = await supabase
    .from("pick_content")
    .select("pick_id, lang, body_md")
    .in("pick_id", pickIds);
  if (error) throw new Error(`getThesisTranslations: ${error.message}`);
  const map: Record<string, Partial<Record<Lang, string>>> = {};
  for (const row of (data ?? []) as { pick_id: string; lang: Lang; body_md: string }[]) {
    (map[row.pick_id] ??= {})[row.lang] = viPersona(row.body_md);
  }
  return map;
}

export const getThesisTranslations = unstable_cache(
  getThesisTranslationsImpl,
  ["thesis-translations"],
  { revalidate: 300, tags: ["picks"] },
);

/** Related articles sharing the same pick_ids — for auto internal-linking. */
export async function getPostsByPickIds(pickIds: string[], lang: string): Promise<Post[]> {
  const supabase = getSupabase();
  if (!supabase || pickIds.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("lang", lang)
    .overlaps("pick_ids", pickIds)
    .order("published_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(`getPostsByPickIds: ${error.message}`);
  return (data ?? []) as Post[];
}

/** All non-draft picks with slug + last activity date — sitemap + slug generation. */
export async function getAllPickRefs(): Promise<{ id: string; slug: string; updated: string }[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks.map((p) => ({ id: p.id, slug: buildPlaySlug(p), updated: p.settled_at ?? p.kickoff_utc }));
  }
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .neq("status", "draft")
    .order("kickoff_utc", { ascending: false });
  if (error) throw new Error(`getAllPickRefs: ${error.message}`);
  return ((data ?? []) as Pick[]).map(
    (p) => ({ id: p.id, slug: buildPlaySlug(p), updated: p.settled_at ?? p.kickoff_utc }),
  );
}

/** Distinct "YYYY-MM" months present among settled picks (for the archive filter). */
export async function getArchiveMonths(): Promise<string[]> {
  const picks = await getSettledPicks();
  const months = new Set(picks.map((p) => p.kickoff_utc.slice(0, 7)));
  return [...months].sort().reverse();
}

/** Active watching rows — what the Curator is eyeing before committing a pick. */
async function getActiveWatchingImpl(): Promise<WatchingRow[]> {
  const supabase = getSupabase();
  if (!supabase) return []; // mock mode: no watching teasers
  const { data, error } = await supabase
    .from("watching")
    .select("*")
    .eq("status", "active")
    .order("kickoff_utc", { ascending: true });
  if (error) throw new Error(`getActiveWatching: ${error.message}`);
  return (data ?? []) as WatchingRow[];
}

export const getActiveWatching = unstable_cache(getActiveWatchingImpl, ["active-watching"], {
  revalidate: 300,
  tags: ["watching"],
});

/** No-plays: watching rows evaluated and passed (status='expired') with kickoff today (UTC).
 *  The discipline moat — shown as a real list on /daily-board, close_note = the 1-line pass reason. */
async function getTodaysNoPlaysImpl(): Promise<WatchingRow[]> {
  const supabase = getSupabase();
  if (!supabase) return []; // mock mode: no no-play rows
  const dayStart = new Date().toISOString().slice(0, 10);
  const nextDay = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("watching")
    .select("*")
    .eq("status", "expired")
    .gte("kickoff_utc", `${dayStart}T00:00:00Z`)
    .lt("kickoff_utc", `${nextDay}T00:00:00Z`)
    .order("kickoff_utc", { ascending: true });
  if (error) throw new Error(`getTodaysNoPlays: ${error.message}`);
  return (data ?? []) as WatchingRow[];
}

export const getTodaysNoPlays = unstable_cache(getTodaysNoPlaysImpl, ["todays-no-plays"], {
  revalidate: 300,
  tags: ["watching"],
});

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build a match page slug from team names and kickoff. */
export function buildMatchSlug(home: string, away: string, kickoffUtc: string): string {
  const date = new Date(kickoffUtc).toISOString().slice(0, 10);
  return `${slugify(home)}-vs-${slugify(away)}-${date}`;
}

/** Slug variants that should resolve to the canonical DB slug. */
export const SLUG_ALIASES: Record<string, string> = {
  "czech-republic": "czechia",
  "turkiye": "turkey",
  "korea-republic": "south-korea",
  "dr-congo": "congo-dr",
  "cura-ao": "curacao",
  "c-te-d-ivoire": "cote-d-ivoire",
};

/** Parse a match slug (home-vs-away-yyyy-mm-dd) into team names and date. */
function parseMatchSlug(slug: string): { home: string; away: string; date: string } | null {
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx < 0) return null;
  const home = slug.slice(0, vsIdx);
  const rest = slug.slice(vsIdx + 4); // after "-vs-"
  // Last 10 chars should be yyyy-mm-dd
  const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  const away = rest.slice(0, rest.length - date.length - 1); // strip trailing "-yyyy-mm-dd"
  if (!home || !away) return null;
  return { home, away, date };
}

/** Get a match hub by slug — aggregates watching, picks, and posts for a match. */
async function getMatchBySlugImpl(slug: string): Promise<MatchData | null> {
  const parsed = parseMatchSlug(slug);
  if (!parsed) return null;

  const { home, away, date } = parsed;
  const { start, end } = utcDayRange(new Date(date + "T00:00:00Z"));

  const supabase = getSupabase();

  let watching: WatchingRow | null = null;
  let picks: Pick[] = [];
  let posts: Post[] = [];

  if (!supabase) {
    // Mock mode
    picks = mockPicks.filter((p) => {
      const pDate = p.kickoff_utc.slice(0, 10);
      return slugify(p.home_team) === home && slugify(p.away_team) === away && pDate === date;
    });
    posts = mockPosts.filter(
      (p) => p.slug.includes(home) && p.slug.includes(away) && p.status === "published",
    );
  } else {
    // Query watching: match home_team/away_team on that date (case-insensitive via ilike)
    // Reverse-lookup slug aliases so e.g. "turkey" also queries "türkiye"
    const REVERSE_SLUG: Record<string, string[]> = {
      turkey: ["turkey", "türkiye", "turkiye"],
      usa: ["usa", "united%states"],
      "south-korea": ["south%korea", "korea%republic"],
      czechia: ["czechia", "czech%republic"],
      // Slug sinh từ TEAM_CANONICAL "Bosnia and Herzegovina", nhưng DB lưu
      // "Bosnia Herzegovina"/"Bosnia & Herzegovina" — pattern có "and" không khớp
      // nên trang /match/canada-vs-bosnia-and-herzegovina-2026-06-12 mất luôn
      // pick + metadata dù pick tồn tại (đo 25/8).
      "bosnia-and-herzegovina": ["bosnia%herzegovina"],
    };
    const homeVariants = REVERSE_SLUG[home] ?? [home.replace(/-/g, "%")];
    const awayVariants = REVERSE_SLUG[away] ?? [away.replace(/-/g, "%")];
    const homeLike = homeVariants.map(v => `%${v}%`);
    const awayLike = awayVariants.map(v => `%${v}%`);

    // Build OR filters for variant matching (e.g. turkey / türkiye)
    const homeOr = homeLike.map(h => `home_team.ilike.${h}`).join(",");
    const awayOr = awayLike.map(a => `away_team.ilike.${a}`).join(",");

    const [watchRes, pickRes, postRes] = await Promise.all([
      // Include ALL watching statuses (active, expired, picked) — match page should
      // show history even after /unwatch or auto-expire (Nick 18/6).
      supabase
        .from("watching")
        .select("*")
        .or(homeOr)
        .or(awayOr)
        .gte("kickoff_utc", start)
        .lt("kickoff_utc", end)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("picks")
        .select("*")
        .or(homeOr)
        .or(awayOr)
        .gte("kickoff_utc", start)
        .lt("kickoff_utc", end)
        .neq("status", "draft")
        .order("published_at", { ascending: false }),
      supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .or([
          ...homeVariants.flatMap(h => awayVariants.map(a => `slug.ilike.%${h}%${a}%`)),
          ...awayVariants.flatMap(a => homeVariants.map(h => `slug.ilike.%${a}%${h}%`)),
        ].join(","))
        .order("published_at", { ascending: false }),
    ]);

    if (watchRes.error) throw new Error(`getMatchBySlug watching: ${watchRes.error.message}`);
    if (pickRes.error) throw new Error(`getMatchBySlug picks: ${pickRes.error.message}`);
    if (postRes.error) throw new Error(`getMatchBySlug posts: ${postRes.error.message}`);

    watching = (watchRes.data as WatchingRow) ?? null;
    picks = (pickRes.data ?? []) as Pick[];
    posts = (postRes.data ?? []) as Post[];
  }

  // Nothing found at all — return null
  if (!watching && picks.length === 0 && posts.length === 0) return null;

  // Derive match metadata from the best available source
  const ref = picks[0] ?? watching;
  const homeTeam = ref?.home_team ?? home;
  const awayTeam = ref?.away_team ?? away;
  const league = ref?.league ?? "";
  const kickoffUtc = ref?.kickoff_utc ?? `${date}T00:00:00Z`;
  const fixtureId = picks[0]?.fixture_id ?? 0;

  return { homeTeam, awayTeam, league, kickoffUtc, fixtureId, watching, picks, posts };
}

export const getMatchBySlug = unstable_cache(getMatchBySlugImpl, ["match-by-slug"], {
  revalidate: 300,
  tags: ["picks", "watching", "posts"],
});

/** Strip trailing group/league text from team names (e.g. "South Africa Group A" → "South Africa"). */
/** Normalize team names: strip "Group X", unify known variants. */
const TEAM_CANONICAL: Record<string, string> = {
  "Bosnia Herzegovina": "Bosnia and Herzegovina",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Türkiye": "Turkey",
  "Turkiye": "Turkey",
  "Czech Republic": "Czechia",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  "Curaçao": "Curacao",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "DR Congo": "Congo DR",
  // CLB: /watching gõ tay lệch tên với lịch mùa + bảng trực tiếp, làm một trận
  // sinh HAI slug → hai thẻ trùng trên /matches và tỷ số trực tiếp không ghép
  // được vào thẻ nào (Peter bắt 23/8: Man City vs Bournemouth hiện 2 thẻ).
  "Bournemouth": "AFC Bournemouth",
  "Atlanta United FC": "Atlanta United",
};

function cleanTeamName(name: string): string {
  const stripped = name.replace(/\s+Group\s+[A-Z]$/i, "").trim();
  return TEAM_CANONICAL[stripped] ?? stripped;
}

export interface MatchListEntry {
  slug: string;
  updated: string;
  kickoffUtc: string;
  homeScore: number | null;
  awayScore: number | null;
  pickStatus: string | null; // "won" | "lost" | "push" | null
  liveStatus: "live" | "ft" | null;
  minute: string | null;
  league: string;
}

/** All matches that have any content — for sitemap and matches list. */
async function getAllMatchSlugsImpl(): Promise<MatchListEntry[]> {
  const supabase = getSupabase();
  const slugMap = new Map<string, MatchListEntry>();
  const trustMap = new Map<string, number>();

  const addEntry = (
    home: string, away: string, kickoff: string, updated: string,
    homeScore: number | null = null, awayScore: number | null = null,
    pickStatus: string | null = null,
    liveStatus: "live" | "ft" | null = null,
    minute: string | null = null,
    league: string = "",
    // Độ tin của GIỜ đá: 0 = người gõ tay (/pick, /watching), 1 = lịch mùa.
    // Nick gõ lệch 30 phút là chuyện thường (Man City 12:30 vs 13:00 thật), nên
    // nguồn tin hơn được sửa giờ đè lên, kể cả khi bản ghi tay mới hơn.
    kickoffTrust = 0,
  ) => {
    home = cleanTeamName(home);
    away = cleanTeamName(away);
    const s = `${slugify(home)}-vs-${slugify(away)}-${kickoff.slice(0, 10)}`;
    const existing = slugMap.get(s);
    const bestTrust = Math.max(kickoffTrust, trustMap.get(s) ?? 0);
    const bestKickoff = !existing || kickoffTrust >= (trustMap.get(s) ?? 0)
      ? kickoff : existing.kickoffUtc;
    trustMap.set(s, bestTrust);
    if (existing) existing.kickoffUtc = bestKickoff;
    if (!existing || updated > existing.updated) {
      slugMap.set(s, {
        slug: s,
        updated,
        kickoffUtc: bestKickoff,
        homeScore: homeScore ?? existing?.homeScore ?? null,
        awayScore: awayScore ?? existing?.awayScore ?? null,
        pickStatus: pickStatus ?? existing?.pickStatus ?? null,
        liveStatus: liveStatus ?? existing?.liveStatus ?? null,
        minute: minute ?? existing?.minute ?? null,
        league: league || existing?.league || "",
      });
    } else {
      if (homeScore !== null) { existing.homeScore = homeScore; existing.awayScore = awayScore; }
      if (pickStatus) existing.pickStatus = pickStatus;
      if (liveStatus) { existing.liveStatus = liveStatus; existing.minute = minute; }
      if (league && !existing.league) existing.league = league;
    }
  };

  if (!supabase) {
    for (const p of mockPicks) addEntry(p.home_team, p.away_team, p.kickoff_utc, p.settled_at ?? p.kickoff_utc, null, null, null, null, null, p.league);
    return [...slugMap.values()];
  }

  const [pickRes, watchRes, liveRes] = await Promise.all([
    supabase
      .from("picks")
      .select("home_team, away_team, kickoff_utc, settled_at, home_score, away_score, status, league")
      .neq("status", "draft")
      .neq("status", "void"),
    supabase
      .from("watching")
      .select("home_team, away_team, kickoff_utc, created_at, league"),
    supabase
      .from("match_live_state")
      .select("home_team, away_team, kickoff_utc, home_score, away_score, status, minute, updated_at")
      .in("status", ["live", "finished"]),
  ]);

  if (pickRes.error) throw new Error(`getAllMatchSlugs picks: ${pickRes.error.message}`);
  if (watchRes.error) throw new Error(`getAllMatchSlugs watching: ${watchRes.error.message}`);

  for (const p of (pickRes.data ?? []) as { home_team: string; away_team: string; kickoff_utc: string; settled_at: string | null; home_score: number | null; away_score: number | null; status: string; league: string }[]) {
    const settled = ["won", "lost", "push"].includes(p.status) ? p.status : null;
    const ft = settled && p.home_score !== null ? "ft" as const : null;
    addEntry(p.home_team, p.away_team, p.kickoff_utc, p.settled_at ?? p.kickoff_utc, p.home_score, p.away_score, settled, ft, null, p.league);
  }
  for (const w of (watchRes.data ?? []) as { home_team: string; away_team: string; kickoff_utc: string; created_at: string; league?: string }[]) {
    addEntry(w.home_team, w.away_team, w.kickoff_utc, w.created_at, null, null, null, null, null, w.league ?? "");
  }
  // Merge live/finished scores into EXISTING entries only — never for 'upcoming'
  for (const ls of (liveRes.data ?? []) as { home_team: string; away_team: string; kickoff_utc: string; home_score: number; away_score: number; status: string; minute: string | null; updated_at: string }[]) {
    if (ls.status !== "live" && ls.status !== "finished") continue;
    const h = cleanTeamName(ls.home_team);
    const a = cleanTeamName(ls.away_team);
    const s = `${slugify(h)}-vs-${slugify(a)}-${ls.kickoff_utc.slice(0, 10)}`;
    const existing = slugMap.get(s);
    if (existing) {
      existing.homeScore = ls.home_score;
      existing.awayScore = ls.away_score;
      existing.liveStatus = ls.status === "finished" ? "ft" : "live";
      existing.minute = ls.minute;
    }
  }

  // Lịch thi đấu cả mùa. Trước đây trang trận chỉ sinh từ picks/watching/live —
  // nên 97 trang trận đang có toàn World Cup, KHÔNG có trận giải VĐQG nào, dù
  // mình có sẵn dữ liệu. VnExpress có một trang cho từng trận và ăn từ khoá tên
  // hai đội; đây là chỗ mình bỏ trống (6/8).
  //
  // CHỈ LẤY TRẬN TRONG CỬA SỔ 30 NGÀY TRƯỚC/SAU (Peter chốt 8/8). Bốn giải cộng
  // lại là 1.446 trận; đổ hết vào sơ đồ web thì Google bò một cục, mà Vercel
  // tính tiền theo số lần dựng trang. Trận còn 9 tháng nữa cũng chưa ai tìm và
  // mình chưa có gì để viết. Trận cũ trôi ra, trận mới trôi vào, không phải sửa
  // tay. Trang vẫn mở được bình thường nếu ai đó có link — chỉ là không rủ
  // Google bò hàng loạt.
  //
  // Thêm sau cùng để không đè lên trận đã có kèo hoặc đang đá — addEntry chỉ ghi
  // đè khi `updated` mới hơn, mà lịch tĩnh luôn dùng chính ngày đá làm mốc.
  const CUA_SO_NGAY = 30;
  const nay = Date.now();
  const tuNgay = new Date(nay - CUA_SO_NGAY * 86_400_000).toISOString().slice(0, 10);
  const denNgay = new Date(nay + CUA_SO_NGAY * 86_400_000).toISOString().slice(0, 10);
  const MUA: Array<[Array<{ date: string; time: string; homeName: string; awayName: string }>, string]> = [
    [eplSeason, "Premier League"],
    [laligaSeason, "La Liga"],
    [serieaSeason, "Serie A"],
    [bundesligaSeason, "Bundesliga"],
    [ligue1Season, "Ligue 1"],
  ];
  for (const [mua, giai] of MUA) {
    for (const f of mua) {
      if (f.date < tuNgay || f.date > denNgay) continue;
      addEntry(f.homeName, f.awayName, `${f.date}T${f.time}:00Z`, f.date, null, null, null, null, null, giai, 1);
    }
  }

  return [...slugMap.values()];
}

export const getAllMatchSlugs = unstable_cache(getAllMatchSlugsImpl, ["match-slugs-v2"], {
  revalidate: 300,
  tags: ["picks", "watching", "matches"],
});
