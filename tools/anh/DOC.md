# tools/anh — bộ dựng ảnh banhbong.net (chạy cả Mac lẫn Windows)

Jane gửi 26/8/2026 để Gwen commit vào repo. Jane không push được (Git Credential Manager treo).

## Tệp
- `fonts_bb.py` — tra font đậm ĐỦ DẤU TIẾNG VIỆT theo hệ điều hành. Windows lấy arialbd/segoeuib,
  Mac lấy Arial Bold/Tahoma Bold, Linux lấy DejaVu/Noto. Kiểm bảng mã chữ bằng fontTools,
  thiếu 1 trong `ƯỢỆỶĐăằẵịọủ` là loại font đó. Không tìm được thì BÁO LỖI TO, không im lặng vẽ hộp vuông.
- `brand_bb.py` — đóng dấu logo bb + banhbong.net lên ảnh 2400x1260.
- `compose_transfer.py` — khuôn hero tin chuyển nhượng (bản 3, 26/8).
- `compose_story.py` — khuôn story dọc 1080x1920.
- `bb-mark-color.png`, `wp-logo-white.png` — logo thật, PHẢI commit chung, đừng để trên máy riêng.

## Chạy
```
python compose_transfer.py <cutout.png> <badge_di.png> <badge_den.png> "TÊN" "dòng 2" "nhãn pill" ra.png
python compose_story.py <hero_ngang.png> "<tiêu đề>" "<nhãn>" ra.png
python tools/do-thumbnail.py ra.png        # ngưỡng 55% / 60%
```

## Hai chỗ đã sửa hôm nay, đừng lặp lại
1. Trước đây font gọi cứng `C:/Windows/Fonts/segoeuib.ttf` → Mac gãy ngay dòng đầu. Giờ qua `fonts_bb.py`.
2. Trước đây logo mở theo thư mục đang đứng (`Image.open('bb-mark-color.png')`) → chạy từ thư mục khác
   là không thấy file. Giờ mở theo thư mục chứa script.

Kiểm sau khi chuyển: dựng lại 1 hero cũ, so md5 với bản đã duyệt. Jane đã làm, khớp byte-for-byte.
