"""Tải ảnh lên kho và trả về ĐỊA CHỈ QUA CỔNG ĐỆM.

VÌ SAO CÓ TỆP NÀY (2/9/2026): tổ chức Supabase vượt băng thông ra 8,016/5 GB.
Nguyên nhân là kho trả `cache-control: no-cache` nên ảnh tải lại từ đầu ở MỌI
lượt xem. Đã dựng cổng đệm /api/anh/ và trỏ 127 bài sang.

Nhưng mấy script đăng bài vẫn ghi địa chỉ trỏ THẲNG Supabase, nên bài tiếp theo
là tái phạm ngay. Tệp này để mọi chỗ đăng bài dùng chung một đường.

BA LUẬT ĐÃ TRẢ GIÁ, đừng bỏ:
 1. KHÔNG GHI ĐÈ tên tệp. Cổng đệm đặt hạn một năm — ghi đè tên cũ thì người đọc
    thấy ảnh cũ suốt một năm. Sửa ảnh thì đặt tên mới (-v2, -v3).
 2. KIỂM MD5 ảnh tải về từ địa chỉ công khai, đừng tin mã 200. Kho từng trả bản
    cũ sau khi tải lên thành công.
 3. Trả về đường TƯƠNG ĐỐI /api/anh/... — trang bài đã có sẵn chỗ nối tên miền
    vào cho thẻ og và khai báo schema.
"""
import hashlib
import os

import requests


def tai_anh(duong_tep: str, kho: str, ten: str, *, ghi_de: bool = False) -> str:
    """Tải ảnh lên, kiểm md5, trả về địa chỉ qua cổng đệm."""
    U = os.environ["SUPABASE_URL"]
    K = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    H = {"apikey": K, "Authorization": "Bearer " + K}

    goc = open(duong_tep, "rb").read()
    md5 = hashlib.md5(goc).hexdigest()

    if not ghi_de:
        r = requests.head(f"{U}/storage/v1/object/public/{kho}/{ten}", timeout=30)
        if r.status_code == 200:
            raise SystemExit(
                f"'{ten}' đã có trong kho. ĐỪNG ghi đè — đệm giữ một năm, người đọc sẽ\n"
                f"thấy ảnh cũ. Đặt tên mới (thêm -v2, -v3) rồi chạy lại."
            )

    kieu = "image/png" if ten.lower().endswith(".png") else "image/jpeg"
    up = requests.post(f"{U}/storage/v1/object/{kho}/{ten}",
                       headers={**H, "Content-Type": kieu}, data=goc, timeout=180)
    if up.status_code not in (200, 201):
        raise SystemExit(f"tải lên hỏng: HTTP {up.status_code} {up.text[:120]}")

    ve = requests.get(f"{U}/storage/v1/object/public/{kho}/{ten}", timeout=180)
    if ve.status_code != 200 or hashlib.md5(ve.content).hexdigest() != md5:
        raise SystemExit("ảnh trên mạng KHÁC ảnh vừa tải lên — dừng, kiểm tay")

    return f"/api/anh/{kho}/{ten}"
