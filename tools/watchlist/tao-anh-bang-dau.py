"""Ảnh SƠ ĐỒ BẢNG ĐẤU — các bảng, đội trong bảng, và đường đi tới trận cuối.

Khác tao-anh-lich-giai.py: tệp kia liệt kê TRẬN theo ngày giờ; tệp này vẽ CẤU
TRÚC giải — ai chung bảng với ai, ai đi tiếp. Hai thứ độc giả hỏi khác nhau.
Số liệu truyền vào, không tự nghĩ.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
_FD = os.path.join(HERE, 'fonts') + os.sep
F  = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-ExtraBold.ttf', s)
FS = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-SemiBold.ttf', s)
GOLD = (255, 214, 64); NEN = (6, 32, 20); TRANG = (255, 255, 255); MO = (150, 190, 168)


def build(tieu_de, phu_de, bang, duong_di, out, chan='banhbong.net'):
    """bang = [(tên bảng, [(tên đội, noi_bat_bool), ...]), ...]  — vẽ 2 cột."""
    assert len(bang) == 2, 'khuôn này vẽ đúng 2 bảng'
    W, H = 1080, 760
    im = Image.new('RGB', (W, H), NEN); d = ImageDraw.Draw(im)
    for i in range(150):
        k = 1 - i / 150
        d.line([(0, i), (W, i)], fill=(int(6 + 16 * k), int(32 + 44 * k), int(20 + 30 * k)))
    d.rectangle([0, 148, W, 152], fill=GOLD)

    mk = Image.open(os.path.join(HERE, 'bb-mark-white.png')).convert('RGBA')
    mk = mk.resize((58, int(mk.height * 58 / mk.width)), Image.LANCZOS)
    im.paste(mk, (44, 30), mk); d = ImageDraw.Draw(im)
    assert d.textlength(tieu_de.upper(), font=F(46)) < W - 130, 'tiêu đề tràn'
    d.text((118, 26), tieu_de.upper(), font=F(46), fill=TRANG)
    d.text((120, 84), phu_de, font=FS(26), fill=GOLD)

    CW, x0, y0 = 476, 44, 196
    for i, (ten, doi) in enumerate(bang):
        x = x0 + i * (CW + 40)
        d.rounded_rectangle([x, y0, x + CW, y0 + 316], 16, fill=(10, 44, 28), outline=(24, 74, 48), width=2)
        d.text((x + 26, y0 + 20), ten.upper(), font=F(34), fill=GOLD)
        yy = y0 + 76
        for ten_doi, noi in doi:
            if noi:
                d.rounded_rectangle([x + 16, yy - 6, x + CW - 16, yy + 44], 10,
                                    fill=(16, 62, 38), outline=GOLD, width=2)
            assert d.textlength(ten_doi, font=F(30)) < CW - 90, f'tên đội dài quá: {ten_doi}'
            d.ellipse([x + 30, yy + 12, x + 42, yy + 24], fill=GOLD if noi else MO)
            d.text((x + 58, yy + 2), ten_doi, font=F(30), fill=TRANG if noi else MO)
            yy += 58

    yk = y0 + 356
    d.rounded_rectangle([x0, yk, W - 44, yk + 96], 16, fill=(10, 44, 28), outline=GOLD, width=2)
    d.text((x0 + 26, yk + 16), duong_di[0].upper(), font=F(32), fill=GOLD)
    assert d.textlength(duong_di[1], font=FS(24)) < W - 150, 'dòng đường đi dài quá'
    d.text((x0 + 26, yk + 58), duong_di[1], font=FS(24), fill=MO)

    d.text((44, H - 54), chan, font=FS(24), fill=MO)
    im.save(out, quality=92); print('saved', out, im.size)
