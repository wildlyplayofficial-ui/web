"""Vẽ ảnh cầu thủ cho thẻ pick — chỉ vẽ đội CHƯA CÓ, vẽ một lần dùng mãi.

Quy trình tuần: anh Nick gửi pick → chạy tệp này cho từng đội ngoài Ngoại hạng Anh.
    python3 ve-cau-thu.py "Real Madrid" "Kylian Mbappe" la-liga

⚠️ BƯỚC VẼ TỐN TIỀN (~0,23 USD/ảnh, đo thật 29/8). Tệp này tự kiểm kho trước;
đội nào đã có ảnh thì DỪNG, không gọi dịch vụ. Đừng bỏ qua bước kiểm.

⚠️ Ảnh lưu PHẲNG ở `apps/web/public/og/players/<slug>.png` — KHÔNG chia thư mục con.
Trang web đọc đúng đường dẫn phẳng này (`apps/web/app/api/og/_shared.tsx:157`);
chuyển vào thư mục con là ảnh biến mất khỏi web mà không báo lỗi.
Muốn xem theo giải thì tra `players-index.json`, không phải tra thư mục.
"""
import base64, json, os, re, subprocess, sys, unicodedata, urllib.parse, urllib.request, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', 'apps', 'web'))
KHO = os.path.join(REPO, 'public', 'og', 'players')
SO = os.path.join(KHO, 'players-index.json')
# Ảnh chuẩn nét: DÙNG LẠI bản đã có trong repo (md5 597661873f92ddc821ce3f599a8140dd),
# đừng chép thêm bản thứ hai — 29/8 từng làm thư mục phồng 6,4MB vì chép trùng.
MAU_NET_TRONG_REPO = 'tools/anh/mau_doi_chieu/delap_toon_cut.png'
GIAI = ('premier-league', 'la-liga', 'serie-a', 'bundesliga', 'ligue-1', 'champions-league')


def mau_net():
    """Ảnh chuẩn nét. Nằm trên nhánh main; nhánh làm việc có thể KHÔNG có
    (đúng bẫy đã dính với ảnh cầu thủ 29/8) nên tự lấy từ origin/main về thư mục tạm."""
    p = os.path.join(os.path.dirname(REPO), '..', MAU_NET_TRONG_REPO)
    p = os.path.abspath(os.path.join(HERE, '..', '..', MAU_NET_TRONG_REPO))
    if os.path.exists(p):
        return p
    tam = os.path.join(HERE, '.anh-tam', 'mau-net.png')
    os.makedirs(os.path.dirname(tam), exist_ok=True)
    if not os.path.exists(tam):
        r = subprocess.run(['git', '-C', REPO, 'show', f'origin/main:{MAU_NET_TRONG_REPO}'],
                           capture_output=True)
        if r.returncode != 0 or not r.stdout:
            raise SystemExit(f'✗ không tìm được ảnh chuẩn nét {MAU_NET_TRONG_REPO} '
                             f'(cả cây làm việc lẫn origin/main)')
        open(tam, 'wb').write(r.stdout)
    return tam


def slug(ten):
    t = unicodedata.normalize('NFD', ten).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', t.lower())).strip('-')


def da_co(s):
    """Có ảnh chưa — kiểm cả cây làm việc lẫn nhánh main (hai máy hay lệch nhánh)."""
    if os.path.exists(os.path.join(KHO, f'{s}.png')):
        return 'cây làm việc'
    r = subprocess.run(['git', '-C', REPO, 'cat-file', '-e',
                        f'origin/main:apps/web/public/og/players/{s}.png'],
                       capture_output=True)
    return 'nhánh main' if r.returncode == 0 else None


def cutout(ten_cau_thu):
    u = 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=' + urllib.parse.quote(ten_cau_thu)
    d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30))
    for p in (d.get('player') or []):
        if p.get('strCutout'):
            return p['strCutout'], p['strPlayer'], p.get('strTeam', '')
    raise SystemExit(f'✗ TheSportsDB không có ảnh cắt nền cho {ten_cau_thu!r}')


def _phan(fields, files):
    b = uuid.uuid4().hex; out = b''
    for k, v in fields.items():
        out += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, ten, noi in files:
        out += (f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{ten}"\r\n'
                f'Content-Type: image/png\r\n\r\n').encode() + noi + b'\r\n'
    return out + f'--{b}--\r\n'.encode(), f'multipart/form-data; boundary={b}'


def ve(anh_goc, ao, ra):
    key = open(os.path.expanduser('~/.config/openai/api_key')).read().strip()
    loi = (
        "Image 1 is a photo of a footballer. Image 2 is the house illustration style. "
        "Redraw the player from image 1 in EXACTLY the style of image 2: flat vector cartoon, "
        "bold clean outlines, posterised cel shading with hard-edged colour blocks, saturated "
        "colours. NOT photorealistic — no photographic texture, no film grain, no soft focus. "
        "KEEP THE EXACT SAME PERSON from image 1: identical face shape, eyes, nose, mouth, "
        "jawline, hairstyle, hairline and skin tone. Instantly recognisable. "
        f"Keep his {ao} with the club crest on the chest; no sponsor lettering. "
        "Waist-up, facing camera, calm confident expression. "
        "Fully transparent background. No text, no watermark, no border.")
    body, ct = _phan(
        {'model': 'gpt-image-2', 'prompt': loi, 'size': '1024x1024',
         'background': 'transparent', 'quality': 'high', 'n': '1'},
        [('image[]', 'nguon.png', open(anh_goc, 'rb').read()),
         ('image[]', 'mau.png', open(mau_net(), 'rb').read())])
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body,
                                 headers={'Authorization': f'Bearer {key}', 'Content-Type': ct})
    d = json.load(urllib.request.urlopen(req, timeout=900))
    open(ra, 'wb').write(base64.b64decode(d['data'][0]['b64_json']))
    u = d.get('usage', {})
    tien = (u.get('input_tokens_details', {}).get('text_tokens', 0) * 5
            + u.get('input_tokens_details', {}).get('image_tokens', 0) * 8
            + u.get('output_tokens', 0) * 30) / 1e6
    print(f'  đã vẽ · {u.get("total_tokens", "?")} token · ~{tien:.3f} USD')


def ghi_so(s, giai, cau_thu, nguon):
    so = json.load(open(SO)) if os.path.exists(SO) else {}
    so[s] = {'giai': giai, 'cau_thu': cau_thu, 'nguon': nguon}
    json.dump(dict(sorted(so.items())), open(SO, 'w'), ensure_ascii=False, indent=2)


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    clb, cau_thu, giai = sys.argv[1], sys.argv[2], sys.argv[3]
    if giai not in GIAI:
        raise SystemExit(f'giải phải là một trong {GIAI}')
    s = slug(clb)
    o = da_co(s)
    if o:
        print(f'✓ {clb} đã có ảnh ({o}) — KHÔNG vẽ lại, không tốn tiền.')
        return
    print(f'· {clb} chưa có ảnh, đi lấy ảnh gốc…')
    url, ten_that, doi = cutout(cau_thu)
    print(f'  nguồn: {ten_that} ({doi})')
    # Cầu thủ đã chuyển CLB thì ảnh gốc mặc áo đội cũ → bước vẽ phải bịa áo mới.
    # Vẫn chạy được (thử 29/8: Vlahović ảnh gốc áo Beşiktaş, vẽ ra áo Juventus đúng),
    # nhưng KHÔNG chắc ăn — báo to để người chạy mở ảnh ra nhìn.
    if slug(doi) != s:
        print(f'  ⚠️ ảnh gốc là áo {doi}, KHÔNG phải {clb}. Bước vẽ sẽ phải tự đổi áo — soi kỹ kết quả.')
    goc = os.path.join(HERE, '.anh-tam', f'{s}-goc.png')
    os.makedirs(os.path.dirname(goc), exist_ok=True)
    urllib.request.urlretrieve(url, goc)
    os.makedirs(KHO, exist_ok=True)
    ra = os.path.join(KHO, f'{s}.png')
    ve(goc, f'{clb} kit', ra)
    ghi_so(s, giai, ten_that, url)
    print(f'✓ lưu {ra}\n  ⚠️ MỞ RA NHÌN trước khi dùng — nét có thể ra ảnh chụp thay vì tranh.')


if __name__ == '__main__':
    main()
