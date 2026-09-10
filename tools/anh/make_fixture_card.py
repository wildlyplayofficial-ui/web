"""Ảnh lịch thi đấu — banhbong. Khổ dọc 1080x1350 (fanpage) / 1080x1920 (story).

Jane dựng trên máy Windows, Gwen chuyển vào kho chung 10/9/2026. Khi chuyển phải sửa
ĐÚNG HAI LỖI mà DOC.md của thư mục này đã ghi "đừng lặp lại" — và cả hai đều tái diễn:

1. Font gọi cứng `C:/Windows/Fonts/...` → chạy trên Mac gãy ngay với "cannot open resource".
   Giờ đi qua `fonts_bb`, tự tra font đủ dấu tiếng Việt theo hệ điều hành.
2. Ảnh mở theo THƯ MỤC ĐANG ĐỨNG (`Image.open('wp-logo-white.png')`) → chạy từ thư mục
   khác là không thấy tệp. Giờ mở theo thư mục chứa script.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter

import brand_bb
from fonts_bb import F as _F, FS as _FS

_HERE = os.path.dirname(os.path.abspath(__file__))


def _tep(ten):
    """Đường dẫn theo THƯ MỤC CHỨA SCRIPT, không theo thư mục đang đứng."""
    return ten if os.path.isabs(ten) else os.path.join(_HERE, ten)

SHORT = {'Manchester United':'Man United','Manchester City':'Man City','Tottenham Hotspur':'Tottenham',
         'Brighton & Hove Albion':'Brighton','AFC Bournemouth':'Bournemouth','Nottingham Forest':"Nott'm Forest",
         'Newcastle United':'Newcastle','Leeds United':'Leeds','Coventry City':'Coventry','Ipswich Town':'Ipswich',
         'Hull City':'Hull City','Crystal Palace':'C.Palace'}
def slug(t): return t.lower().replace(' & ',' ').replace(' ','-')

NGUON = 'Nguồn: lịch chính thức các giải · giờ Việt Nam (UTC+7)'


def build(out, W=1080, H=1350, rowh=None, title='LỊCH THI ĐẤU VÒNG 1', sub='NGOẠI HẠNG ANH 2026/27 · GIỜ VIỆT NAM',
          pill_do=None, kenh=None, tep='r1_fixtures.json'):
    # 10/9/2026 Peter gửi ảnh mẫu "watchlist sẽ như này": pill ĐỎ tên giải trên cùng, gạch vàng dưới
    # dòng phụ, hàng tâm điểm viền vàng + nhãn TÂM ĐIỂM góc phải, chân ảnh có kênh phát sóng.
    # Ba tham số dưới là phần thêm; không truyền thì ra y như bản cũ của Gwen.
    F, FS, FR = _F, _FS, _FS
    fx = json.load(open(_tep(tep), encoding='utf-8'))
    bg = Image.new('RGB', (W, H), (11, 17, 23)); px = bg.load()
    for y in range(H):
        t = y / H; c = (int(11 + 8*(1-t)), int(30 + 26*(1-t)), int(22 + 18*(1-t)))
        for x in range(W): px[x, y] = c
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((-200, -320, W+200, 420), fill=90)
    bg = Image.composite(Image.new('RGB', (W, H), (0, 140, 80)), bg, glow.filter(ImageFilter.GaussianBlur(150))).convert('RGBA')
    d = ImageDraw.Draw(bg)
    logo = Image.open(brand_bb._asset('wp-logo-white.png')).convert('RGBA').resize((116, 116)); bg.paste(logo, (52, 44), logo)
    d.text((186, 62), 'banhbong', font=FS(46), fill=(255, 255, 255))   # doi ten 6/9/2026: WildlyPlay = banhbong.net
    d.text((186, 116), 'banhbong.net', font=FR(26), fill=(150, 220, 185))
    ctr = lambda t, y, f, c=(255,255,255): d.text(((W - d.textlength(t, font=f))/2, y), t, font=f, fill=c)
    if pill_do:
        pf = F(30); pw = d.textlength(pill_do, font=pf)
        d.rounded_rectangle((52, 172, 52+pw+72, 172+58), radius=29, fill=(214, 40, 48))
        d.text((88, 186), pill_do, font=pf, fill=(255, 255, 255))
        d.text((52, 250), title, font=F(62), fill=(255, 255, 255))
        d.text((56, 330), sub, font=FS(30), fill=(210, 232, 220))
        d.rounded_rectangle((52, 376, 470, 381), radius=3, fill=(255, 214, 64))
    else:
        ctr(title, 196, F(62)); ctr(sub, 272, FS(30), (0, 230, 118))
    rowh = rowh or (76 if H < 1500 else 96)
    dayh = 58 if H < 1500 else 66
    fnt_team = 27 if H < 1500 else 30
    y = (410 if pill_do else 330) if H < 1500 else (450 if pill_do else 380)
    day = None
    for m in fx:
        if m['d'] != day:
            day = m['d']
            d.rounded_rectangle((52, y, W-52, y+dayh-(20 if pill_do else 14)), radius=22, fill=(0, 230, 118))
            d.text((78, y+7), day.upper(), font=F(28), fill=(9, 30, 20)); y += dayh
        tam_diem = bool(m['n']) and 'tâm điểm' in m['n'].lower()
        ho = 22 if pill_do else 12   # 10/9 Peter: kieu moi can thoang hon
        d.rounded_rectangle((52, y, W-52, y+rowh-ho), radius=18, fill=(20, 32, 41),
                            outline=(255, 214, 64) if tam_diem else (40, 58, 70), width=3 if tam_diem else 2)
        if tam_diem and pill_do:
            nl = 'TÂM ĐIỂM'; nf = F(20); nw = d.textlength(nl, font=nf)
            d.text((W-72-nw, y+8), nl, font=nf, fill=(255, 214, 64))
        dy = 14 if pill_do else 0
        d.text((74, y+20+dy), m['t'], font=F(30), fill=(255, 214, 64))
        x = 190
        for team, align in ((m['h'], 'l'), (m['a'], 'r')):
            b = Image.open(f"badges/{slug(team)}.png").convert('RGBA').resize((52, 52))
            if align == 'l':
                bg.paste(b, (x, y+9+dy), b); d.text((x+62, y+20+dy), SHORT.get(team, team), font=FS(fnt_team), fill=(255,255,255))
            else:
                name = SHORT.get(team, team); tw = d.textlength(name, font=FS(fnt_team))
                d.text((W-96-tw, y+20+dy), name, font=FS(fnt_team), fill=(255,255,255)); bg.paste(b, (W-96-int(tw)-62, y+9+dy), b)
        d.text((W//2-16, y+22+dy), 'vs', font=FR(26), fill=(140, 160, 172))
        # Ghi chú: chỉ in trong hàng ở khổ cao. Khổ 4:5 chật -> gom xuống chân ảnh,
        # in trong hàng là chữ đè lên viền (đã thử, xấu).
        if m['n'] and rowh >= 90 and not pill_do:  # kieu moi da co nhan TAM DIEM goc phai
            d.text((190, y+52), m['n'], font=FR(20), fill=(0, 200, 130))
        y += rowh
    # CHỐT CHẶN: hàng cuối không được đụng chân ảnh (10/9: hàng derby đè lên dòng banhbong.net).
    if y > H - 110:
        raise SystemExit('DUNG: %d hang tran khong vua khung %dx%d (het o y=%d, chan anh o %d) - ha rowh hoac bot tran'
                         % (len(fx), W, H, y, H - 110))
    if rowh < 90 and not pill_do:
        hi = next((m for m in fx if 'Tâm điểm' in m['n']), None)
        if hi:
            d.text((52, H-116), f"◆ Tâm điểm vòng 1: {SHORT.get(hi['h'],hi['h'])} – {SHORT.get(hi['a'],hi['a'])} · {hi['t']} {hi['d'].split()[-1]}",
                   font=FS(26), fill=(255, 214, 64))
    if kenh:
        d.ellipse((52, H-78, 74, H-56), fill=(214, 40, 48))
        d.text((86, H-82), 'banhbong.net', font=F(32), fill=(255, 255, 255))
        kw = d.textlength(kenh, font=FS(26))
        d.text((W-52-kw, H-78), kenh, font=FS(26), fill=(180, 200, 190))
    else:
        d.text((52, H-72), NGUON, font=FR(24), fill=(130, 150, 162))
    bg.convert('RGB').save(out, quality=94)
    print('saved', out, (W, H), 'kết thúc y =', y)

def build_deu(out, tep, title, sub, pill_do, kenh, W=1080, H=1620, rowh=156, hien_ngay=True,
              thu_muc_badge='badges'):
    """Khuôn ĐỀU theo ảnh mẫu Peter gửi 10/9/2026 ("đều như này"): KHÔNG có dải ngăn ngày,
    mọi hàng CAO BẰNG NHAU và cách đều; huy hiệu nằm TRÊN, tên đội nằm dưới, gạch ngang ở giữa;
    hàng đáng xem viền vàng + nhãn TÂM ĐIỂM góc phải. Ngày ghi nhỏ trong ô giờ để hàng vẫn đều.
    Bản build() cũ giữ nguyên cho các bài lịch vòng của Gwen."""
    F, FS = _F, _FS
    fx = json.load(open(_tep(tep), encoding='utf-8'))
    bg = Image.new('RGB', (W, H), (12, 46, 32)); px = bg.load()
    for y in range(H):
        t = y / H
        c = (int(10 + 12 * (1 - t)), int(52 + 26 * (1 - t)), int(36 + 16 * (1 - t)))
        for x in range(W):
            px[x, y] = c
    bg = bg.convert('RGBA')
    d = ImageDraw.Draw(bg)
    pf = F(34); pw = d.textlength(pill_do, font=pf)
    d.rounded_rectangle((56, 52, 56 + pw + 76, 52 + 64), radius=32, fill=(214, 40, 48))
    d.text((94, 68), pill_do, font=pf, fill=(255, 255, 255))
    d.text((56, 146), title, font=F(70), fill=(255, 255, 255))
    d.text((60, 240), sub, font=FS(32), fill=(214, 235, 222))
    d.rounded_rectangle((56, 292, 470, 298), radius=3, fill=(214, 178, 70))
    y = 340
    for m in fx:
        cao = rowh - 12
        td = bool(m.get('n')) and 'tâm điểm' in m['n'].lower()
        d.rounded_rectangle((44, y, W - 44, y + cao), radius=20,
                            fill=(31, 78, 56), outline=(214, 178, 70) if td else None, width=3 if td else 0)
        if td:
            nl = 'TÂM ĐIỂM'; nf = F(22); nw = d.textlength(nl, font=nf)
            d.text((W - 68 - nw, y + 16), nl, font=nf, fill=(214, 178, 70))
        d.text((78, y + (38 if (m.get('d') and hien_ngay) else 52)), m['t'], font=F(40), fill=(255, 206, 84))
        if m.get('d') and hien_ngay:
            d.text((78, y + 90), m['d'], font=FS(20), fill=(150, 190, 168))
        for team, cx in ((m['h'], 330), (m['a'], 700)):
            # Thiếu huy hiệu thì BÁO TÊN ĐỘI rồi vẽ tiếp, đừng ném FileNotFoundError trần —
            # lỗi trần không nói đội nào thiếu, người sửa phải đi dò. Đội mới lên hạng hay
            # đội cúp châu Âu lạ là hay thiếu (thử 10/9: Sabah Baku không có trong kho).
            _hh = _tep('%s/%s.png' % (thu_muc_badge, slug(team)))
            if not os.path.exists(_hh):
                print('THIEU HUY HIEU: %s -> %s (bo qua, van ve ten doi)' % (team, _hh), file=sys.stderr)
                continue
            b = Image.open(_hh).convert('RGBA')
            r0 = min(92 / b.width, 92 / b.height)
            b = b.resize((int(b.width * r0), int(b.height * r0)), Image.LANCZOS)
            bg.paste(b, (cx - b.width // 2, y + 12), b)
            ten = SHORT.get(team, team); tw = d.textlength(ten, font=FS(26))
            d.text((cx - tw / 2, y + 106), ten, font=FS(26), fill=(255, 255, 255))
        d.text((W // 2 - 8, y + 52), '–', font=F(34), fill=(190, 210, 198))
        if 106 + 34 > cao:
            raise SystemExit('DUNG: ten doi tran ra ngoai hang (cao=%d) - tang rowh' % cao)
        y += rowh
    if y > H - 120:
        raise SystemExit('DUNG: %d hang khong vua khung %dx%d (het o y=%d)' % (len(fx), W, H, y))
    d.ellipse((56, H - 84, 80, H - 60), fill=(214, 40, 48))
    d.text((94, H - 90), 'banhbong.net', font=F(34), fill=(255, 255, 255))
    kw = d.textlength(kenh, font=FS(28))
    d.text((W - 56 - kw, H - 86), kenh, font=FS(28), fill=(186, 210, 196))
    bg.convert('RGB').save(out, quality=94)
    print('saved', out, (W, H), 'ket thuc y =', y)


if __name__ == '__main__':
    build(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))

