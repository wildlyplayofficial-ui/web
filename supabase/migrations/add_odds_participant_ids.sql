-- Mã đội của nhà cung cấp kèo, để lấy logo đội cho bảng kèo (/keo).
--
-- Vì sao cần: trang đã có sẵn đường /api/team-logo/[id] lấy logo theo mã đội của
-- odds-api, nhưng bảng odds_snapshots chỉ lưu TÊN đội dạng chữ. Ghép logo theo tên
-- thì hụt và dễ gắn nhầm — Gwen đo 25/8: 40 đội trên bảng chỉ khớp được 11 bằng
-- tên, và cách ghép gần đúng còn gán "Sabah Masazir" vào logo "Sabah", hai câu lạc
-- bộ khác nước. Lưu mã đội thì khớp tuyệt đối vì cùng một nhà cung cấp.
--
-- CHỈ THÊM CỘT. Không sửa, không xoá dữ liệu cũ. Dòng cũ để null, có logo dần từ
-- nhịp thu kèo kế tiếp trở đi.
alter table if exists odds_snapshots add column if not exists home_id bigint;
alter table if exists odds_snapshots add column if not exists away_id bigint;
