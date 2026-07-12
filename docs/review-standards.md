---
name: wp-review-standards
description: Review checklist chuẩn Jane cho code WildlyPlay (và web đa ngôn ngữ nói chung). Dùng khi review commit/PR/diff WildlyPlay, trước khi push main, hoặc khi Peter/Nick yêu cầu "review như Jane". Đảm bảo mọi model review cùng một chuẩn.
---

# WildlyPlay Review Standards (chuẩn Jane)

Review 2-stage, KHÔNG trộn: Stage 1 đúng spec chưa → Stage 2 code quality. Output format: `✅ Đạt` / `⚠️ Fix N` (bắt buộc sửa) / `Minor` (gộp commit sau) / `📌 Process note`.

## Stage 1 — Spec compliance

- [ ] Đúng cái Nick/Peter chốt, không mở rộng scope. Trích lại nguyên văn spec khi phán sai/đúng.
- [ ] Empty-state + error-state có render đúng không (trang mới thường ship trước khi có data).

## Stage 2 — Checklist kỹ thuật

### Timezone (lỗi lặp nhiều nhất)
- [ ] Date/time hiển thị cho user = LOCAL TZ của user → PHẢI là client component ("use client", Intl với locale, không timeZone cứng). Pattern chuẩn: `components/local-kickoff-time.tsx`, `components/local-date.tsx` — SSR fallback UTC rồi swap sau hydration.
- [ ] Server component render `Intl.DateTimeFormat` = 🚩 giờ theo TZ server (UTC), sai spec.
- [ ] Relative time ("3h ago") TZ-agnostic → server OK; chỉ cần note stale theo `revalidate`.
- [ ] Business logic giờ VN: UTC+7, không lấy timestamp Telegram (UTC).

### i18n (4 lang: EN/VI/TH/ES)
- [ ] Sửa string EN → check đủ VI/TH/ES cùng key.
- [ ] Trang mới KHÔNG dùng ké dict namespace của trang khác (vụ /analysis xài chung dict.news → 2 trang trùng header, bb7bf38). Mỗi trang/section một namespace trong `lib/i18n.ts`.
- [ ] Không hardcode locale (`"en-GB"`) — dùng `locales[lang]` từ `lib/format`.
- [ ] Tên đã khai tử ("Newsroom") không được xuất hiện lại — grep cả dict + hardcoded strings + breadcrumb + og title.
- [ ] hreflang + self-canonical + generateMetadata đủ cho route mới.

### Data layer / Supabase
- [ ] Public read: query có `.eq("status", "published")` (double-lock với RLS, không dựa mỗi RLS).
- [ ] `.single()` phải handle `PGRST116` (not found) riêng, không throw chung.
- [ ] Interface TS khớp DB thật: cột nullable = `string | null`, đừng khai non-null cho đẹp.
- [ ] Enum/type list = 1 nguồn duy nhất (export const canonical list), worker + web dùng chung.
- [ ] `updated_at` Supabase KHÔNG tự nhảy — worker set tay khi UPDATE.
- [ ] Index: cột UNIQUE đã có index sẵn, đừng tạo trùng. Status/enum nên có CHECK constraint.

### SEO / routing
- [ ] Redirect pattern: `:slug` vs `:rest*` — rest* nuốt nhầm sub-path (47c8c5b). Test cả URL con.
- [ ] 301 cho rename URL, cập nhật toàn bộ internal links, sitemap, breadcrumb JSON-LD.
- [ ] og:image có cho MỌI page mới (fallback `/api/og/editorial?title=...`).
- [ ] JSON-LD: escape `</` (`\\u003c`), publisher/author đúng byline.

### Author firewall
- [ ] Scout (teal) vs Curator (green) không được lẫn label/byline/màu trên bất kỳ surface nào (card, og, share).

## Process rules
- [ ] Review TRƯỚC push main (Peter 17/6). Ngoại lệ chỉ khi Peter nói rõ "tự review tự push" — khi đó ghi rõ trong commit/group để Jane double-check sau.
- [ ] Branch per feature, worktree tách biệt, không code trên branch chính đang dở việc khác.
- [ ] Build + `tsc --noEmit` pass trước khi báo done. Deploy xong PHẢI verify live (curl H1/og/redirect thật) — "deployed" ≠ "working".
- [ ] Deploy WildlyPlay: báo group -5152855985 trước.

## Format báo cáo review
```
Review <sha> (<n> files) — PASS/NEEDS WORK, <n> fix + <n> minor:
✅ Đạt: <liệt kê điểm đúng spec, ngắn>
⚠️ Fix 1 — <tên lỗi>: <symptom> → <root cause> → <fix cụ thể, chỉ file/pattern có sẵn trong repo để reuse>
Minor (gộp commit sau): <list>
📌 Process note: <nếu có vi phạm quy trình>
```
Nguyên tắc: mỗi Fix phải chỉ được pattern/file CÓ SẴN trong repo để reuse, không bảo "viết mới" khi đã có convention.
