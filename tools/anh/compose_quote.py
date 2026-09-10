"""Thẻ TRÍCH DẪN banhbong — hai cầu thủ nói qua nói lại sau trận (1080x1350).

Peter đưa mẫu 10/9/2026: thẻ kiểu The Athletic, ba khối chữ xen ba ảnh chụp màn
hình phỏng vấn. Khuôn này lấy Ý (đoạn hội thoại sau trận, mỗi câu một khối, ghi
rõ ai nói) nhưng KHÔNG lấy hình: ảnh trong mẫu là ảnh chụp màn hình Sky Sports.
Ở đây dùng ảnh chân dung của chính mình, mỗi người một lần, không lặp ảnh.

Chữ trên thẻ là TIẾNG VIỆT vì trang chỉ có tiếng Việt. Nguyên văn tiếng Anh để
trong thân bài, không nhét lên thẻ — thẻ nhỏ, nhồi hai thứ tiếng là không đọc nổi.

Chạy:
    python compose_quote.py the.json ra.png

Tệp JSON:
    {"pill": "CÚP LIÊN ĐOÀN ANH · CHELSEA 6-3 LEEDS",
     "nguoi": [{"ten": "Morgan Rogers", "anh": "rogers.png"},
                {"ten": "Cole Palmer",   "anh": "palmer.png"}],
     "cau": [{"ai": 0, "loi": "..."}, {"ai": 1, "loi": "..."}],
     "nguon": "Sky Sports"}
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFilter

import brand_bb
from fonts_bb import F, FS

W = 1080
H_TOI_THIEU = 1080         # thẻ ngắn quá thì nhìn cụt, dài quá thì hở đáy
LE = 70
NEN = (9, 38, 24)          # xanh rêu sẫm, cùng họ với hero kết quả
GLOW = (80, 230, 140)      # xanh thương hiệu
KHOI = (14, 58, 36)        # nền khối trích dẫn
VANG = (255, 214, 64)
TRANG = (245, 248, 246)
MO = (150, 190, 168)


def _nen(H):
    """Nền chuyển màu + quầng sáng, cùng cách compose_result dựng."""
    bg = Image.new('RGB', (W, H), NEN)
    px = bg.load()
    for y in range(H):
        t = y / H
        px_row = (int(NEN[0] + 10 * t), int(NEN[1] + 26 * t), int(NEN[2] + 16 * t))
        for x in range(W):
            px[x, y] = px_row
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-260, -420, W + 260, 520), fill=120)
    return Image.composite(Image.new('RGB', (W, H), GLOW), bg,
                           glow.filter(ImageFilter.GaussianBlur(190)))


def _xuong_dong(d, chu, font, rong):
    """Cắt dòng theo BỀ RỘNG THẬT của font, không đếm ký tự — chữ có dấu rộng
    khác chữ không dấu, đếm ký tự là tràn."""
    dong, hien = [], ''
    for tu in chu.split():
        thu = (hien + ' ' + tu).strip()
        if d.textlength(thu, font=font) <= rong:
            hien = thu
        else:
            if hien:
                dong.append(hien)
            hien = tu
    if hien:
        dong.append(hien)
    return dong


def _anh_tron(duong, cao):
    """Cắt sát viền người TRƯỚC khi phóng, nếu không hai ảnh ra hai cỡ khác nhau.

    Ảnh cutout đều 500x500 nhưng phần trong suốt quanh người mỗi tấm một khác:
    tấm Rogers sát người, tấm Palmer thừa nhiều nền. Phóng theo chiều cao TỆP là
    phóng cả phần trống, nên đứng cạnh nhau người to người nhỏ dù cùng số đo."""
    im = Image.open(duong).convert('RGBA')
    hop = im.getbbox() if im.mode == 'RGBA' else None
    alpha = im.split()[-1].getbbox()
    if alpha:
        im = im.crop(alpha)
    elif hop:
        im = im.crop(hop)
    ty = cao / im.height
    return im.resize((max(1, int(im.width * ty)), cao), Image.LANCZOS)


def dung(cf, ra):
    # Đo TRƯỚC rồi mới dựng: chiều cao thẻ phải vừa đúng nội dung. Bản đầu đóng
    # cứng 1350 nên thẻ 3 câu hở một khoảng trống 200px ở đáy — nhìn như thiếu mất
    # phần cuối. Đo bằng font thật, không ước lượng.
    do = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    fq_do = FS(38)
    cao_cau = 0
    for c in cf['cau']:
        n = len(_xuong_dong(do, '“' + c['loi'].strip().strip('“”"') + '”', fq_do, W - 2 * LE - 76))
        cao_cau += 30 + n * 50 + 40 + 20
    H = max(H_TOI_THIEU, 222 + 330 + 74 + cao_cau + 76)

    bg = _nen(H).convert('RGBA')
    d = ImageDraw.Draw(bg)
    brand_bb.stamp(bg, W=W, mark_px=54, top=44, safe=LE)

    # ── pill giải + tỉ số ────────────────────────────────────────────────
    fp = F(30)
    t = cf['pill']
    w = d.textlength(t, font=fp)
    y = 132
    d.rounded_rectangle((LE, y, LE + w + 56, y + 58), 29, fill=VANG)
    d.text((LE + 28, y + 12), t, font=fp, fill=(20, 20, 20))

    # ── hai chân dung ───────────────────────────────────────────────────
    cao = 330
    y_anh = 222
    nguoi = cf['nguoi']
    for i, ng in enumerate(nguoi):
        im = _anh_tron(ng['anh'], cao)
        x = LE + 22 if i == 0 else W - LE - 22 - im.width
        bg.alpha_composite(im, (x, y_anh))
        fn = F(34)
        ten = ng['ten'].upper()
        tw = d.textlength(ten, font=fn)
        tx = x + (im.width - tw) / 2
        d.text((tx, y_anh + cao + 12), ten, font=fn, fill=TRANG)

    # ── các câu nói ─────────────────────────────────────────────────────
    fq = FS(38)
    fa = F(28)
    y = y_anh + cao + 74
    for c in cf['cau']:
        ai = c['ai']
        loi = '“' + c['loi'].strip().strip('“”"') + '”'
        dong = _xuong_dong(d, loi, fq, W - 2 * LE - 76)
        cao_khoi = 30 + len(dong) * 50 + 40
        d.rounded_rectangle((LE, y, W - LE, y + cao_khoi), 26, fill=KHOI)
        # vạch màu bên trái cho biết ai nói — hai người hai màu, khỏi phải đọc tên
        mau = VANG if ai == 0 else GLOW
        d.rounded_rectangle((LE, y + 18, LE + 8, y + cao_khoi - 18), 4, fill=mau)
        yy = y + 24
        for dg in dong:
            d.text((LE + 38, yy), dg, font=fq, fill=TRANG)
            yy += 50
        ten = nguoi[ai]['ten'].upper()
        d.text((LE + 38, yy + 2), ten, font=fa, fill=mau)
        y += cao_khoi + 20

    # ── nguồn ───────────────────────────────────────────────────────────
    fn = FS(26)
    t = 'Nguồn: ' + cf.get('nguon', '')
    d.text((W - LE - d.textlength(t, font=fn), H - 58), t, font=fn, fill=MO)

    bg.convert('RGB').save(ra, quality=94, optimize=True)
    return ra


def main():
    if len(sys.argv) < 3:
        raise SystemExit('dùng: python compose_quote.py the.json ra.png')
    with open(sys.argv[1], encoding='utf-8') as f:
        cf = json.load(f)
    print('đã dựng', dung(cf, sys.argv[2]))


if __name__ == '__main__':
    main()
