"""Ảnh BẢNG LỊCH THI ĐẤU để chèn vào thân bài — bản CÔNG KHAI.

Khác tao-anh-watchlist.py: tệp kia là thẻ nội bộ (có ghi chú "khung giờ đẹp",
"đội hình chốt trước 60 phút") không đăng ra ngoài được. Tệp này chỉ có thứ độc
giả cần: ngày, giờ Việt Nam, hai đội, sân.

Số liệu TRUYỀN VÀO. Hàm này không tự nghĩ ra trận nào.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
_FD = os.path.join(HERE, 'fonts') + os.sep
F  = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-ExtraBold.ttf', s)
FS = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-SemiBold.ttf', s)
GOLD = (255, 214, 64); NEN = (6, 32, 20); VIEN = (18, 62, 40)
TRANG = (255, 255, 255); MO = (150, 190, 168)


def build(tieu_de, phu_de, nhom, out, chan='giờ Việt Nam · banhbong.net'):
    """nhom = [(tên nhóm, [(ngày, giờ, trận, sân, noi_bat_bool), ...]), ...]"""
    W = 1080
    cao = 210 + sum(64 + len(ms) * 86 for _, ms in nhom) + 92
    im = Image.new('RGB', (W, cao), NEN)
    d = ImageDraw.Draw(im)
    for i in range(150):                       # dải sáng đầu trang
        k = 1 - i / 150
        d.line([(0, i), (W, i)], fill=(int(6 + 16 * k), int(32 + 44 * k), int(20 + 30 * k)))
    d.rectangle([0, 148, W, 152], fill=GOLD)

    mk = Image.open(os.path.join(HERE, 'bb-mark-white.png')).convert('RGBA')
    mk = mk.resize((58, int(mk.height * 58 / mk.width)), Image.LANCZOS)
    im.paste(mk, (44, 30), mk); d = ImageDraw.Draw(im)
    assert d.textlength(tieu_de.upper(), font=F(46)) < W - 130, f'tiêu đề tràn: {tieu_de}'
    d.text((118, 26), tieu_de.upper(), font=F(46), fill=TRANG)
    d.text((120, 84), phu_de, font=FS(26), fill=GOLD)

    y = 190
    for ten_nhom, ms in nhom:
        d.text((44, y), ten_nhom.upper(), font=F(30), fill=GOLD)
        y += 56
        for ngay, gio, tran, san, noi_bat in ms:
            if noi_bat:
                d.rounded_rectangle([36, y - 10, W - 36, y + 70], 12,
                                    fill=(12, 52, 32), outline=GOLD, width=2)
            d.text((56, y + 2), ngay, font=FS(24), fill=MO)
            d.text((56, y + 28), gio, font=F(30), fill=GOLD if noi_bat else TRANG)
            assert d.textlength(tran, font=F(32)) < 560, f'tên trận dài quá: {tran}'
            d.text((250, y + 4), tran, font=F(32), fill=TRANG)
            d.text((250, y + 42), san, font=FS(21), fill=MO)
            y += 86
        y += 8

    d.line([(44, cao - 66), (W - 44, cao - 66)], fill=VIEN, width=2)
    d.text((44, cao - 50), chan, font=FS(24), fill=MO)
    im.save(out, quality=92)
    print('saved', out, im.size)
