"""Tìm font đậm có ĐỦ DẤU TIẾNG VIỆT, chạy được cả Windows lẫn Mac lẫn Linux.

Lý do có tệp này (26/8/2026): compose_transfer.py và compose_story.py trước đây gọi cứng
'C:/Windows/Fonts/segoeuib.ttf' — Mac không có Segoe UI nên Gwen mở lên là gãy ngay dòng đầu.
Mỗi máy dựng một bản composer riêng = đúng bẫy "hai cây thước" đã trả giá sáng 26/8.

Dùng:
    from fonts_bb import F, FS
    d.text((x, y), 'CHUYỂN NHƯỢNG', font=F(96))
"""
import os
from functools import lru_cache
from PIL import ImageFont
from fontTools.ttLib import TTFont

# Chữ thử: đủ mặt dấu khó của tiếng Việt (Ư, Ợ, Ệ, Ỷ, Đ) — thiếu 1 trong số này là loại.
THU = 'ƯỢỆỶĐăằẵịọủ' + '→·+'   # 26/8: thêm KÝ HIỆU. Barlow Condensed đủ dấu tiếng Việt
# nhưng THIẾU mũi tên → nên "Brighton → Man United" ra ô vuông trống. Phép thử chỉ đo
# chữ cái thì không bắt được, phải đo cả ký hiệu mình thật sự dùng trên ảnh.

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_OG = os.path.normpath(os.path.join(_HERE, '..', '..', 'apps', 'web', 'app', 'api', 'og', '_assets'))

UNG_VIEN = {
    'dam': [                                    # tiêu đề, tên cầu thủ
        # Font TRONG REPO đứng đầu: hai máy nạp CÙNG MỘT TỆP thì ảnh giống hệt nhau.
        # Font hệ thống chỉ là phương án chống gãy — mỗi máy một tệp khác nhau,
        # dùng nó là hai bên hết đối chiếu được với nhau.
        os.path.join(_REPO_OG, 'SpaceGrotesk-Bold.ttf'),
        os.path.join(_HERE, 'fonts', 'SpaceGrotesk-Bold.ttf'),
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/segoeuib.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Tahoma Bold.ttf',
        '/Library/Fonts/Arial Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    ],
    'phu': [                                    # dòng phụ, tên miền
        os.path.join(_REPO_OG, 'SpaceGrotesk-Medium.ttf'),
        os.path.join(_HERE, 'fonts', 'SpaceGrotesk-Medium.ttf'),
        'C:/Windows/Fonts/segoeuib.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
        '/System/Library/Fonts/Supplemental/Tahoma Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    ],
}


def _du_dau(duong):
    """Font có đủ mã chữ cho mọi ký tự trong THU không."""
    try:
        cmap = set()
        for b in TTFont(duong, fontNumber=0, lazy=True)['cmap'].tables:
            cmap |= set(b.cmap.keys())
        return all(ord(c) in cmap for c in THU)
    except Exception:
        return False


@lru_cache(maxsize=8)
def duong_font(loai='dam'):
    thieu_dau = []
    for d in UNG_VIEN[loai]:
        if not os.path.exists(d):
            continue
        if _du_dau(d):
            return d
        thieu_dau.append(d)
    raise RuntimeError(
        f'KHÔNG tìm được font {loai} đủ dấu tiếng Việt. '
        f'Có nhưng thiếu dấu: {thieu_dau or "không có font nào"}. '
        f'Thêm đường dẫn vào UNG_VIEN trong fonts_bb.py.')


@lru_cache(maxsize=64)
def F(co):
    return ImageFont.truetype(duong_font('dam'), co)


@lru_cache(maxsize=64)
def FS(co):
    return ImageFont.truetype(duong_font('phu'), co)


if __name__ == '__main__':
    print('đậm :', duong_font('dam'))
    print('phụ :', duong_font('phu'))
