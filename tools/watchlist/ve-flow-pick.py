"""Sơ đồ flow trận Pick từ đầu đến cuối — vẽ cho Peter coi."""
from PIL import Image, ImageDraw, ImageFont

FD = '/Users/peter/wildlyplay/tools/watchlist/fonts/BarlowCondensed-%s.ttf'
B = lambda s: ImageFont.truetype(FD % 'ExtraBold', s)
M = lambda s: ImageFont.truetype(FD % 'SemiBold', s)
NEN, XANH, VANG, TRANG, XAM = (10, 14, 20), (0, 230, 118), (255, 214, 64), (246, 249, 247), (146, 166, 156)
W = 1240

BUOC = [
    ('1', 'ANH NICK GỬI DANH SÁCH TRẬN', 'Thứ Tư hàng tuần · tệp watchlist', XANH,
     ['Gwen bỏ tự động các trận đã đá (so giờ, không đếm tay)']),
    ('2', 'KIỂM KHO ẢNH CẦU THỦ TRƯỚC', 'players-index.json · 24 đội đang có', VANG,
     ['Đội ĐÃ CÓ ảnh: dùng lại, 0 đồng',
      'Đội CHƯA CÓ: ảnh cắt nền TheSportsDB, vẽ bằng gpt-image-2, lưu vào kho',
      'Mỗi ảnh 0,23 USD · vẽ một lần dùng mãi',
      'CHỈ MỘT NGƯỜI ĐƯỢC GỌI LỆNH VẼ (Gwen). Báo trước trong nhóm KHÔNG đủ']),
    ('3', 'DỰNG SẴN THẺ CHỜ PICK', 'đủ đội · huy hiệu · giờ đá · mặt cầu thủ', XANH,
     ['Ô dự đoán để trống. Giải ngoài chưa có mặt thì lấp 2 huy hiệu to']),
    ('4', 'TRƯỚC GIỜ ĐÁ 1 TIẾNG: NHẮC ANH NICK', 'trận 18h30 thì 17h30 hỏi', VANG,
     ['Hỏi đúng 4 thứ, không tự bịa: DỰ ĐOÁN · MỨC TỰ TIN · ĐƠN VỊ · TỶ LỆ KÈO',
      'TỶ LỆ KÈO chỉ nhập vào admin để tính lời lỗ. KHÔNG BAO GIỜ in lên thẻ',
      'Xin theo khuôn /pick để dán thẳng vào admin, khỏi gõ tay']),
    ('5', 'TẠO PICK + ĐIỀN SỐ VÀO THẺ', 'admin/picks/new · thẻ ra trong vài giây', XANH,
     ['Dán khối /pick vào admin là xong, khỏi gõ từng ô',
      'Thẻ chỉ hiện 3 thứ: dự đoán · mức tự tin · đơn vị. Không hiện tỷ lệ',
      'Mức tự tin THẤP / VỪA / CAO (VỪA = TRUNG BÌNH trên web, cùng nghĩa)']),
    ('6', 'GỬI ANH NICK + ANH PETER DUYỆT', 'giai đoạn đầu KHÔNG đăng thẳng', VANG,
     ['Gwen soi trước: đúng đội · đúng giờ · huy hiệu đúng CLB · chữ không mang hơi cá cược',
      'Khuôn ổn định rồi anh Nick mới cho đăng thẳng']),
    ('7', 'ĐĂNG 3 CHỖ', 'web banhbong.net · Facebook · Telegram', XANH,
     ['Ảnh thẻ 1200x630 dùng chung cả 3 nơi']),
    ('8', 'TRẬN XONG HẲN: CHỐT KẾT QUẢ', 'admin/picks/settle · trang Thành Tích tự cộng', XANH,
     ['Nhập tỷ số, hệ thống TỰ tính Thắng / Thua / Hoà / Thắng nửa / Thua nửa',
      'CHỈ chốt khi trận kết thúc hẳn — từng chốt lúc đang đá nên thua thành thắng']),
]

# đo chiều cao
H = 150
for _ in BUOC:
    H += 118 + 30 * len(_[4])
H += 120

im = Image.new('RGB', (W, H), NEN)
d = ImageDraw.Draw(im)
d.rectangle([0, 0, W, 118], fill=(12, 40, 26))
d.text((44, 20), 'FLOW TRẬN PICK — TỪ ĐẦU ĐẾN CUỐI', font=B(50), fill=XANH)
d.text((46, 76), 'banhbong · chốt 29/8/2026', font=M(26), fill=XAM)

y = 148
for i, (so, ten, phu, mau, dong) in enumerate(BUOC):
    h = 96 + 30 * len(dong)
    d.rounded_rectangle([40, y, W - 40, y + h], 12, fill=(17, 24, 31), outline=mau, width=2)
    d.ellipse([62, y + 20, 62 + 46, y + 66], fill=mau)
    d.text((62 + 23 - d.textlength(so, font=B(32)) / 2, y + 26), so, font=B(32), fill=NEN)
    d.text((128, y + 18), ten, font=B(33), fill=TRANG)
    d.text((130, y + 58), phu, font=M(24), fill=mau)
    yy = y + 96
    for t in dong:
        d.text((132, yy - 4), '·', font=B(24), fill=XAM)
        d.text((150, yy - 6), t, font=M(24), fill=(198, 214, 205))
        yy += 30
    y += h
    if i < len(BUOC) - 1:
        d.line([(85, y + 6), (85, y + 20)], fill=XAM, width=3)
        d.polygon([(79, y + 18), (91, y + 18), (85, y + 28)], fill=XAM)
        y += 34

d.rounded_rectangle([40, y + 6, W - 40, y + 78], 10, fill=(36, 26, 16), outline=VANG, width=2)
d.text((62, y + 20), 'LUẬT CỨNG: thiếu 1 trong 4 thứ anh Nick phải cho thì KHÔNG đăng. Không tự nghĩ ra dự đoán.',
       font=B(27), fill=VANG)
im.save('/Users/peter/.claude/jobs/ac92286e/tmp/flow-pick.png')
print('ok', im.size)
