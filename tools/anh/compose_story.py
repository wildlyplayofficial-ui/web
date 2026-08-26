"""Ảnh story dọc 1080x1920 cho banhbong.net từ ảnh bìa ngang 2400x1260.

usage: python compose_story.py <hero_ngang.png> "<tiêu đề>" "<nhãn pill>" <out.png>

Bố cục: nền = chính ảnh bìa phóng to phủ kín + làm mờ (không còn mảng xanh trống),
ảnh bìa nét bo góc nằm giữa, tiêu đề tiếng Việt tự xuống dòng, pill vàng trên và dưới.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H = 1080, 1920
VANG = (255, 214, 64)
from fonts_bb import F, FS   # font tự tra theo hệ điều hành, xem fonts_bb.py

import os as _os
from brand_bb import _asset   # dùng chung: tìm asset trong repo trước


def _nen_phu_kin(hero):
    """Phóng ảnh bìa phủ kín khung dọc rồi làm mờ — hết mảng trống, vẫn đúng tông xanh."""
    a = Image.open(hero).convert('RGB')
    ti = max(W / a.width, H / a.height)
    a = a.resize((int(a.width * ti) + 1, int(a.height * ti) + 1), Image.LANCZOS)
    a = a.crop(((a.width - W) // 2, (a.height - H) // 2,
                (a.width - W) // 2 + W, (a.height - H) // 2 + H))
    a = a.filter(ImageFilter.GaussianBlur(46))
    a = ImageEnhance.Brightness(a).enhance(0.82)
    # phủ nhẹ tối dần xuống đáy cho chữ nổi
    ph = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = ph.load()
    for y in range(H):
        px[0, y] = (4, 60, 34, int(30 + 120 * (y / H)))
    ph = ph.resize((W, H))
    for y in range(H):
        c = (4, 60, 34, int(30 + 120 * (y / H)))
        ImageDraw.Draw(ph).line((0, y, W, y), fill=c)
    return Image.alpha_composite(a.convert('RGBA'), ph)


def _bo_goc(im, r):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=r, fill=255)
    im = im.convert('RGBA'); im.putalpha(m)
    return im


def _xuong_dong(d, text, font, rong):
    dong, cur = [], ''
    for tu in text.split():
        thu = (cur + ' ' + tu).strip()
        if d.textlength(thu, font=font) <= rong:
            cur = thu
        else:
            if cur:
                dong.append(cur)
            cur = tu
    if cur:
        dong.append(cur)
    return dong


def _pill(bg, x, y, chu, font, fill=VANG, mau_chu=(20, 20, 20), pad=40, cao=76):
    d = ImageDraw.Draw(bg)
    w = d.textlength(chu, font=font)
    d.rounded_rectangle((x, y, x + w + pad * 2, y + cao), radius=cao // 2, fill=fill)
    d.text((x + pad, y + (cao - font.size) // 2 - 4), chu, font=font, fill=mau_chu)
    return w + pad * 2


def build(hero, tieu_de, pill, out):
    bg = _nen_phu_kin(hero)
    d = ImageDraw.Draw(bg)

    # nhãn hiệu trên đầu
    mark = Image.open(_asset('bb-mark-white.png')).convert('RGBA')
    mw = 96; mark = mark.resize((mw, int(mark.height * mw / mark.width)), Image.LANCZOS)
    bg.alpha_composite(mark, (70, 128))
    fu = FS(40)
    d.text((W - d.textlength('banhbong.net', font=fu) - 70, 142), 'banhbong.net', font=fu, fill=(255, 255, 255))

    _pill(bg, 70, 276, pill, F(38))

    # ảnh bìa nét, bo góc + bóng đổ
    aw = W - 120
    a = Image.open(hero).convert('RGB')
    a = a.resize((aw, int(a.height * aw / a.width)), Image.LANCZOS)
    a = _bo_goc(a, 34)
    ax, ay = 60, 416
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dk = Image.new('RGBA', a.size, (0, 30, 16, 255)); dk.putalpha(a.split()[3].point(lambda v: int(v * .55)))
    sh.paste(dk, (ax + 10, ay + 26), dk)
    bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(30)))
    bg.paste(a, (ax, ay), a)
    d = ImageDraw.Draw(bg)

    # tiêu đề: chiếm trọn khoảng giữa ảnh và chân, co cỡ chữ nếu quá 5 dòng
    y = ay + a.height + 84
    for cs in (86, 78, 70, 62, 56):
        f = F(cs); dong = _xuong_dong(d, tieu_de, f, W - 140)
        if len(dong) <= 5:
            break
    lh = int(cs * 1.22)
    for i, ln in enumerate(dong):
        yy = y + i * lh
        d.text((74, yy + 6), ln, font=f, fill=(0, 0, 0))
        d.text((70, yy), ln, font=f, fill=(255, 255, 255))

    # chân: CHỈ tên miền. Peter chốt 26/8 BỎ chữ "vuốt lên đọc bài" — story của page
    # không phải lúc nào cũng gắn link được, câu đó thành lời hứa suông.
    ff = FS(38); ft = 'banhbong.net'
    d.text(((W - d.textlength(ft, font=ff)) // 2, H - 300), ft, font=ff, fill=(255, 255, 255))

    bg.convert('RGB').save(out, optimize=True)
    bg.convert('RGB').save(out.replace('.png', '.jpg'), quality=92, optimize=True)
    print('saved', out)


if __name__ == '__main__':
    build(*sys.argv[1:5])
