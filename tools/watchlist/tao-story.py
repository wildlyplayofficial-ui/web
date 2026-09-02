"""Ảnh STORY 1080x1920 cho trang Facebook Banh Bóng.

Hai kiểu trong một tệp:
  · có `muc`  → thẻ DANH SÁCH (cầu thủ tự do, đội hình, bảng xếp hạng)
  · không     → thẻ TIÊU ĐỀ + một dòng số nổi bật

KHÔNG in chữ "vuốt lên đọc bài" — Peter chốt 26/8: nền tảng đã có nút sẵn, in
thêm vào nhìn rẻ tiền.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pitch_bg import draw as pitch

HERE = os.path.dirname(os.path.abspath(__file__))
_FD = os.path.join(HERE, 'fonts') + os.sep
F  = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-ExtraBold.ttf', s)
FS = lambda s: ImageFont.truetype(_FD + 'BarlowCondensed-SemiBold.ttf', s)
W, H = 1080, 1920
GOLD = (255, 214, 64); TRANG = (255, 255, 255); MO = (168, 205, 186)


def _nen(cau_thu, mo_trai, co_muc=False):
    im = Image.new('RGB', (W, H)); px = im.load()
    c1, c2 = (10, 92, 52), (3, 40, 24)
    for y in range(H):
        t = y / H
        col = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        for x in range(W): px[x, y] = col
    im = pitch(im.convert('RGBA'), alpha=22)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-300, -200, 800, 900), fill=44)
    im = Image.composite(Image.new('RGB', (W, H), (30, 150, 88)).convert('RGBA'), im,
                         glow.filter(ImageFilter.GaussianBlur(200)))
    if cau_thu:
        pl = Image.open(cau_thu).convert('RGBA')
        bb = pl.getbbox()
        if bb: pl = pl.crop(bb)
        ph = 1180 if not co_muc else 880
        pw = int(pl.width * ph / pl.height)
        pl = pl.resize((pw, ph), Image.LANCZOS)
        im.alpha_composite(pl, ((W - pw) // 2 + 60 if not co_muc else W - pw + 30, H - ph - 40))
    sm = Image.new('L', (1, H)); smp = sm.load()
    for y in range(H):
        smp[0, y] = 150 if y < mo_trai else max(0, int(150 * (1 - (y - mo_trai) / 260)))
    scrim = Image.new('RGBA', (W, H), (0, 26, 14, 255)); scrim.putalpha(sm.resize((W, H)))
    im.alpha_composite(scrim)
    return im


def build(tieu_de, phu_de, dong_lon, out, nhan='BANH BÓNG', cau_thu=None, muc=None,
          khong_can_nhan_vat=False):
    # CỬA CHẶN: story danh sách mà không có nhân vật thì nhìn trống và rẻ.
    # Peter bắt 2/9: bài fanpage có Pogba mà story lại không. Cố ý bỏ thì
    # phải khai rõ khong_can_nhan_vat=True, chứ không quên là lọt.
    assert not (muc and not cau_thu and not khong_can_nhan_vat), (
        'story danh sách thiếu ảnh nhân vật. Truyền cau_thu=..., hoặc nếu cố ý '
        'bỏ thì đặt khong_can_nhan_vat=True')
    # có cả danh sách lẫn cầu thủ: vệt tối phải phủ hết cột chữ bên trái
    im = _nen(cau_thu, 760 if muc is None else (1200 if cau_thu else 1500), co_muc=bool(muc))
    d = ImageDraw.Draw(im)
    mk = Image.open(os.path.join(HERE, 'bb-mark-color.png')).convert('RGBA')
    mk = mk.resize((58, int(mk.height * 58 / mk.width)), Image.LANCZOS)
    im.alpha_composite(mk, (60, 78)); d = ImageDraw.Draw(im)
    d.text((140, 92), nhan, font=F(30), fill=GOLD)

    assert d.textlength(tieu_de.upper(), font=F(76)) < W - 110, f'tiêu đề tràn: {tieu_de}'
    d.text((60, 172), tieu_de.upper(), font=F(76), fill=TRANG)
    d.text((62, 262), phu_de, font=FS(30), fill=MO)

    if muc:
        assert 1 <= len(muc) <= 18, f'{len(muc)} dòng, khuôn story chịu tối đa 18'
        # trần 130 chứ không phải 82: story ít dòng thì phải giãn cho kín khung,
        # để trần thấp là danh sách dồn nửa trên, nửa dưới trống trơ (thấy ở bản
        # lịch vòng 3 có 10 dòng).
        RONG = 620 if cau_thu else (W - 150)   # có cầu thủ thì chừa chỗ bên phải
        y = 350; BUOC = min((H - 230 - y) // len(muc), 130)
        for it in muc:
            ten, ghi = it[0], it[1]; hinh = it[2] if len(it) > 2 else None
            x = 60
            # hinh: mã cờ (chuỗi) HOẶC danh sách đường dẫn huy hiệu (trận đấu có 2 đội).
            # Peter 2/9: "logo đâu em" — bài lịch mà chỉ có chữ thì nhìn không ra trận nào.
            if isinstance(hinh, str):
                p = os.path.join(HERE, 'co', f'{hinh}.png')
                if os.path.exists(p):
                    co = Image.open(p).convert('RGBA')
                    cw = 46; ch = max(1, int(co.height * cw / co.width))
                    co = co.resize((cw, ch), Image.LANCZOS)
                    v = Image.new('RGBA', (cw + 2, ch + 2), (255, 255, 255, 90)); v.alpha_composite(co, (1, 1))
                    im.alpha_composite(v, (60, y + 6)); x = 60 + cw + 18
            elif hinh:
                # CỬA CHẶN: khai huy hiệu mà thiếu tệp thì DỪNG. Trước đây bỏ qua âm
                # thầm → ra ảnh thiếu logo mà không ai biết (Peter bắt 2/9: "logo đâu e").
                thieu = [i for i, p in enumerate(hinh) if not (p and os.path.exists(p))]
                assert not thieu, (f'dòng "{ten}" khai {len(hinh)} huy hiệu nhưng thiếu '
                                   f'{len(thieu)} tệp — bổ sung huy hiệu rồi chạy lại')
                for p in hinh:
                    hh = Image.open(p).convert('RGBA')
                    s = 56; sc = s / max(hh.width, hh.height)
                    hh = hh.resize((max(1, int(hh.width * sc)), max(1, int(hh.height * sc))), Image.LANCZOS)
                    im.alpha_composite(hh, (x + (s - hh.width) // 2, y + (s - hh.height) // 2 - 4))
                    x += s + 8
                x += 10
            d = ImageDraw.Draw(im)
            f1 = F(38)
            assert d.textlength(ten, font=f1) < RONG - (x - 60), f'tên dài quá: {ten}'
            d.text((x, y - 4), ten, font=f1, fill=TRANG)
            if ghi: d.text((x + 2, y + 36), ghi.upper(), font=FS(22), fill=MO)
            d.line([(60, y + 66), (60 + RONG, y + 66)], fill=(255, 214, 64, 60), width=1)
            y += BUOC
        assert y < H - 110, 'danh sách tràn chân ảnh'
    else:
        PY0 = 330
        panel = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle((52, PY0, W - 52, PY0 + 210), 24,
                                                fill=(1, 30, 18, 150), outline=GOLD, width=3)
        im.alpha_composite(panel); d = ImageDraw.Draw(im)
        f = F(92)
        assert d.textlength(dong_lon.upper(), font=f) < W - 160, f'dòng lớn tràn: {dong_lon}'
        d.text((84, PY0 + 40), dong_lon.upper(), font=f, fill=GOLD)

    d.text((60, H - 92), 'banhbong.net', font=FS(30), fill=MO)
    im.convert('RGB').save(out, quality=92, optimize=True)
    print('saved', out)
