-- Ảnh vuông tối giản (chỉ logo đội, không chữ/người) cho ô thumbnail nhỏ trong
-- danh sách bài nhận định. Banner 1200x630 nhét vào ô ~120px thì nhoè (Peter 16/8);
-- list dùng ảnh này khi có, để trống thì rơi về hero_image/banner như cũ.
ALTER TABLE analysis_articles ADD COLUMN IF NOT EXISTS thumb_image text;
