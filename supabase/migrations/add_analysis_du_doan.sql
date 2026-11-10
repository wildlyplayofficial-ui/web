-- Hub /du-doan: trận + tỷ số dự đoán của bài xem trước (kind='preview').
-- Shape: {"home": "Manchester United", "away": "AFC Bournemouth",
--         "kickoff_utc": "2026-10-25T14:00:00Z", "home_goals": 2, "away_goals": 1}
--  - home/away: tên ĐỦ như bảng fixtures để ghép tỷ số thật.
--  - home_goals/away_goals: chốt TRƯỚC giờ đá; bài đăng sau kickoff_utc không được chấm.
--  - NULL = bài vẫn lên hub nhưng không vào bảng đúng/sai.
ALTER TABLE analysis_articles ADD COLUMN IF NOT EXISTS du_doan jsonb;

-- TUỲ CHỌN (10/11/2026): web đọc dự đoán qua lib/du-doan-nguon.ts `duDoanCua` —
-- cột này có số thì dùng, chưa chạy migration thì rơi về apps/web/lib/data/du-doan.json.
-- Chạy migration KHÔNG bắt buộc để hub /du-doan hoạt động.
