"""Đăng ẢNH + caption lên trang Facebook BANH BÓNG.

Khoá lấy từ biến môi trường của worker (chạy qua `railway run`), KHÔNG đọc tệp
khoá trên máy — tệp trên máy này là khoá trang SNAPSHOP, dùng nhầm là đăng bóng
đá lên trang bán hàng (đã dính 10/9/2026).

CHỐT CHẶN: hỏi TÊN TRANG trước, tên không chứa "Banh" thì DỪNG, không đăng.
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request, uuid

PID = os.environ.get('FB_PAGE_ID', '').strip()
TOK = os.environ.get('FB_PAGE_TOKEN', '').strip()
if not PID or not TOK:
    sys.exit('thiếu FB_PAGE_ID / FB_PAGE_TOKEN trong môi trường')

q = urllib.parse.urlencode({'fields': 'id,name,username', 'access_token': TOK})
trang = json.load(urllib.request.urlopen(f'https://graph.facebook.com/v21.0/{PID}?{q}', timeout=60))
print('TRANG:', trang.get('name'), '|', trang.get('username'))
if 'banh' not in (trang.get('name', '') + trang.get('username', '')).lower():
    sys.exit('DỪNG — đây không phải trang Banh Bóng, không đăng.')

if len(sys.argv) < 3:
    sys.exit('dùng: railway run --service wildlyplay-worker python3 dang_fb_banhbong.py <anh.png> <caption.txt>')
ANH = sys.argv[1]
CAP = open(sys.argv[2], encoding='utf-8').read().strip()

b = uuid.uuid4().hex
p = []
for k, v in (('caption', CAP), ('published', 'true'), ('access_token', TOK)):
    p.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
p.append((f'--{b}\r\nContent-Disposition: form-data; name="source"; filename="the.png"\r\n'
          f'Content-Type: image/png\r\n\r\n').encode() + open(ANH, 'rb').read() + b'\r\n')
than = b''.join(p) + f'--{b}--\r\n'.encode()
req = urllib.request.Request(f'https://graph.facebook.com/v21.0/{PID}/photos', data=than,
                             headers={'Content-Type': f'multipart/form-data; boundary={b}'})
try:
    kq = json.load(urllib.request.urlopen(req, timeout=180))
except urllib.error.HTTPError as e:
    sys.exit('LỖI ĐĂNG ' + str(e.code) + ' ' + e.read().decode()[:400])
print('ĐĂNG:', json.dumps(kq, ensure_ascii=False))
print('CÒN PHẢI LÀM: bình luận đầu đặt link t.me/banhbongnet TRƯỚC, link bài web SAU '
      '(luật Peter chốt 30/8). Xem feedback_fb_comment_dan_ve_telegram.')
