"""CỬA CHẶN TRƯỚC KHI ĐĂNG FACEBOOK.

Peter hỏi 2/9/2026: "làm sao để sau này không bị". Câu trả lời không phải là
"em cẩn thận hơn" — hôm nay lỗi nào cũng do tự quyết trong đầu, không có cửa
chặn. Nên đưa luật vào mã, chạy trước mọi lần đăng.

Dùng:
    from kiem_truoc_khi_dang import kiem_trang, kiem_story_con_song
    kiem_trang(TK, mong_doi="Banh Bóng Network")     # trước MỌI lần đăng
"""
import requests

GRAPH = "https://graph.facebook.com/v19.0"


def kiem_trang(token, mong_doi):
    """Chìa này thuộc trang nào? Gọi trước mọi lần đăng.

    Vì sao: chìa lưu trên máy là của Snapshop, chìa banhbong nằm trong môi
    trường worker. 2/9 suýt đăng bài bóng đá lên trang bán hàng — bắt được nhờ
    hỏi tên trang trước. Một lượt gọi, chặn được lỗi không gỡ sạch được.
    """
    r = requests.get(f"{GRAPH}/me", params={"fields": "id,name", "access_token": token}, timeout=60).json()
    if "error" in r:
        raise SystemExit(f"không đọc được tên trang: {r['error'].get('message','')[:120]}")
    if r.get("name") != mong_doi:
        raise SystemExit(
            f"SAI TRANG. Chìa đang cầm thuộc '{r.get('name')}' (id {r.get('id')}), "
            f"cần '{mong_doi}'. DỪNG, không đăng."
        )
    return r["id"]


def kiem_story_con_song(token, page_id, post_id):
    """Story còn trên trang không?

    PHẢI hỏi bằng DANH SÁCH story. Hỏi thẳng `GET /{post_id}` luôn trả lỗi kể cả
    khi story vẫn sống → dùng nó để kết luận "đã xoá" là nhận nhầm tín hiệu, và
    2/9 đã đẻ ra hai story lịch vòng 3 cùng lúc vì đúng lỗi này.
    """
    q = requests.get(f"{GRAPH}/{page_id}/stories",
                     params={"fields": "post_id", "limit": 25, "access_token": token}, timeout=90).json()
    if "error" in q:
        raise SystemExit(f"không đọc được danh sách story: {q['error'].get('message','')[:120]}")
    return str(post_id) in [str(s.get("post_id")) for s in q.get("data", [])]


# Ảnh story KHÔNG XOÁ ĐƯỢC qua API (thử ba cách 2/9, đều không được). Đăng sai thì
# phải nhờ Peter xoá tay hoặc chờ 24 giờ. Nên: soi ảnh bằng mắt TRƯỚC khi đăng,
# không phải sau.
