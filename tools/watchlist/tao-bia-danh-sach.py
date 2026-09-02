"""Bìa 1200x630 kiểu THẺ DANH SÁCH — in thẳng danh sách lên ảnh.

Peter 2/9/2026: "sao không làm cái list luôn trên thumbnail". Đúng — với bài
liệt kê (cầu thủ tự do, danh sách chuyển nhượng, đội hình), người lướt Facebook
đọc được ngay trên ảnh thì hơn hẳn một con số trống.

Hai cột tên bên trái, cầu thủ bám mép phải. Số dòng tối đa 16 (8 mỗi cột) —
quá thì assert chặn, vì nhồi thêm là chữ bé không đọc nổi ở cỡ thẻ.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pitch_bg import draw as pitch

HERE = os.path.dirname(os.path.abspath(__file__))
_FD = os.path.join(HERE, 'fonts') + os.sep
F  = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-ExtraBold.ttf', s)
FS = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-SemiBold.ttf', s)
# Khổ DỌC 1080x1350 (Peter đưa mẫu 2/9): danh sách dài cần chiều cao, một cột
# đọc dễ hơn hai cột. Khổ này để ĐĂNG FACEBOOK. Ảnh đầu bài trên web vẫn dùng
# khổ ngang 1200x630 của tao-bia-vong.py, vì trang bài cắt ảnh theo tỉ lệ 16:9 —
# nhét ảnh dọc vào đó là mất gần hết danh sách.
W, H = 1080, 1350
GOLD = (255, 214, 64); TRANG = (255, 255, 255); MO = (168, 205, 186)


def build(tieu_de, phu_de, muc, out, nhan='CHUYỂN NHƯỢNG', cau_thu=None):
    """muc = [(tên, chú thích ngắn), ...] — tối đa 16."""
    assert 1 <= len(muc) <= 20, f'danh sách {len(muc)} dòng, khuôn này chịu tối đa 20'
    im = Image.new('RGB', (W, H)); px = im.load()
    c1, c2 = (10, 92, 52), (3, 40, 24)
    for x in range(W):
        t = x / W
        col = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        for y in range(H): px[x, y] = col
    im = pitch(im.convert('RGBA'), alpha=24)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-280, -170, 560, 700), fill=46)
    im = Image.composite(Image.new('RGB', (W, H), (30, 150, 88)).convert('RGBA'), im,
                         glow.filter(ImageFilter.GaussianBlur(170)))
    if cau_thu:
        pl = Image.open(cau_thu).convert('RGBA')
        bb = pl.getbbox()
        if bb: pl = pl.crop(bb)
        ph = 1010; pw = int(pl.width * ph / pl.height)
        pl = pl.resize((pw, ph), Image.LANCZOS)
        im.alpha_composite(pl, (W - pw + 40, H - ph - 30))
    sm = Image.new('L', (W, 1)); smp = sm.load()
    for x in range(W):
        smp[x, 0] = 140 if x < 520 else max(0, int(140 * (1 - (x - 520) / 220)))
    scrim = Image.new('RGBA', (W, H), (0, 26, 14, 255)); scrim.putalpha(sm.resize((W, H)))
    im.alpha_composite(scrim)

    d = ImageDraw.Draw(im)
    mk = Image.open(os.path.join(HERE, 'bb-mark-color.png')).convert('RGBA')
    mk = mk.resize((50, int(mk.height * 50 / mk.width)), Image.LANCZOS)
    im.alpha_composite(mk, (52, 40)); d = ImageDraw.Draw(im)
    d.polygon([(124, 66), (133, 57), (142, 66), (133, 75)], fill=GOLD)
    d.text((154, 51), nhan, font=F(26), fill=GOLD)

    assert d.textlength(tieu_de.upper(), font=F(60)) < W - 110, f'tiêu đề tràn: {tieu_de}'
    d.text((52, 106), tieu_de.upper(), font=F(60), fill=TRANG)
    d.text((54, 176), phu_de, font=FS(25), fill=MO)

    # chừa 150px chân ảnh thôi, không phải 300 — chừa nhiều thì danh sách co lên
    # một cục ở nửa trên, nửa dưới trống trơ (soi mắt bản đầu mới thấy).
    y = 246; BUOC = (H - 150 - y) // max(len(muc), 1)
    BUOC = min(BUOC, 70)
    for muc_i in muc:
        ten, ghi = muc_i[0], muc_i[1]
        ma_co = muc_i[2] if len(muc_i) > 2 else None
        # vạch kẻ đặt DƯỚI dòng chữ nhỏ. Trước đó đặt ở y+46, chữ phụ cao tới y+48
        # nên vạch cắt ngang chữ — soi mắt mới thấy, đo bằng số thì không ra.
        d.line([(52, y + 56), (600, y + 56)], fill=(255, 214, 64, 70), width=1)
        x_chu = 52
        if ma_co:
            p_co = os.path.join(HERE, 'co', f'{ma_co}.png')
            if os.path.exists(p_co):
                co = Image.open(p_co).convert('RGBA')
                cw = 40; ch = max(1, int(co.height * cw / co.width))
                co = co.resize((cw, ch), Image.LANCZOS)
                vien = Image.new('RGBA', (cw + 2, ch + 2), (255, 255, 255, 90))
                vien.alpha_composite(co, (1, 1))
                im.alpha_composite(vien, (52, y + 4))
                x_chu = 52 + cw + 16
        d = ImageDraw.Draw(im)
        f1 = F(31)
        assert d.textlength(ten, font=f1) < 520 - (x_chu - 52), f'tên dài quá: {ten}'
        d.text((x_chu, y - 2), ten, font=f1, fill=TRANG)
        if ghi:
            f2 = FS(19)
            assert d.textlength(ghi, font=f2) < 520 - (x_chu - 52), f'chú thích dài quá: {ghi}'
            d.text((x_chu + 2, y + 26), ghi.upper(), font=f2, fill=MO)
        y += BUOC
    assert y < H - 70, 'danh sách tràn xuống chân ảnh'
    d.text((52, H - 58), 'banhbong.net', font=FS(26), fill=MO)
    im.convert('RGB').save(out, quality=92, optimize=True)
    print('saved', out)
