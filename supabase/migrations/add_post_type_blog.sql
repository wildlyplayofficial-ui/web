-- Thêm giá trị 'blog' vào enum post_type (banhbong, 29/8/2026).
--
-- Vì sao cần: cột posts.type là ENUM cố định, không phải text tự do. Jane thử
-- chèn một dòng type='blog' thì kho trả:
--   invalid input value for enum post_type: "blog"
-- Không chạy lệnh này thì mọi bài blog đều bị từ chối, mục /blog sẽ rỗng vĩnh viễn.
--
-- Bảy giá trị đang có (kèm số bài đang dùng, đếm 29/8):
--   news 315 · no-play 254 · analysis 141 · preview 113 · recap 67 · guide 66 · post-mortem 17
--
-- ⚠️ CHẠY LỆNH NÀY XONG RỒI MỚI MERGE mã. Merge trước thì trang /blog trỏ vào
--    một giá trị enum chưa tồn tại.
--
-- ⚠️ `ADD VALUE` KHÔNG dùng được ngay trong cùng một giao dịch vừa thêm nó
--    (giới hạn của Postgres). Chạy lệnh này một mình, để nó commit xong, rồi
--    mới chèn bài. Đừng gộp chung một khối với câu INSERT đầu tiên.
--
-- `IF NOT EXISTS` để chạy lại nhiều lần không lỗi.

ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'blog';
