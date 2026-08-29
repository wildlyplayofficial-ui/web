-- Cờ ẨN KHỎI GOOGLE cho từng bản tin (banhbong, 29/8/2026).
--
-- Vì sao cần: một thương vụ chuyển nhượng đẻ ra nhiều bài theo diễn biến. Vụ
-- Barcola 26/8, 28/8, 29/8 = BA trang, ba con số khác nhau, cùng tranh một từ
-- khoá. Google phải chọn một trong ba, mà cả ba đều đúng một phần.
--
-- Vì sao noindex chứ không phải canonical: canonical chỉ là GỢI Ý, Google được
-- quyền bỏ qua khi hai trang khác nội dung nhiều — mà mấy bài này chữ khác nhau
-- khá xa, không phải bản sao. noindex thì Google buộc phải nghe. (Jane nêu 29/8.)
--
-- Vì sao không đổi `status`: đổi status là trang thành 404, mất luôn người đọc.
-- Bài cũ vẫn là một mốc thời gian có thật, giữ cho người đọc, chỉ giấu khỏi Google.
--
-- Jane tự bật tắt được, không phải nhờ sửa mã mỗi lần:
--   update news_items set noindex = true where slug = '<slug bài cũ>';

alter table news_items
  add column if not exists noindex boolean not null default false;

comment on column news_items.noindex is
  'true = vẫn hiện cho người đọc nhưng ẩn khỏi Google (bỏ khỏi sitemap + gắn thẻ noindex). Dùng cho bản tin đã bị bài mới hơn thay thế.';

create index if not exists news_items_noindex_idx on news_items (noindex) where noindex;
