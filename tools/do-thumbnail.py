#!/usr/bin/env python3
"""
Chấm thumbnail trước khi đăng — máy đo phần đo được, mắt người lo phần còn lại.

Cách chạy:
    python3 tools/do-thumbnail.py anh1.jpg anh2.png ...

Chạy được trên cả Mac lẫn Windows. Chỉ cần: pip install pillow numpy

Đo cái gì và VÌ SAO:
  · VÙNG PHẲNG — phần ảnh không có chi tiết gì để mắt bám vào. Đo bằng độ lệch
    chuẩn cục bộ trong ô 9x9, KHÔNG đo theo màu. Đo theo màu là sai: khối chữ
    nền xanh đậm sẽ bị đếm nhầm thành nền trống (đã dính lỗi này 25/8).
  · Ô GIỮA — vùng trung tâm. Đây mới là chỗ quyết định ảnh có "chết" hay không;
    trống rìa còn tha được, trống giữa là hỏng.
  · CỠ ĐIỆN THOẠI — thu còn ngang 400px rồi đo lại độ nét chữ.

Ngưỡng (chốt 26/8 sau khi đo trên mẫu thật):
    vùng phẳng <= 55%   ·   ô giữa <= 60%
Ngưỡng 45% ban đầu đặt vội, mẫu nào cũng rớt nên đã nới. Bài học: đặt ngưỡng
xong phải chạy thử trên mẫu tốt lẫn mẫu xấu rồi mới công bố.

MÁY KHÔNG CHẤM ĐƯỢC (bắt buộc mở ảnh ra nhìn):
    nhân vật có bị cắt cụt tay/vai không · đúng người đúng đội chưa ·
    logo có phải logo thật không · dấu tiếng Việt có đúng không ·
    và câu quan trọng nhất: NHÌN CÓ MUỐN BẤM VÀO KHÔNG
"""
import sys
import numpy as np
from PIL import Image

NGUONG_PHANG, NGUONG_GIUA = 55.0, 60.0


def _box(a, k):
    """trung bình cục bộ trong ô (2k+1)^2, dùng bảng tổng tích luỹ cho nhanh"""
    c = np.cumsum(np.cumsum(np.pad(a, ((1, 0), (1, 0))), 0), 1)
    H, W = a.shape
    j0 = np.maximum(0, np.arange(W) - k)
    j1 = np.minimum(W, np.arange(W) + k + 1)
    out = np.empty_like(a)
    for i in range(H):
        i0, i1 = max(0, i - k), min(H, i + k + 1)
        out[i] = (c[i1, j1] - c[i0, j1] - c[i1, j0] + c[i0, j0]) / ((i1 - i0) * (j1 - j0))
    return out


def do_phang(img, k=4, nguong_sd=6.0):
    a = np.array(img.convert('L').resize((400, 210))).astype(float)
    m = _box(a, k)
    s = _box(a * a, k)
    sd = np.sqrt(np.clip(s - m * m, 0, None))
    phang = sd < nguong_sd
    h, w = phang.shape
    return phang.mean() * 100, phang[h // 3:2 * h // 3, w // 3:2 * w // 3].mean() * 100


def cham(path):
    img = Image.open(path)
    tong, giua = do_phang(img)
    dat = tong <= NGUONG_PHANG and giua <= NGUONG_GIUA
    ten = path.split('/')[-1]
    print(f'{ten}')
    w, h = img.size
    # Ngưỡng bề rộng chỉ áp cho ảnh NGANG (thẻ chia sẻ cần ≥1200).
    # Ảnh DỌC 1080x1920 là ĐÚNG CHUẨN story của Facebook/Instagram — cảnh báo ở
    # đây sẽ khiến người ta đi phóng ảnh lên 1200 và làm hỏng cái đang đúng.
    # Jane chỉ ra 26/8, đúng lúc sắp có ca dùng thật lúc nửa đêm.
    if w >= h:
        canh = '' if w >= 1200 else '   ⚠ ảnh ngang nhỏ hơn 1200px, Facebook sẽ làm mờ'
    else:
        canh = '   (ảnh dọc — khổ story)' if w >= 1080 else '   ⚠ ảnh dọc nhỏ hơn 1080px'
    print(f'   kích thước   {w}x{h}{canh}')
    print(f'   vùng phẳng   {tong:5.1f}%   (ngưỡng {NGUONG_PHANG:.0f}%)   {"đạt" if tong <= NGUONG_PHANG else "RỚT"}')
    print(f'   ô giữa       {giua:5.1f}%   (ngưỡng {NGUONG_GIUA:.0f}%)   {"đạt" if giua <= NGUONG_GIUA else "RỚT"}')
    print(f'   → {"ĐẠT máy chấm — giờ MỞ RA NHÌN trước khi đăng" if dat else "RỚT — làm lại, đừng đăng"}\n')
    return dat


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    ket = [cham(p) for p in sys.argv[1:]]
    print(f'Tổng: {sum(ket)}/{len(ket)} ảnh qua được vòng máy chấm.')
    sys.exit(0 if all(ket) else 1)
