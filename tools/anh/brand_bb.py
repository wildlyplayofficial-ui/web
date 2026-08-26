"""Brand stamp banhbong.net cho hero 2400x1260 (Nick chốt 19/8): góc trái CHỈ mark bb nhỏ (~110px), góc phải chữ "banhbong.net";
lề an toàn 200px mỗi bên (ảnh bị crop 2 bên khi hiển thị trong thẻ)."""
from PIL import Image, ImageDraw, ImageFont
SAFE = 200
from fonts_bb import FS   # font tự tra theo hệ điều hành

import os as _os
_HERE = _os.path.dirname(_os.path.abspath(__file__))
# Asset thương hiệu nằm SẴN trong repo (apps/web/public) — dùng thẳng, đừng chép
# bản riêng ra ngoài. Gửi logo qua Telegram dạng ảnh là MẤT NỀN TRONG (nén JPEG),
# dán lên nền xanh sẽ thành ô vuông trắng. Đã dính 24/8 và lại dính 26/8.
_REPO = _os.path.normpath(_os.path.join(_HERE, '..', '..', 'apps', 'web', 'public'))
_TRONG_REPO = {
    'bb-mark-white.png': _os.path.join(_REPO, 'brand', 'bb-mark-white.png'),
    'bb-mark-ink.png':   _os.path.join(_REPO, 'brand', 'bb-mark-ink.png'),
    'wp-logo-white.png': _os.path.join(_REPO, 'og', 'wp-logo-white.png'),
}

def _asset(ten):
    """Tìm trong repo trước, không có thì lấy bản cạnh script."""
    d = _TRONG_REPO.get(ten)
    if d and _os.path.exists(d):
        return d
    canh = _os.path.join(_HERE, ten)
    if _os.path.exists(canh):
        return canh
    raise FileNotFoundError(
        f'Không thấy asset {ten}. Đã tìm: {d or "(không có trong repo)"} và {canh}. '
        f'Nếu là logo mới, commit vào apps/web/public/brand/ rồi khai trong _TRONG_REPO — '
        f'ĐỪNG gửi qua Telegram dạng ảnh, nó mất nền trong.')
def stamp(bg, W=2400, mark_px=110, top=70, color_mark=True):
    # bb-mark-color chưa có trong repo; bản trắng dùng tốt trên nền xanh đậm.
    src = _asset('bb-mark-color.png' if color_mark and _os.path.exists(
        _os.path.join(_HERE, 'bb-mark-color.png')) else 'bb-mark-white.png')
    m = Image.open(src).convert('RGBA'); m = m.resize((mark_px, int(m.height * mark_px / m.width)), Image.LANCZOS)
    bg.paste(m, (SAFE, top), m)
    d = ImageDraw.Draw(bg)
    fu = FS(44); t = 'banhbong.net'; d.text((W - d.textlength(t, font=fu) - SAFE, top + 10), t, font=fu, fill=(240, 240, 240))
    return top + m.height
