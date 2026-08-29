"""Ảnh OG trang trận — layout 2 cột theo mẫu anh Nick gửi 21/8.
Trái: logo bb + nhãn + giải + 2 huy hiệu (VS ở giữa) + tên đội.
Phải: khung trong suốt viền vàng — dự đoán / mức tự tin / giờ đá.
Chữ tiếng Việt, KHÔNG tỷ lệ, KHÔNG đơn vị cược."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pitch_bg import draw as pitch

# Chuyển từ bản gốc của Jane (chạy trên Windows) sang chạy được cả hai máy:
# mọi đường dẫn tính từ vị trí tệp này, không ghi cứng ổ C.
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', 'apps', 'web'))
BADGES = json.load(open(os.path.join(REPO, 'lib', 'data', 'club-badges.json')))
BU = {'Malaga': 'logo_them/malaga.png', 'Ipswich': 'logo_them/ipswich.png',
      'Bayern München': 'logo_them/bayern.png', 'Lille': 'logo_them/lille.png'}
MUC_TU_TIN = ('THẤP', 'VỪA', 'CAO')   # chốt cứng, đừng ghi TRUNG BÌNH


def huy_hieu(ten):
    """Đường dẫn huy hiệu theo TÊN ĐẦY ĐỦ trong kho. Tên tắt sẽ không khớp."""
    if ten in BU:
        return os.path.join(HERE, BU[ten])
    u = BADGES.get(ten)
    if not u:
        return None
    p = os.path.join(REPO, 'public', 'badges', os.path.basename(u))
    return p if os.path.exists(p) else None


def anh_cau_thu(club_slug):
    """Ảnh cầu thủ vẽ — có sẵn trong repo, đừng chép trùng.

    ⚠️ Thư mục này nằm trên nhánh main. Nhánh làm việc có thể KHÔNG có nó
    (Gwen dính 29/8: dựng ra thẻ thiếu hẳn cầu thủ mà không báo lỗi gì).
    Nên nếu cây làm việc không có thì lấy thẳng từ origin/main về thư mục tạm.
    """
    duong = f'apps/web/public/og/players/{club_slug}.png'
    p = os.path.join(REPO, 'public', 'og', 'players', f'{club_slug}.png')
    if os.path.exists(p):
        return p
    tam = os.path.join(HERE, '.anh-tam')
    os.makedirs(tam, exist_ok=True)
    q = os.path.join(tam, f'{club_slug}.png')
    if not os.path.exists(q):
        import subprocess
        r = subprocess.run(['git', '-C', os.path.join(HERE, '..', '..'),
                            'show', f'origin/main:{duong}'], capture_output=True)
        if r.returncode != 0 or not r.stdout:
            print(f'  ⚠️ KHÔNG có ảnh cầu thủ cho {club_slug}')
            return None
        open(q, 'wb').write(r.stdout)
    return q
W, H = 1200, 630
# Barlow Condensed — chất thể thao, ĐÃ kiểm đủ dấu tiếng Việt 21/8.
# (BebasNeue bị loại: thiếu dấu, render ra ô vuông.)
_FD = os.path.join(HERE, 'fonts') + os.sep
F  = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-ExtraBold.ttf', s)
FS = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-SemiBold.ttf', s)
GOLD = (255, 214, 64)


# ── biểu tượng vẽ bằng PIL (không dùng font emoji) ─────────────
def ic_coins(d, x, cy, c=GOLD):
    """chồng xu — cho Đơn vị"""
    for i, dy in enumerate((7, 1, -5)):
        d.ellipse((x, cy + dy - 4, x + 22, cy + dy + 4), fill=c,
                  outline=(120, 92, 12), width=1)
    return 22


def ic_shield(d, x, cy, c=GOLD):
    """khiên — cho Tự tin"""
    w, h = 20, 24
    t, b = cy - h // 2, cy + h // 2
    d.polygon([(x, t + 3), (x + w // 2, t), (x + w, t + 3), (x + w, cy + 2),
               (x + w // 2, b), (x, cy + 2)], fill=c)
    return w


def ic_clock(d, x, cy, c=GOLD):
    """đồng hồ — cho Giờ đá"""
    r = 11
    d.ellipse((x, cy - r, x + 2 * r, cy + r), outline=c, width=3)
    d.line((x + r, cy - 6, x + r, cy), fill=c, width=3)
    d.line((x + r, cy, x + r + 6, cy + 3), fill=c, width=3)
    return 2 * r


def _fit(d, t, f_fn, size, maxw, minsize=16):
    f = f_fn(size)
    while d.textlength(t, font=f) > maxw and f.size > minsize:
        f = f_fn(f.size - 2)
    return f



def hai_huy_hieu_to(im, badge_home, badge_away):
    """Không có ảnh cầu thủ (giải ngoài Ngoại hạng Anh) → lấp nửa phải bằng
    hai huy hiệu cỡ lớn thay vì để trống. Có quầng sáng mờ cho khỏi trơ."""
    def mo(duong, cao):
        b = Image.open(duong).convert('RGBA')
        sc = cao / max(b.width, b.height)
        return b.resize((int(b.width * sc), int(b.height * sc)), Image.LANCZOS)

    quang = Image.new('L', (W, H), 0)
    ImageDraw.Draw(quang).ellipse((660, 60, 1230, 620), fill=54)
    im = Image.composite(Image.new('RGB', (W, H), (120, 220, 170)).convert('RGBA'), im,
                         quang.filter(ImageFilter.GaussianBlur(120)))
    for duong, cao, tam in ((badge_home, 296, (736, 62)), (badge_away, 296, (872, 296))):
        if not duong:
            continue
        b = mo(duong, cao)
        bong = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        bong.alpha_composite(Image.new('RGBA', b.size, (0, 0, 0, 0)))
        im.alpha_composite(b, (tam[0] + (cao - b.width) // 2, tam[1] + (cao - b.height) // 2))
    return im


def build(player_png, league, home, away, pred, conf, kickoff, out,
          badge_home=None, badge_away=None, stake=None):
    # conf=None = thẻ CHỜ PICK: dựng sẵn đủ đội/giờ/huy hiệu, chừa ô dự đoán trống.
    if conf is not None and conf not in MUC_TU_TIN:
        raise ValueError(f'mức tự tin phải là một trong {MUC_TU_TIN}, nhận được {conf!r}')
    im = Image.new('RGB', (W, H)); px = im.load()
    c1, c2 = (10, 92, 52), (3, 40, 24)
    for x in range(W):
        t = x / W
        col = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        for y in range(H): px[x, y] = col
    im = im.convert('RGBA')
    im = pitch(im, alpha=28)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-280, -170, 620, 720), fill=52)
    im = Image.composite(Image.new('RGB', (W, H), (30, 150, 88)).convert('RGBA'), im,
                         glow.filter(ImageFilter.GaussianBlur(170)))

    # cầu thủ bám mép phải, kéo rộng cho hết khoảng trống giữa
    if player_png and player_png != 'none':
        pl = Image.open(player_png).convert('RGBA')
        ph = 604; pw = int(pl.width * ph / pl.height)
        pl = pl.resize((pw, ph), Image.LANCZOS)
        im.alpha_composite(pl, (W - pw + 34, H - ph))
    else:
        # kho ảnh vẽ mới chỉ có Ngoại hạng Anh — giải khác thì lấp bằng huy hiệu to
        im = hai_huy_hieu_to(im, badge_home, badge_away)

    # lớp tối mờ nửa trái — chữ trắng/vàng nổi, vẫn thấy sân cỏ
    sm = Image.new('L', (W, 1)); smp = sm.load()
    for x in range(W):
        smp[x, 0] = 120 if x < 470 else max(0, int(120 * (1 - (x - 470) / 230)))
    scrim = Image.new('RGBA', (W, H), (0, 26, 14, 255))
    scrim.putalpha(sm.resize((W, H)))
    im.alpha_composite(scrim)

    d = ImageDraw.Draw(im)
    sh = lambda t, x, y, f, c=(255, 255, 255): (d.text((x + 3, y + 4), t, font=f, fill=(0, 0, 0, 160)),
                                                d.text((x, y), t, font=f, fill=c))

    # ── đầu trang ────────────────────────────────────────────
    mk = Image.open(os.path.join(HERE, 'bb-mark-color.png')).convert('RGBA')
    ms = 50; mk = mk.resize((ms, int(mk.height * ms / mk.width)), Image.LANCZOS)
    im.alpha_composite(mk, (50, 32))
    d = ImageDraw.Draw(im)
    d.polygon([(122, 60), (131, 51), (140, 60), (131, 69)], fill=GOLD)
    d.text((152, 44), 'NHẬN ĐỊNH NỔI BẬT', font=F(26), fill=GOLD)
    d.text((50, 96), league, font=FS(24), fill=(190, 232, 208))

    # ── tên đội: huy hiệu đứng TRƯỚC tên, xếp chồng ─────────
    BS, NX = 64, 134
    def row(badge, name, y):
        nonlocal im, d
        if badge:
            b = Image.open(badge).convert('RGBA')
            sc = BS / max(b.width, b.height)
            b = b.resize((int(b.width * sc), int(b.height * sc)), Image.LANCZOS)
            im.alpha_composite(b, (50 + (BS - b.width) // 2, y - 4))
            d = ImageDraw.Draw(im)
        f = _fit(d, name.upper(), F, 52, 470)
        sh(name.upper(), NX, y, f)

    row(badge_home, home, 142)
    d = ImageDraw.Draw(im)
    sh('VS', NX, 214, F(30), GOLD)
    row(badge_away, away, 256)
    d = ImageDraw.Draw(im)

    # ── khung dự đoán ───────────────────────────────────────
    PX0, PY0, PX1, PY1 = 44, 336, 616, 528
    panel = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(panel).rounded_rectangle((PX0, PY0, PX1, PY1), 20,
                                            fill=(1, 30, 18, 150), outline=GOLD, width=3)
    im.alpha_composite(panel)
    d = ImageDraw.Draw(im)

    pt = pred.upper()
    pf = _fit(d, pt, F, 82, PX1 - PX0 - 56, 40)
    sh(pt, PX0 + 28, PY0 + 16, pf, GOLD)
    d.line((PX0 + 28, PY0 + 118, PX1 - 28, PY0 + 118), fill=(255, 214, 64, 110), width=2)

    # ── một hàng: Đơn vị · Tự tin · Giờ đá ──────────────────
    items = []
    if stake:
        items.append((ic_coins, 'Đơn vị: ', str(stake)))
    if conf:
        items.append((ic_shield, 'Tự tin: ', conf))
    items.append((ic_clock, '', kickoff))
    size, GAPI, SEP = 24, 9, 22
    while size > 13:
        fl, fv = FS(size), F(size)
        w = sum(24 + GAPI + d.textlength(l, font=fl) + d.textlength(v, font=fv)
                for _, l, v in items) + SEP * (len(items) - 1)
        if w <= PX1 - PX0 - 56:
            break
        size -= 1
    x, cy = PX0 + 28, PY0 + 152
    for i, (icon, lab, val) in enumerate(items):
        icon(d, int(x), cy); x += 24 + GAPI
        if lab:
            d.text((x, cy - 15), lab, font=fl, fill=(226, 240, 234)); x += d.textlength(lab, font=fl)
        d.text((x, cy - 15), val, font=fv, fill=GOLD); x += d.textlength(val, font=fv)
        if i < len(items) - 1:
            d.line((x + SEP / 2, cy - 14, x + SEP / 2, cy + 14), fill=(255, 214, 64, 110), width=2)
            x += SEP

    d.text((50, H - 62), 'banhbong.net', font=FS(28), fill=(190, 232, 208))
    im.convert('RGB').save(out, quality=92, optimize=True)
    print('saved', out)


if __name__ == '__main__':
    # SỐ MẪU — thay bằng pick thật của anh Nick
    build(anh_cau_thu('manchester-united'), 'Ngoại hạng Anh 2026/27',
          'Manchester United', 'Ipswich Town', 'Over 3.0', 'VỪA', '30/08 · 22:30',
          'pick-mu-ipswich.png',
          huy_hieu('Manchester United'), huy_hieu('Ipswich'), '0,25')
