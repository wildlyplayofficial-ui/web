"""Bìa 1200x630 cho bài LỊCH THI ĐẤU MỘT VÒNG — dùng lại cho mọi vòng, mọi giải.

Vì sao có tệp riêng: tao-the-pick.py là thẻ MỘT TRẬN (nhà/khách/VS), không hợp bài
lịch cả vòng. tao-anh-watchlist.py thì là thẻ nội bộ (có ghi chú khung giờ đẹp,
đội hình chốt...) — không đăng ra ngoài được. Giữ chung tông: nền sân dốc ngang,
vàng 255,214,64, chữ Barlow Condensed, dấu bb góc trên.

Số liệu TRUYỀN VÀO, tệp này không tự nghĩ ra con số nào.
"""
import json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pitch_bg import draw as pitch

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', 'apps', 'web'))
BADGES = json.load(open(os.path.join(REPO, 'lib', 'data', 'club-badges.json')))
BU = {'Malaga': 'logo_them/malaga.png', 'Ipswich': 'logo_them/ipswich.png',
      'Bayern München': 'logo_them/bayern.png', 'Lille': 'logo_them/lille.png'}
W, H = 1200, 630
_FD = os.path.join(HERE, 'fonts') + os.sep
F  = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-ExtraBold.ttf', s)
FS = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-SemiBold.ttf', s)
GOLD = (255, 214, 64)


def huy_hieu(ten):
    # Cho phép truyền THẲNG đường dẫn ảnh — đội tuyển quốc gia không có trong kho
    # huy hiệu CLB, phải dùng cờ vẽ sẵn trong tools/watchlist/co/.
    if os.path.exists(ten):
        return ten
    if ten in BU:
        return os.path.join(HERE, BU[ten])
    u = BADGES.get(ten)
    if not u:
        return None
    p = os.path.join(REPO, 'public', 'badges', os.path.basename(u))
    return p if os.path.exists(p) else None


def build(giai, vong, ngay, dong_phu, tam_diem, out, nhan='LỊCH THI ĐẤU', cau_thu=None):
    """tam_diem = (tên đội A, tên đội B, chữ nhãn) hoặc None.
    cau_thu = đường dẫn ảnh cầu thủ đã cắt nền. Có ảnh thì cầu thủ bám mép phải
    và KHÔNG vẽ huy hiệu — hai thứ chồng nhau thì rối, chọn một."""
    im = Image.new('RGB', (W, H)); px = im.load()
    c1, c2 = (10, 92, 52), (3, 40, 24)
    for x in range(W):
        t = x / W
        col = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        for y in range(H): px[x, y] = col
    im = pitch(im.convert('RGBA'), alpha=28)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-280, -170, 620, 720), fill=52)
    im = Image.composite(Image.new('RGB', (W, H), (30, 150, 88)).convert('RGBA'), im,
                         glow.filter(ImageFilter.GaussianBlur(170)))

    if cau_thu:
        pl = Image.open(cau_thu).convert("RGBA")
        bb = pl.getbbox()                      # bỏ viền trong suốt thừa, kẻo người bị nhỏ lại
        if bb: pl = pl.crop(bb)
        ph = 596; pw = int(pl.width * ph / pl.height)
        pl = pl.resize((pw, ph), Image.LANCZOS)
        im.alpha_composite(pl, (W - pw + 20, H - ph))
    elif tam_diem:
        a, b, nhan_td = tam_diem
        pa, pb = huy_hieu(a), huy_hieu(b)
        assert pa and pb, f'thiếu huy hiệu: {a if not pa else b}'
        for p, cx in ((pa, 880), (pb, 1060)):
            l = Image.open(p).convert('RGBA'); l.thumbnail((150, 150), Image.LANCZOS)
            im.alpha_composite(l, (cx - l.width // 2, 300 - l.height // 2))

    sm = Image.new('L', (W, 1)); smp = sm.load()
    for x in range(W):
        smp[x, 0] = 120 if x < 620 else max(0, int(120 * (1 - (x - 620) / 200)))
    scrim = Image.new('RGBA', (W, H), (0, 26, 14, 255)); scrim.putalpha(sm.resize((W, H)))
    im.alpha_composite(scrim)

    d = ImageDraw.Draw(im)
    sh = lambda t, x, y, f, c=(255, 255, 255): (d.text((x + 3, y + 4), t, font=f, fill=(0, 0, 0, 160)),
                                                d.text((x, y), t, font=f, fill=c))
    mk = Image.open(os.path.join(HERE, 'bb-mark-color.png')).convert('RGBA')
    mk = mk.resize((50, int(mk.height * 50 / mk.width)), Image.LANCZOS)
    im.alpha_composite(mk, (50, 32)); d = ImageDraw.Draw(im)
    d.polygon([(122, 60), (131, 51), (140, 60), (131, 69)], fill=GOLD)
    d.text((152, 44), nhan, font=F(26), fill=GOLD)

    assert d.textlength(giai.upper(), font=F(76)) < 700, f'tên giải tràn: {giai}'
    sh(giai.upper(), 50, 118, F(76))
    sh(vong.upper(), 50, 208, F(56), GOLD)

    PX0, PY0, PX1, PY1 = 44, 306, 700, 470
    panel = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(panel).rounded_rectangle((PX0, PY0, PX1, PY1), 20, fill=(1, 30, 18, 150),
                                            outline=GOLD, width=3)
    im.alpha_composite(panel); d = ImageDraw.Draw(im)
    assert d.textlength(ngay.upper(), font=F(72)) < PX1 - PX0 - 56, f'dòng ngày tràn: {ngay}'
    sh(ngay.upper(), PX0 + 28, PY0 + 18, F(72), GOLD)
    d.text((PX0 + 30, PY0 + 110), dong_phu, font=FS(28), fill=(226, 240, 234))

    if tam_diem and not cau_thu:
        n = tam_diem[2].upper()
        d.text((970 - d.textlength(n, font=FS(22)) / 2, 400), n, font=FS(22), fill=(190, 232, 208))
    d.text((50, H - 62), 'banhbong.net', font=FS(28), fill=(190, 232, 208))
    im.convert('RGB').save(out, quality=92, optimize=True)
    print('saved', out)
