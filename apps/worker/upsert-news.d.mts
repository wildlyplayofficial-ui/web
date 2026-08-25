/** Type surface của upsert-news.mjs cho worker TS — runtime vẫn là chính file .mjs.
 *  Giữ khớp với các hàm export trong upsert-news.mjs (cùng lối news-engine.d.mts). */

export interface NewsInput {
  slug: string;
  type: string;
  subjects: string[];
  headline_vi: string;
  headline_en: string;
  body_vi: string;
  body_en: string;
  source: string;
  headline_th?: string;
  headline_es?: string;
  body_th?: string;
  body_es?: string;
  source_url?: string | null;
  competition_id?: string | null;
  match_id?: string | null;
  pick_id?: string | null;
  hero_card_url?: string | null;
  teams?: string[];
  published_at?: string;
  status?: 'published' | 'draft';
}

export interface BaiHong {
  i: number;
  slug: string;
  loi: string[];
}

export interface BaiTrung {
  slug: string;
  vi_sao: string;
}

export const NEWS_BYLINE: string;
export const VN_TZ: string;
export const NEWS_TYPES: string[];
export const STATUSES: string[];
export const MIN_HEADLINE_CHARS: number;
export const MIN_HEADLINE_WORDS: number;
export const MIN_BODY_CHARS: number;
export const MIN_BODY_SENTENCES: number;

export function boDau(s: unknown): string;
export function ngayVN(iso: string): string;
export function slugAnToan(slug: unknown): boolean;
export function mocThoiGian(raw: unknown, now?: Date): string | null;
export function kiemTraBai(bai: unknown): string[];
export function dungDong(bai: NewsInput, now?: Date): Record<string, unknown>;
export function phanLoai(
  danhSach: unknown[],
  slugDaCo: Set<string> | string[],
): { hong: BaiHong[]; trung: BaiTrung[]; moi: NewsInput[] };
export function canhBaoTieuDeGiong(
  danhSach: { slug: string; headline_vi?: string }[],
  tieuDeDaCo: { slug: string; headline_vi?: string | null }[],
): { slug: string; giong: string }[];
