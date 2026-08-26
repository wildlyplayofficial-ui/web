# tools/anh/mau_doi_chieu — bộ mẫu cố định để đối chiếu hai máy

Dùng khi sửa bất kỳ tệp nào trong `tools/anh/`: dựng lại đúng bộ này rồi so md5 hai máy.
Không có bộ mẫu cố định trong repo thì mỗi lần so phải chuyền tay ảnh — đúng cái đã dẹp 26/8.

## Lệnh chuẩn (chạy trong tools/anh/)

```
python compose_transfer.py mau_doi_chieu/delap_toon_cut.png mau_doi_chieu/badge_chelsea.png \
  mau_doi_chieu/badge_forest.png "LIAM DELAP" \
  "Chelsea → Nottingham Forest · 45 triệu bảng + 5 triệu phụ phí" \
  "CHUYỂN NHƯỢNG · ĐANG ĐÀM PHÁN" ra.png
```

## md5 phải khớp

| tệp | md5 |
|---|---|
| delap_toon_cut.png | 597661873f92ddc821ce3f599a8140dd |
| badge_chelsea.png | ed52c66d4bae853d653484dc49e896fd |
| badge_forest.png | 8734d158ec5741d9867a8c5b709e7651 |
| **ra.png (kết quả)** | **30bdc050b9c8e383b2ac606b28ff5614** |

Kết quả lệch mà 3 tệp đầu vào khớp → lệch ở code/font/asset. Kiểm theo thứ tự:
tệp font đang nạp (`python fonts_bb.py`) → asset logo → phiên bản code.

⚠️ 3 tệp PNG này có NỀN TRONG. Chuyển giao phải dạng TỆP/tài liệu, **không gửi dạng ảnh**
(Telegram nén JPEG là mất nền trong — đã dính 2 lần: 24/8 và 26/8).

Cả 3 đều chưa nằm trong repo trước 26/8: cutout Delap do cartoonify tạo, 2 logo tải từ
`club-badges.json` (thesportsdb).
