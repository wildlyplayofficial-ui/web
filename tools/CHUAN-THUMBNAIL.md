# Bộ chuẩn thumbnail banhbong.net

Soạn 25/8/2026 sau khi Peter nói *"gần như bài nào thumbnail cũng dở"*.
Không dựa cảm tính — dựa số đo trên thumbnail thật đang chạy.

---

## 1. Vì sao đang dở — số đo, không phải ý kiến

> ⚠️ Bảng dưới đo bằng THƯỚC CŨ (theo màu), sau đó phát hiện thước đó sai —
> xem mục 4b để có số đúng và cách đo đúng. Kết luận không đổi (ảnh vẫn trống
> ~70%), nhưng lấy số thì lấy ở mục 4b.

Đo 2 thumbnail mới nhất (Sávio 25/8, Ahoka 24/8), chia ảnh thành lưới 3×3:

| Vùng | Sávio | Ahoka |
|---|---|---|
| Trên-trái | 93% trống | 99% trống |
| Trên-giữa | **100% trống** | 99% trống |
| Trên-phải | 86% trống | 84% trống |
| Giữa-trái | 73% trống | 80% trống |
| **TRUNG TÂM** | **99% trống** | **88% trống** |
| Giữa-phải | 56% trống | 52% trống |
| Dưới-trái | 100% trống | 86% trống |
| Dưới-giữa | 85% trống | 68% trống |
| Dưới-phải | 3% trống | 15% trống |
| **Tổng nền trơn** | **77,2%** | **74,6%** |

**Ba phần tư tấm ảnh là nền xanh trống.** Nội dung dồn hết vào một góc
dưới-phải (cầu thủ) và một cụm chữ dưới-trái. Cả nửa trên bỏ không.

Lỗi lặp thấy được bằng mắt:
1. **Khoảng trống chết ở giữa** — mắt người không có gì để bám.
2. **Cầu thủ bị cắt cụt ngang ngực**, không có bóng đổ, không có nền phía sau
   → nhìn như hình dán, không thuộc về tấm ảnh.
3. **Chữ quá nhỏ so với khung.** "Sunderland AFC" chiếm chưa tới 1/10 chiều
   ngang. Thu về cỡ điện thoại là mất chữ.
4. **Logo lơ lửng** giữa mảng xanh, không neo vào đâu.
5. **Nền phẳng một màu** — không sân, không khán đài, không chiều sâu.

---

## 2. Luật bắt buộc — áp cho MỌI thumbnail

| # | Luật | Cách kiểm |
|---|---|---|
| B1 | Vùng phẳng **không quá 55%** diện tích | Script đo độ chi tiết cục bộ |
| B2 | Ô **TRUNG TÂM không được quá 60% trống** | Như trên |
| B3 | Chữ chính cao **tối thiểu 8%** chiều cao ảnh (≥100px trên khung 1260) | Đo chiều cao chữ |
| B4 | Thu nhỏ còn **chiều ngang 400px** vẫn đọc được chữ chính | Resize rồi mở ra nhìn |
| B5 | Nhân vật phải **chạm mép dưới** hoặc có nền/bóng đổ neo lại | Nhìn |
| B6 | Dấu tiếng Việt đủ và đúng, không tràn, không cắt | Đo chiều rộng chữ |
| B7 | Logo thật, **không để AI vẽ logo** | Nhìn |
| B8 | **Người/vật đúng đội hiện tại** của bài | Đối chiếu nội dung bài |
| B9 | **Mọi ký tự không phải chữ Latin phải kiểm bảng mã font TRƯỚC khi vẽ** | Script kiểm cmap |

Không đạt bất kỳ luật nào = **không được đăng**.

---

## 3. Mẫu theo từng loại bài

### 3.1 Trận lớn (chung kết, derby, đại chiến)
- **Bắt buộc có người.** Hai cầu thủ đối đầu, hoặc một cầu thủ chủ lực cỡ lớn.
- Nền: sân/khán đài mờ, không để nền phẳng.
- Bắt buộc: giờ + ngày + tên giải + sân.
- Có bối cảnh thì thêm một dòng ăn tiền: tỷ số lượt đi, chuỗi thắng, thứ hạng.
- ❌ Không dùng hai lá cờ đặt hai bên chữ giờ — đó là tấm lịch, không phải thẻ trận.

### 3.2 Tin chuyển nhượng
- Mặt cầu thủ **mặc áo ĐỘI ĐÍCH** (đội mới), không phải đội cũ.
  ⚠️ Lỗi đang tồn: Sávio mặc áo Man City trên bài ký Tottenham. Peter tạm bỏ qua
  (25/8: "cái số 1 k cần") nhưng khi làm mới thì làm cho đúng.
- Hai logo + mũi tên chỉ hướng, đặt **sát tên cầu thủ**, không thả lơ lửng.
- Giá chuyển nhượng nếu có nguồn.

### 3.3 Soi kèo / nhận định
- Hai logo đội cỡ lớn + tên giải + vòng đấu.
- Không cần mặt người, nhưng phải có số liệu làm điểm nhấn (phong độ, đối đầu).

### 3.4 Bài kiến thức / hướng dẫn
- Không dùng mặt cầu thủ (dễ gây hiểu nhầm bài nói về người đó).
- Dùng hình khái niệm: bảng tỷ lệ, biểu đồ, sơ đồ.

### 3.5 Đội tuyển Việt Nam
- Ảnh áo **đội tuyển**, không phải áo CLB.
- Được dùng cờ, nhưng cờ là phụ — nhân vật hoặc khoảnh khắc mới là chính.

---

## 4. Quy trình trước khi đăng

1. Render ảnh thật ra file.
2. **Chạy script đo** — nền trơn, ô trung tâm, chiều cao chữ.
3. **Mở ảnh ra nhìn** ở cỡ đầy đủ.
4. **Thu về 400px, nhìn lại** — đây là cỡ thật trên điện thoại.
5. Không đạt → làm lại, không đăng.
6. Việc bị chê thẩm mỹ → đưa **3 phương án khác nhau về Ý TƯỞNG** cho Peter chọn,
   không phải 3 bản đổi màu.

Máy chấm được luật B1–B4, B6. Luật B5, B7, B8 và "có muốn bấm vào không" thì
máy không chấm được — chỗ đó bắt buộc mắt người.

### ⚠️ Luật B9 — ký tự lạ phải kiểm font trước khi vẽ

Ba lần dính trong đúng một ngày (26/8), cùng một bệnh: **code giả định font có
ký tự nào đó mà không kiểm**. Font thiếu ký tự KHÔNG làm gãy script — nó lặng
lẽ vẽ ô vuông trống.

| Ký tự | Font | Hậu quả |
|---|---|---|
| `✔` | Arial | bảng RTP ra ô vuông thay vì dấu tích |
| `→` | Barlow Condensed | "Brighton → Man United" ra ô vuông giữa hai tên đội |
| `◆` | Space Grotesk | đã biết từ đợt thẻ OG, phải vẽ hình thoi thay |

**Nguy hiểm gấp đôi:** ô vuông trống lại được máy chấm tính là "có chi tiết" nên
ảnh còn được ĐIỂM CAO hơn.

**Cách làm đúng — chọn một trong hai:**
1. **Kiểm bảng mã font trước** bằng `fontTools`: nạp `cmap`, thử mọi ký tự lạ
   mình định dùng. Thiếu một cái là đổi font. Đây là cách `tools/anh/fonts_bb.py`
   đang làm — phép thử gồm cả chữ có dấu lẫn ký hiệu `→ · +`.
2. **VẼ ký tự đó bằng nét** thay vì gõ chữ. Dấu tích trong bảng RTP vẽ bằng hai
   đoạn thẳng; hình thoi vẽ bằng hình vuông xoay. Cách này không phụ thuộc font.

### ⚠️ Ca thật 26/8: máy chấm ĐẸP NHẤT mà ảnh HỎNG

Thêm hoạ tiết sọc vào khối thông tin → điểm ra **28,6% / 3,3%**, đẹp nhất từ
trước tới nay. Mở ảnh ra nhìn: sọc trắng **chạy ngang qua áo và cờ trên ngực
cầu thủ** — khối vẽ đè lên nhân vật.

Nguy hiểm ở chỗ máy cho điểm CÀNG CAO: sọc đè lên áo = thêm chi tiết = bớt
"vùng phẳng". Thước hoạt động đúng như thiết kế, nhưng nó đo *độ chi tiết*, nó
không biết chi tiết đó là hoạ tiết đang phá hỏng nhân vật.

Sửa: đảo thứ tự lớp — vẽ khối trước, dán nhân vật sau.

**Rút ra:** điểm số cao KHÔNG phải bằng chứng ảnh đẹp. Điểm số chỉ loại được
ảnh trống. Bước mở ảnh ra nhìn không bao giờ bỏ được, kể cả khi máy khen hết
lời — nhất là khi máy khen hết lời.

---

## 4b. ⚠️ CÁCH ĐO — đã sai một lần, đừng lặp

**Thước đo đầu tiên SAI.** Nó nhận diện "trống" theo MÀU (pixel xanh = nền).
Hậu quả: khối chữ nền xanh đậm bị đếm nhầm thành nền trống, nên bản thiết kế
mới có khối thông tin đặc vẫn bị chấm "rớt". Ngược lại, nới ngưỡng màu thì bản
cũ rõ ràng trống lại được chấm "đạt" — mâu thuẫn với mắt.

**Thước đúng: đo ĐỘ CHI TIẾT CỤC BỘ, không đo màu.** Chuyển ảnh sang xám, tính
độ lệch chuẩn trong ô 9×9 quanh mỗi điểm; điểm nào độ lệch < 6 là vùng phẳng
(không có gì để nhìn). Cách này khớp với mắt trên cả ảnh cũ lẫn ảnh mới, và
không phụ thuộc màu nền nên đổi tông màu vẫn dùng được.

Số đo thật bằng thước đúng (26/8):

| Ảnh | Vùng phẳng | Ô giữa |
|---|---|---|
| Sávio (đang chạy) | 70,6% | 97% |
| Ahoka (đang chạy) | 71,4% | 72% |
| Malaysia–VN (đang chạy) | 76,6% | 83% |
| Baleba (Jane 26/8) | 60,1% | 59% |
| **Phương án A** (nhân vật lớn) | 55,8% | 85% |
| **Phương án B** (đối đầu) | **52,5%** | **55%** |
| **Phương án C** (bảng điểm) | 64,6% | 76% |

**Ngưỡng 45% ban đầu đặt vội, chưa kiểm tính khả thi.** Phong cách phẳng của
thương hiệu luôn có mảng lớn đồng màu, nên 45% gần như không đạt nổi. Nới thành
**55% cho tổng thể, giữ 60% cho ô giữa** — ô giữa mới là chỗ quyết định ảnh có
"chết" hay không.

**Bài học chung:** đặt ngưỡng xong phải chạy thử trên mẫu thật (cả mẫu tốt lẫn
mẫu xấu) trước khi công bố là chuẩn. Ngưỡng mà mẫu nào cũng rớt thì là ngưỡng
hỏng, không phải mẫu hỏng.

## 5. Việc còn nợ

- [ ] Viết script đo tự động (lưới 3×3 + chiều cao chữ) gắn vào bước trước khi đăng
- [ ] Làm lại thumbnail cho các bài chuyển nhượng gần đây đang dính khoảng trống chết
- [ ] Sửa lỗi ảnh cầu thủ mặc áo đội cũ trong tin chuyển nhượng
