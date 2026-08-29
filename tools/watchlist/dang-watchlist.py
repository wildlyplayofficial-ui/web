#!/usr/bin/env python3
"""Đăng ảnh Watchlist lên trang Facebook và kênh Telegram của banhbong.

Chạy bằng đúng biến môi trường của worker, KHÔNG dán khoá vào đâu cả:

    cd ~/wildlyplay
    railway run --service wildlyplay-worker python3 tools/watchlist/dang-watchlist.py

Thêm --thu để chỉ in ra xem sẽ đăng gì, KHÔNG đăng thật.

Biến cần có (worker đã có sẵn): FB_PAGE_ID · FB_PAGE_TOKEN · CURATOR_BOT_TOKEN · CHANNEL_CHAT_ID
"""
import os
import sys

import requests

ANH = os.path.join(os.path.dirname(__file__), 'lich-tran-v2.png')
LOI_NHAN = (
    "CÁC TRẬN ĐÁNG XEM CUỐI TUẦN NÀY\n\n"
    "11 trận từ tối nay tới thứ Hai, giờ Việt Nam đầy đủ trong hình.\n\n"
    "Bốn trận rơi vào khung giờ dễ xem:\n"
    "Liverpool gặp Nottingham Forest, 18h30 thứ Bảy\n"
    "Chelsea gặp Brighton, 20h Chủ nhật\n"
    "Real Madrid gặp Malaga, 22h Chủ nhật\n"
    "Man United gặp Ipswich, 22h30 Chủ nhật\n\n"
    "Còn lại toàn rạng sáng, ai thức được thì thức.\n\n"
    "banhbong.net"
)

thu = '--thu' in sys.argv
thieu = [k for k in ('FB_PAGE_ID', 'FB_PAGE_TOKEN', 'CURATOR_BOT_TOKEN', 'CHANNEL_CHAT_ID')
         if not os.environ.get(k)]

print('ảnh      :', ANH, '·', 'CÓ' if os.path.exists(ANH) else 'KHÔNG THẤY')
print('biến còn thiếu:', thieu or 'đủ hết')
print('---- lời nhắn sẽ đăng ----')
print(LOI_NHAN)
print('--------------------------')

if thu:
    print('\nCHẾ ĐỘ THỬ — không đăng gì cả.')
    raise SystemExit
if thieu or not os.path.exists(ANH):
    print('\nDỪNG: thiếu biến hoặc thiếu ảnh, không đăng.')
    raise SystemExit(1)

# ---- Facebook -------------------------------------------------------------
r = requests.post(
    f"https://graph.facebook.com/v21.0/{os.environ['FB_PAGE_ID']}/photos",
    data={'caption': LOI_NHAN, 'access_token': os.environ['FB_PAGE_TOKEN']},
    files={'source': open(ANH, 'rb')}, timeout=120)
print('Facebook:', r.status_code, r.text[:200])

# ---- Telegram -------------------------------------------------------------
r = requests.post(
    f"https://api.telegram.org/bot{os.environ['CURATOR_BOT_TOKEN']}/sendPhoto",
    data={'chat_id': os.environ['CHANNEL_CHAT_ID'], 'caption': LOI_NHAN},
    files={'photo': open(ANH, 'rb')}, timeout=120)
print('Telegram:', r.status_code, r.text[:200])
