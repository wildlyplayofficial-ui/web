/**
 * Chốt chặn cứng cho chữ "tài xỉu" (Peter 14/11: bỏ hẳn "tài xỉu", "Tài 2.5", "Xỉu 2.5"
 * — nhãn đúng là "Over 2.5" / "Under 2.5" / "Over/Under", KHÔNG "Trên/Dưới").
 * VI_LEXICON_RULE trong prompt vẫn lọt (bài Việt Nam vs Kyrgyzstan 17/11), nên mọi
 * output LLM đi qua hàm này trước khi lưu. Chỉ đụng cụm cá cược — "trọng tài",
 * "tài năng", "tài chính", "ngất xỉu"... giữ nguyên.
 */

/** "tài xỉu" / "tài/xỉu" / "Tài-Xỉu" đứng riêng thành từ. */
const TAI_XIU_PAIR = /(?<!\p{L})tài\s*[/\-–]?\s*xỉu(?!\p{L})/giu;

/** Mốc số: 2 · 2.5 · 2,5 · 3.5/4 */
const LINE_NUM = String.raw`\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?`;

/** Từ ghép tiếng Việt có "tài"/"xỉu" đứng sau — không được coi là mốc Over/Under
 *  ("trọng tài 2 lần", "nhân tài 3 đội", "ngất xỉu 2 lần"). */
const COMPOUND_BEFORE = String.raw`(?<!(?:trọng|nhân|thiên|tiền|đề|gia|tư|anh|hiền|đặc|bất|kỳ|kì|giảng|ngất|lăn|xây)\s+)`;

const TAI_LINE = new RegExp(String.raw`${COMPOUND_BEFORE}(?<!\p{L})tài\s+(${LINE_NUM})(?![\p{L}\d])`, 'giu');
const XIU_LINE = new RegExp(String.raw`${COMPOUND_BEFORE}(?<!\p{L})xỉu\s+(${LINE_NUM})(?![\p{L}\d])`, 'giu');

/** Viết lại cụm tài/xỉu trong text tiếng Việt sang Over/Under. Pure, idempotent. */
export function scrubTaiXiu(text: string): string {
  return text
    .replace(TAI_XIU_PAIR, 'Over/Under')
    .replace(TAI_LINE, 'Over $1')
    .replace(XIU_LINE, 'Under $1');
}
