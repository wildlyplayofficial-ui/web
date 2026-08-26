"""Ghép hero chuyển nhượng WildlyPlay 2400x1260: cartoon cầu thủ + logo 2 CLB A→B + pill vàng.

Bản 2 (26/8/2026): sửa bệnh nền trống >70% Gwen đo được. Ba thay đổi:
  1. Tấm nền chữ màu xanh đậm bo góc chiếm trọn nửa trái — trước đây chữ nổi trên nền trống.
  2. Cutout cầu thủ cao 1220 thay vì 1010, kéo vào giữa để lấp ô 1/3 chính giữa.
  3. Logo CLB mờ làm hoạ tiết to 980px thay vì 700px.
Kiểm bằng: python do_nen_trong.py <hero.png>  → cần nền trống ≤45%, ô giữa ≤60%.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from brand_bb import stamp
W, H = 2400, 1260
from fonts_bb import F, FS   # font tự tra theo hệ điều hành, xem fonts_bb.py
VANG = (255, 214, 64)


def build(cartoon, badge_from, badge_to, name, line2, pill, out):
    bg = Image.new('RGB', (W, H)); px = bg.load()
    top, bot = (40, 212, 82), (13, 154, 90)
    for y in range(H):
        t = y / H; c = tuple(int(top[i]*(1-t)+bot[i]*t) for i in range(3))
        for x in range(W): px[x, y] = c
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((1350, -150, 2650, 1050), fill=120)
    bg = Image.composite(Image.new('RGB', (W, H), (80, 230, 140)), bg, glow.filter(ImageFilter.GaussianBlur(190))).convert('RGBA')

    # hoạ tiết SÂN CỎ: sọc chéo + vạch sân mờ. Học từ mẫu VN-Thái của Gwen 26/8 —
    # nền phẳng tuyệt đối là thứ kéo điểm "vùng phẳng" lên cao nhất, phá nó bằng vân là rẻ nhất.
    van = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dv = ImageDraw.Draw(van)
    for i in range(-H, W + H, 88):
        dv.line((i, 0, i + H, H), fill=(255, 255, 255, 15), width=44)
    for i in range(-H, W + H, 88):
        dv.line((i + 44, 0, i + 44 + H, H), fill=(0, 60, 30, 13), width=44)
    dv.ellipse((950, 210, 1810, 1070), outline=(255, 255, 255, 22), width=7)
    dv.line((1380, 0, 1380, H), fill=(255, 255, 255, 18), width=6)
    dv.rectangle((0, 250, 300, 1010), outline=(255, 255, 255, 18), width=6)
    bg = Image.alpha_composite(bg, van.filter(ImageFilter.GaussianBlur(1.2)))

    # hoạ tiết logo CLB mờ, to hơn bản 1 để lấp nền
    for f, pos, op in [(badge_from, (-190, 330), .12), (badge_to, (1700, -120), .10)]:
        c = Image.open(f).convert('RGBA').resize((980, 980))
        c.putalpha(c.split()[3].point(lambda v: int(v*op))); bg.alpha_composite(c, pos)

    # tấm nền chữ: chỗ sửa chính, lấp toàn bộ nửa trái
    tam = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dt = ImageDraw.Draw(tam)
    dt.rounded_rectangle((150, 232, 1520, 1152), radius=52, fill=(6, 82, 47, 232))
    dt.rounded_rectangle((150, 232, 1520, 1152), radius=52, outline=(255, 255, 255, 46), width=3)
    bong = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(bong).rounded_rectangle((162, 250, 1532, 1170), radius=52, fill=(0, 30, 16, 150))
    bg = Image.alpha_composite(bg, bong.filter(ImageFilter.GaussianBlur(28)))
    vt = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dvt = ImageDraw.Draw(vt)
    for i in range(140, 1540, 26):
        dvt.line((i, 232, i - 200, 1152), fill=(255, 255, 255, 7), width=11)
    vt = Image.composite(vt, Image.new('RGBA', (W, H), (0, 0, 0, 0)),
                         Image.new('L', (W, H), 0).point(lambda v: 0))
    bg = Image.alpha_composite(bg, tam)
    van_tam = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dvt2 = ImageDraw.Draw(van_tam)
    for i in range(150, 1780, 17):
        dvt2.line((i, 232, i - 190, 1152), fill=(255, 255, 255, 17), width=7)
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((150, 232, 1520, 1152), radius=52, fill=255)
    van_tam.putalpha(Image.composite(van_tam.split()[3], Image.new('L', (W, H), 0), mask))
    bg = Image.alpha_composite(bg, van_tam)
    # cutout cầu thủ: cao hơn + kéo vào giữa
    cut = Image.open(cartoon).convert('RGBA')
    ch = 1220; cw = int(cut.width*ch/cut.height); cut = cut.resize((cw, ch), Image.LANCZOS)
    cx = max(1240, W - cw - 30)
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dk = Image.new('RGBA', cut.size, (0, 45, 25, 255))
    dk.putalpha(cut.split()[3].point(lambda v: int(v*.40))); sh.paste(dk, (cx+26, H-ch+34), dk)
    bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(20))); bg.paste(cut, (cx, H-ch), cut)

    d = ImageDraw.Draw(bg)
    lt = lambda t, x, y, f, c=(255,255,255): (d.text((x+4, y+5), t, font=f, fill=(0,0,0,120)), d.text((x, y), t, font=f, fill=c))
    stamp(bg, W)

    # Hàng logo TO và kéo rộng hết tấm nền: logo CLB đến rơi đúng ô 1/3 giữa.
    # Bản 300px cũ dồn cả hai logo về trái, để hở ô giữa (bài Delap ô giữa 72%).
    a = Image.open(badge_from).convert('RGBA').resize((380, 380)); b = Image.open(badge_to).convert('RGBA').resize((380, 380))
    bx, by = 230, 282; bg.paste(a, (bx, by), a)
    ax0, ax1, ay = bx+430, bx+700, by+190
    d.line((ax0, ay, ax1, ay), fill=VANG, width=22); d.polygon([(ax1+10, ay), (ax1-66, ay-50), (ax1-66, ay+50)], fill=VANG)
    bg.paste(b, (bx+760, by), b)

    # tên co lại nếu tràn khỏi tấm nền
    # Tên tự chọn cỡ LỚN NHẤT còn lọt 1240px — tên ngắn thì to, tên dài thì nhỏ.
    # Trước đây cố định 120px nên tên ngắn ("LIAM DELAP") để hở nửa hàng, ô giữa 72%.
    fn = F(96)
    for cs in range(190, 84, -4):
        f0 = F(cs)
        if d.textlength(name, font=f0) <= 1130:
            fn = f0
            break
    lt(name, 230, 762 - fn.size // 2, fn)
    # dòng 2 cũng phải co: bản đầu 26/8 chữ "phụ phí" tràn khỏi tấm nền, đè lên vai cầu thủ
    for cs2 in (52, 46, 42, 38, 34):
        f2 = FS(cs2)
        if d.textlength(line2, font=f2) <= 1240:
            break
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
