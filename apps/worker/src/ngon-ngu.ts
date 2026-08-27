/**
 * banhbong.net chỉ tiếng Việt (Peter chốt 27/8/2026 23:20 — "không cần 4 ngôn ngữ").
 * NGON_NGU là nguồn sự thật DUY NHẤT cho danh sách ngôn ngữ sinh bài: mọi vòng lặp
 * ngôn ngữ, mọi prompt, mọi filter dedup/count phải đi qua đây. Type PostLang giữ
 * nguyên 4 giá trị để các dòng en/th/es cũ trong DB vẫn đọc/đếm được.
 */
import type { PostLang } from './store';

export const NGON_NGU: readonly PostLang[] = ['vi'];
