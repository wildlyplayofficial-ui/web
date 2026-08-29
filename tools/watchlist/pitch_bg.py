"""Nền sân cỏ vẽ bằng code — vạch vôi, vòng tròn giữa sân, khung thành, cỏ sọc.
Dùng cho ảnh nhiều đội (không có nhân vật) để đỡ trống, KHÔNG cần AI, không tốn tiền.
Vẽ rất nhạt để cỡ nhỏ không bị rối, logo đội vẫn là thứ nổi nhất."""
from PIL import Image, ImageDraw, ImageFilter


def draw(bg, alpha=26, stripes=True):
    """bg: ảnh RGBA. alpha: độ đậm vạch vôi (0-255). Trả về ảnh mới."""
    W, H = bg.size
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    white = (255, 255, 255, alpha)
    lw = max(2, W // 400)

    if stripes:  # cỏ sọc dọc, rất nhạt
        band = W // 9
        for i in range(0, W, band * 2):
            d.rectangle([i, 0, i + band, H], fill=(255, 255, 255, max(4, alpha // 5)))

    d.line([(W // 2, 0), (W // 2, H)], fill=white, width=lw)          # vạch giữa sân
    r = int(min(W, H) * 0.17)
    d.ellipse([W // 2 - r, H // 2 - r, W // 2 + r, H // 2 + r], outline=white, width=lw)
    d.ellipse([W // 2 - lw * 3, H // 2 - lw * 3, W // 2 + lw * 3, H // 2 + lw * 3], fill=white)

    bw, bh = int(W * 0.13), int(H * 0.46)                              # vòng cấm hai bên
    for x0 in (0, W - bw):
        d.rectangle([x0, (H - bh) // 2, x0 + bw, (H + bh) // 2], outline=white, width=lw)
    gw, gh = int(W * 0.05), int(H * 0.22)
    for x0 in (0, W - gw):
        d.rectangle([x0, (H - gh) // 2, x0 + gw, (H + gh) // 2], outline=white, width=lw)

    out = Image.alpha_composite(bg, lay.filter(ImageFilter.GaussianBlur(1)))

    vig = Image.new('L', (W, H), 0)                                    # tối bốn góc cho có chiều sâu
    ImageDraw.Draw(vig).ellipse([-W // 5, -H // 5, W + W // 5, H + H // 5], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(min(W, H) // 8))
    dark = Image.new('RGBA', (W, H), (0, 40, 20, 90))
    return Image.composite(out, Image.alpha_composite(out, dark), vig)
