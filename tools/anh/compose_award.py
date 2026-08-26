"""Hero tin GIẢI THƯỞNG 2400x1260: cartoon cầu thủ + 1 logo CLB + khối tên giải.

Vì sao có tệp này: `compose_team_hero.py` (khuôn cũ, không tấm nền) chấm ra
64,2% vùng phẳng / 78,7% ô giữa — RỚT ngưỡng do-thumbnail. Khuôn nền + tấm chữ
lấy đúng theo `compose_transfer.py` bản 2 (bản đã đạt 32-35%), chỉ khác phần
hàng logo: tin giải thưởng chỉ có MỘT CLB nên không vẽ mũi tên A→B (vẽ mũi tên
là nói dối người đọc rằng có chuyển nhượng).

usage: python compose_award.py <cartoon.png> <badge.png> "<TÊN>" "<dòng 2>" "<pill>" "<khối giải>" <out.png>
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
from brand_bb import stamp
from fonts_bb import F, FS

W, H = 2400, 1260
VANG = (255, 214, 64)


def build(cartoon, badge, name, line2, pill, giai, out):
    bg = Image.new('RGB', (W, H)); px = bg.load()
    top, bot = (40, 212, 82), (13, 154, 90)
    for y in range(H):
        t = y / H; c = tuple(int(top[i]*(1-t)+bot[i]*t) for i in range(3))
        for x in range(W): px[x, y] = c
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((1350, -150, 2650, 1050), fill=120)
    bg = Image.composite(Image.new('RGB', (W, H), (80, 230, 140)), bg,
                         glow.filter(ImageFilter.GaussianBlur(190))).convert('RGBA')

    van = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dv = ImageDraw.Draw(van)
    for i in range(-H, W + H, 88):
        dv.line((i, 0, i + H, H), fill=(255, 255, 255, 15), width=44)
        dv.line((i + 44, 0, i + 44 + H, H), fill=(0, 60, 30, 13), width=44)
    dv.ellipse((950, 210, 1810, 1070), outline=(255, 255, 255, 22), width=7)
    dv.line((1380, 0, 1380, H), fill=(255, 255, 255, 18), width=6)
    dv.rectangle((0, 250, 300, 1010), outline=(255, 255, 255, 18), width=6)
    bg = Image.alpha_composite(bg, van.filter(ImageFilter.GaussianBlur(1.2)))

    c = Image.open(badge).convert('RGBA').resize((980, 980))
    c.putalpha(c.split()[3].point(lambda v: int(v * .12))); bg.alpha_composite(c, (-190, 330))

    tam = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dt = ImageDraw.Draw(tam)
    dt.rounded_rectangle((150, 232, 1520, 1152), radius=52, fill=(6, 82, 47, 232))
    dt.rounded_rectangle((150, 232, 1520, 1152), radius=52, outline=(255, 255, 255, 46), width=3)
    bong = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(bong).rounded_rectangle((162, 250, 1532, 1170), radius=52, fill=(0, 30, 16, 150))
    bg = Image.alpha_composite(bg, bong.filter(ImageFilter.GaussianBlur(28)))
    bg = Image.alpha_composite(bg, tam)
    van_tam = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dvt = ImageDraw.Draw(van_tam)
    for i in range(150, 1780, 17):
        dvt.line((i, 232, i - 190, 1152), fill=(255, 255, 255, 17), width=7)
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((150, 232, 1520, 1152), radius=52, fill=255)
    van_tam.putalpha(Image.composite(van_tam.split()[3], Image.new('L', (W, H), 0), mask))
    bg = Image.alpha_composite(bg, van_tam)

    cut = Image.open(cartoon).convert('RGBA')
    ch = 1220; cw = int(cut.width*ch/cut.height); cut = cut.resize((cw, ch), Image.LANCZOS)
    cx = max(1240, W - cw - 30)
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dk = Image.new('RGBA', cut.size, (0, 45, 25, 255))
    dk.putalpha(cut.split()[3].point(lambda v: int(v*.40))); sh.paste(dk, (cx+26, H-ch+34), dk)
    bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(20))); bg.paste(cut, (cx, H-ch), cut)

    d = ImageDraw.Draw(bg)
    lt = lambda t, x, y, f, c=(255, 255, 255): (d.text((x+4, y+5), t, font=f, fill=(0, 0, 0, 120)),
                                                d.text((x, y), t, font=f, fill=c))
    stamp(bg, W)

    # hàng trên: logo CLB thật + khối tên giải màu vàng (thay chỗ mũi tên A→B)
    a = Image.open(badge).convert('RGBA').resize((380, 380))
    bg.paste(a, (230, 282), a)
    gf = F(96)
    gw = d.textlength(giai, font=gf)
    RONG_GIAI = 700
    if gw > RONG_GIAI:
        gf = F(max(44, int(96 * RONG_GIAI / gw)))
        while d.textlength(giai, font=gf) > RONG_GIAI and gf.size > 44:
            gf = F(gf.size - 1)
    lt(giai, 700, 282 + 190 - gf.size // 2, gf, VANG)

    RONG_TEN = 1130
    fn = F(190); wn = d.textlength(name, font=fn)
    if wn > RONG_TEN:
        fn = F(max(60, int(190 * RONG_TEN / wn)))
        while d.textlength(name, font=fn) > RONG_TEN and fn.size > 60:
            fn = F(fn.size - 1)
    lt(name, 230, 762 - fn.size // 2, fn)

    RONG = 1240
    f2 = FS(52); w2 = d.textlength(line2, font=f2)
    if w2 > RONG:
        f2 = FS(max(26, int(52 * RONG / w2)))
        while d.textlength(line2, font=f2) > RONG and f2.size > 26:
            f2 = FS(f2.size - 1)
    lt(line2, 230, 880, f2)

    pf = F(48); pw = d.textlength(pill, font=pf); x0, y0, ph = 230, 986, 96
    d.rounded_rectangle((x0+4, y0+6, x0+pw+110+4, y0+ph+6), radius=48, fill=(0, 0, 0, 80))
    d.rounded_rectangle((x0, y0, x0+pw+110, y0+ph), radius=48, fill=VANG)
    d.text((x0+55, y0+20), pill, font=pf, fill=(20, 20, 20))

    bg.convert('RGB').save(out, optimize=True)
    bg.convert('RGB').save(out.replace('.png', '.jpg'), quality=90, optimize=True)
    print('saved', out)


if __name__ == '__main__':
    build(*sys.argv[1:8])
