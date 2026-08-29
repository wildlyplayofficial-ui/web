"""Thumbnail từng trận 1200x628 cho banhbong — mẫu gửi anh Nick duyệt."""
import json
import os

from PIL import Image, ImageDraw, ImageFont

REPO = '/Users/peter/wildlyplay/apps/web'
MAP = json.load(open(f'{REPO}/lib/data/club-badges.json'))
BU = {'Malaga': 'logo_them/malaga.png', 'Ipswich': 'logo_them/ipswich.png',
      'Bayern München': 'logo_them/bayern.png', 'Lille': 'logo_them/lille.png'}

B, M = 'SG-Bold.ttf', 'SG-Medium.ttf'
f = lambda p, s: ImageFont.truetype(p, s)
XANH, NEN = '#00e676', '#080c11'

TRAN = [
    ('juventus-parma', 'Juventus', 'Parma', 'Juventus', 'Parma',
     '01:45 · CHỦ NHẬT 30/08', 'SERIE A'),
    ('sevilla-atletico', 'Sevilla', 'Atletico Madrid', 'Sevilla', 'Atlético Madrid',
     '02:30 · CHỦ NHẬT 30/08', 'LA LIGA'),
    ('chelsea-brighton', 'Chelsea', 'Brighton & Hove Albion', 'Chelsea', 'Brighton',
     '20:00 · CHỦ NHẬT 30/08', 'NGOẠI HẠNG ANH'),
    ('real-malaga', 'Real Madrid', 'Malaga', 'Real Madrid', 'Málaga',
     '22:00 · CHỦ NHẬT 30/08', 'LA LIGA'),
    ('mu-ipswich', 'Manchester United', 'Ipswich', 'Man United', 'Ipswich Town',
     '22:30 · CHỦ NHẬT 30/08', 'NGOẠI HẠNG ANH'),
    ('monaco-marseille', 'Monaco', 'Marseille', 'Monaco', 'Marseille',
     '01:45 · THỨ HAI 31/08', 'LIGUE 1'),
]


def logo(ten, cao):
    p = BU.get(ten)
    if not p:
        u = MAP.get(ten)
        p = os.path.join(f'{REPO}/public/badges', os.path.basename(u)) if u else None
    if p and os.path.exists(p):
        im = Image.open(p).convert('RGBA')
        return im.resize((max(1, int(im.width * cao / im.height)), cao), Image.LANCZOS)
    return None


W, H = 1200, 628
for slug, kn, kk, tn, tk, gio, giai in TRAN:
    im = Image.new('RGB', (W, H), NEN)
    d = ImageDraw.Draw(im)
    for i in range(H):                       # nền dốc xanh đậm
        k = 1 - i / H
        d.line([(0, i), (W, i)], fill=(int(8 + 10 * k), int(20 + 30 * k), int(16 + 22 * k)))
    d.ellipse([-160, H - 150, 300, H + 250], outline='#12281e', width=3)
    d.ellipse([W - 300, -260, W + 160, 140], outline='#12281e', width=3)

    bb = Image.open('bb-mark-white.png').convert('RGBA')
    bb = bb.resize((54, int(bb.height * 54 / bb.width)), Image.LANCZOS)
    im.paste(bb, (44, 40), bb)
    d.text((112, 46), 'banhbong.net', font=f(B, 24), fill=XANH)
    d.text((W - 44 - d.textlength(giai, font=f(B, 22)), 50), giai, font=f(B, 22), fill='#5ce0a0')

    cao_lg = 170
    la, lb = logo(kn, cao_lg), logo(kk, cao_lg)
    y_lg = 176
    if la:
        im.paste(la, (170 - la.width // 2, y_lg), la)
    if lb:
        im.paste(lb, (W - 170 - lb.width // 2, y_lg), lb)

    d.text((W // 2 - d.textlength('VS', font=f(B, 56)) / 2, y_lg + 46), 'VS', font=f(B, 56), fill='#2c4a3a')

    for x, ten in ((170, tn), (W - 170, tk)):
        w = d.textlength(ten, font=f(B, 34))
        d.text((x - w / 2, y_lg + cao_lg + 22), ten, font=f(B, 34), fill='#ffffff')

    d.rounded_rectangle([W // 2 - 240, H - 116, W // 2 + 240, H - 44], 14, fill='#0e2018', outline=XANH, width=2)
    w = d.textlength(gio, font=f(B, 30))
    d.text((W // 2 - w / 2, H - 102), gio, font=f(B, 30), fill=XANH)
    d.text((44, H - 40), 'giờ Việt Nam', font=f(M, 18), fill='#6f8296')

    im.save(f'thumb-{slug}.png')
    print('OK', slug)
