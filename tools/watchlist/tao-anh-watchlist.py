"""Thẻ Watchlist banhbong — bản 2.

Sửa theo Peter: bỏ trận đã đá, thêm logo đội, làm đúng tông thương hiệu.
Logo lấy từ kho có sẵn trong repo (apps/web/public/badges), không tải lung tung.
"""
import datetime as dt
import json
import os

from PIL import Image, ImageDraw, ImageFont

REPO = '/Users/peter/wildlyplay/apps/web'
BADGE_DIR = f'{REPO}/public/badges'
MAP = json.load(open(f'{REPO}/lib/data/club-badges.json'))

B, M = 'SG-Bold.ttf', 'SG-Medium.ttf'
f = lambda p, s: ImageFont.truetype(p, s)
XANH, NEN, XAM = '#00e676', '#080c11', '#7f8ea3'

# (ngày, giờ, đội nhà, đội khách, tên hiển thị nhà, khách, giải, khung giờ đẹp)
TRAN = [
    ('28/08', '02:00', 'Barcelona', 'Athletic Club', 'Barcelona', 'Athletic Club', 'La Liga', False),
    ('29/08', '01:30', 'Bayern München', 'VfB Stuttgart', 'Bayern', 'Stuttgart', 'Bundesliga', False),
    ('29/08', '01:45', 'Lille', 'Paris Saint-Germain', 'Lille', 'PSG', 'Ligue 1', False),
    ('29/08', '02:00', 'Crystal Palace', 'Manchester City', 'Crystal Palace', 'Man City', 'Ngoại hạng Anh', False),
    ('29/08', '18:30', 'Liverpool', 'Nottingham Forest', 'Liverpool', "Nott'm Forest", 'Ngoại hạng Anh', True),
    ('29/08', '23:30', 'Tottenham Hotspur', 'Newcastle United', 'Tottenham', 'Newcastle', 'Ngoại hạng Anh', False),
    ('30/08', '01:45', 'Juventus', 'Parma', 'Juventus', 'Parma', 'Serie A', False),
    ('30/08', '02:30', 'Sevilla', 'Atletico Madrid', 'Sevilla', 'Atlético', 'La Liga', False),
    ('30/08', '20:00', 'Chelsea', 'Brighton & Hove Albion', 'Chelsea', 'Brighton', 'Ngoại hạng Anh', True),
    ('30/08', '22:00', 'Real Madrid', 'Malaga', 'Real Madrid', 'Malaga', 'La Liga', True),
    ('30/08', '22:30', 'Manchester United', 'Ipswich', 'Man United', 'Ipswich', 'Ngoại hạng Anh', True),
    ('31/08', '01:45', 'Monaco', 'Marseille', 'Monaco', 'Marseille', 'Ligue 1', False),
]
TEN_NGAY = {'29/08': 'THỨ BẢY 29/08', '30/08': 'CHỦ NHẬT 30/08', '31/08': 'THỨ HAI 31/08'}

bay_gio = dt.datetime.now()


def da_da(ngay, gio):
    d_, m_ = map(int, ngay.split('/'))
    h_, i_ = map(int, gio.split(':'))
    return dt.datetime(bay_gio.year, m_, d_, h_, i_) <= bay_gio


con = [t for t in TRAN if not da_da(t[0], t[1])]
bo = len(TRAN) - len(con)


# Kho trong repo trả NHẦM đội cho 2 cái này: 'Bayern München' ra đội BÓNG RỔ,
# 'Lille' ra đội KHÚC CÔN CẦU. Bắt được bằng mắt 28/8. Lấy đúng đội bóng đá về đây.
BU = {'Malaga': 'logo_them/malaga.png', 'Ipswich': 'logo_them/ipswich.png',
      'Bayern München': 'logo_them/bayern.png', 'Lille': 'logo_them/lille.png'}


def logo(ten, cao=52):
    if ten in BU:
        im = Image.open(BU[ten]).convert('RGBA')
        return im.resize((max(1, int(im.width * cao / im.height)), cao), Image.LANCZOS)
    u = MAP.get(ten)
    if u:
        p = os.path.join(BADGE_DIR, os.path.basename(u))
        if os.path.exists(p):
            im = Image.open(p).convert('RGBA')
            w = max(1, int(im.width * cao / im.height))
            return im.resize((w, cao), Image.LANCZOS)
    return None


W = 1080
theo_ngay = {}
for t in con:
    theo_ngay.setdefault(t[0], []).append(t)
cao = 200 + sum(56 + len(v) * 92 for v in theo_ngay.values()) + 150

im = Image.new('RGB', (W, cao), NEN)
d = ImageDraw.Draw(im)
for i in range(170):                       # dải sáng đầu trang
    k = 1 - i / 170
    d.line([(0, i), (W, i)], fill=(int(8 + 12 * k), int(30 + 26 * k), int(20 + 18 * k)))
d.rectangle([0, 168, W, 172], fill=XANH)

bb = Image.open('bb-mark-white.png').convert('RGBA')
bb = bb.resize((66, int(bb.height * 66 / bb.width)), Image.LANCZOS)
im.paste(bb, (40, 34), bb)
d.text((124, 30), 'LỊCH TRẬN ĐÁNG XEM', font=f(B, 46), fill=XANH)
d.text((126, 92), 'giờ Việt Nam · cập nhật %s' % bay_gio.strftime('%H:%M %d/%m'),
       font=f(M, 22), fill='#8fd6b0')
d.text((W - 240, 100), 'banhbong.net', font=f(B, 24), fill=XANH)

y = 200
for ngay in sorted(theo_ngay, key=lambda x: (x[3:], x[:2])):
    d.text((40, y), TEN_NGAY[ngay], font=f(B, 27), fill='#5ce0a0')
    d.line([(40, y + 40), (W - 40, y + 40)], fill='#173026', width=2)
    y += 56
    for _, gio, kn, kk, tn, tk, giai, dep in theo_ngay[ngay]:
        if dep:
            d.rounded_rectangle([28, y - 6, W - 28, y + 78], 10, fill='#0e2018')
            d.rounded_rectangle([28, y - 6, 34, y + 78], 3, fill=XANH)
        d.text((48, y + 22), gio, font=f(B, 30), fill=XANH if dep else '#cfe8dc')
        x = 178
        for ten in (kn, kk):
            lg = logo(ten)
            if lg:
                im.paste(lg, (x, y + 8), lg)
            else:
                d.ellipse([x, y + 8, x + 52, y + 60], outline='#3a4a5c', width=2)
                d.text((x + 14, y + 24), ten[:2].upper(), font=f(B, 20), fill=XAM)
            x += 64
        d.text((320, y + 6), f'{tn}  —  {tk}', font=f(B, 26), fill='#ffffff')
        d.text((322, y + 42), giai, font=f(M, 19), fill=XAM)
        y += 92
    y += 6

d.line([(40, cao - 118), (W - 40, cao - 118)], fill='#173026', width=2)
d.text((40, cao - 98), 'Vạch xanh = khung giờ đẹp, ưu tiên lên bài trước', font=f(M, 19), fill=XAM)
d.text((40, cao - 68), 'Đã bỏ %d trận đá xong · đội hình chốt trước bóng lăn 60 phút' % bo,
       font=f(M, 19), fill=XAM)

im.save('lich-tran-v2.png')
print('OK', im.size, '· còn', len(con), 'trận · bỏ', bo)
