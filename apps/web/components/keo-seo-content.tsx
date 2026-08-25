import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";

/**
 * Bài SEO đặt SAU bảng kèo (kế hoạch SEO 25/8, mô hình trang danh mục: người
 * dùng gặp sản phẩm trước, nội dung giải thích sau).
 *
 * Ba điều buộc phải giữ, đừng sửa nếu không có lý do:
 * 1. KHÔNG có H1 ở đây — trang đã có đúng một H1 phía trên. Mở đầu bằng H2.
 * 2. KHÔNG viết "trực tiếp"/"real-time" — kèo cập nhật mỗi 3 tiếng, viết khác
 *    đi là mô tả sai tính năng.
 * 3. KHÔNG hứa "chắc thắng"/"chuẩn 100%"/lợi nhuận. Trang là dữ liệu tham
 *    khảo, banhbong.net không tổ chức cá cược.
 *
 * Link nội bộ đều là thẻ <a> thật (qua next/link) để máy tìm kiếm đi theo được.
 * Cả 8 đích đã kiểm trả 200 ngày 25/8.
 */

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-xl font-bold text-ink first:mt-0">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 font-display text-base font-bold text-ink">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>;
}

export function KeoSeoContent({ lang }: { lang: Lang }) {
  const L = (href: string) => withLang(href, lang);
  return (
    <section className="mx-auto mt-12 max-w-[820px] pb-16">
      <H2>Kèo bóng đá hôm nay: xem tỷ lệ, biến động và xác suất thực</H2>
      <P>
        Bảng kèo bóng đá hôm nay tại banhbong.net tổng hợp tỷ lệ của các trận đấu đáng chú ý theo giờ Việt Nam,
        bao gồm kèo châu Á, Tài/Xỉu và 1X2 cho cả trận lẫn hiệp một.
      </P>
      <P>
        Dữ liệu được cập nhật định kỳ mỗi 3 giờ. Khi mở chi tiết một trận đấu, bạn có thể so sánh kèo mở với kèo
        hiện tại, theo dõi tỷ lệ đã thay đổi như thế nào và xem xác suất thực sau khi loại phần margin của thị trường.
      </P>
      <P>
        Đây là bảng dữ liệu để tham khảo và phân tích trận đấu. banhbong.net không tổ chức cá cược và không cam kết
        bất kỳ kết quả nào.
      </P>

      <H2>Bảng kèo bóng đá hôm nay có những gì?</H2>
      <P>
        Mỗi trận trong bảng hiển thị thời gian thi đấu, giải đấu, hai đội và các nhóm tỷ lệ chính. Bạn có thể tìm
        theo tên đội hoặc chọn ngày để thu hẹp danh sách trận đấu.
      </P>
      <P>
        Nếu muốn kiểm tra giờ bóng lăn và kết quả của các trận khác, hãy xem{" "}
        <Link href={L("/matches")} className="text-brand underline">lịch thi đấu bóng đá hôm nay</Link>.
      </P>

      <H3>Kèo châu Á</H3>
      <P>
        Kèo châu Á, hay Asian Handicap, dùng một mức chấp để cân bằng tương quan giữa hai đội. Đội được đánh giá
        mạnh hơn có thể chấp -0.5, -0.75, -1 hoặc một mức khác; đội còn lại nhận mức chấp tương ứng.
      </P>
      <P>
        Ví dụ, đội chủ nhà -0.5 có nghĩa là đội đó phải thắng trận thì lựa chọn mới thắng. Nếu tỷ lệ là -1, đội cửa
        trên thắng cách biệt đúng một bàn sẽ hòa kèo, còn thắng từ hai bàn trở lên mới thắng trọn. Các mức phần tư
        như -0.25, -0.75 hoặc -1.25 được chia thành hai đường kèo gần nhất. Xem chi tiết tại bài{" "}
        <Link href={L("/guides/what-is-asian-handicap")} className="text-brand underline">Kèo Châu Á là gì?</Link>
      </P>

      <H3>Kèo Tài/Xỉu</H3>
      <P>
        Kèo Tài/Xỉu dựa trên tổng số bàn thắng của trận đấu. Thị trường đưa ra một mốc như 2.5 hoặc 3.0. Chọn Tài
        2.5 khi đánh giá trận đấu có khả năng xuất hiện từ 3 bàn trở lên; chọn Xỉu 2.5 khi đánh giá tổng số bàn
        thắng không vượt quá 2. Với mốc nguyên như 3.0, trận đấu có đúng 3 bàn sẽ hòa kèo.
      </P>
      <P>
        Bảng trên hiển thị cả Tài/Xỉu toàn trận và Tài/Xỉu hiệp một để người xem có thể so sánh cách thị trường
        định giá hai giai đoạn của trận đấu.
      </P>

      <H3>Kèo 1X2</H3>
      <P>
        Kèo 1X2 thể hiện ba kết quả cơ bản: 1 là đội chủ nhà thắng, X là hai đội hòa, 2 là đội khách thắng. Tỷ lệ
        càng thấp, xác suất thị trường gán cho kết quả đó càng cao — tỷ lệ 2.00 tương ứng với xác suất hàm ý khoảng
        50% trước khi loại margin.
      </P>
      <P>
        Nếu chưa quen với cách quy đổi các con số này, bạn có thể đọc hướng dẫn{" "}
        <Link href={L("/guides/how-to-read-betting-odds")} className="text-brand underline">
          cách đọc tỷ lệ kèo và xác suất hàm ý
        </Link>.
      </P>

      <H2>Kèo mở và kèo hiện tại khác nhau như thế nào?</H2>
      <P>
        Kèo mở là mức tỷ lệ được ghi nhận khi thị trường bắt đầu đưa ra giá cho trận đấu. Kèo hiện tại là mức tỷ lệ
        mới nhất tại thời điểm bảng dữ liệu được cập nhật.
      </P>
      <P>
        Khoảng cách giữa hai mức này cho biết thị trường đã thay đổi cách đánh giá trận đấu như thế nào. Sự thay đổi
        có thể xuất phát từ thông tin đội hình, chấn thương, lịch thi đấu, lượng giao dịch hoặc các dữ kiện mới
        trước giờ bóng lăn.
      </P>
      <P>
        Tuy nhiên, việc tỷ lệ giảm không tự động có nghĩa một lựa chọn sẽ thắng. Nó chỉ cho thấy mức giá hiện tại đã
        khác mức giá ban đầu. Muốn hiểu biến động kèo, cần xem cả mức chấp, giá của hai cửa và thời điểm thay đổi,
        không nên chỉ nhìn một mũi tên tăng hoặc giảm.
      </P>

      <H2>Xác suất thực là gì?</H2>
      <P>
        Tỷ lệ niêm yết luôn bao gồm một phần biên của thị trường, thường gọi là margin hoặc vig. Vì vậy, nếu quy đổi
        tất cả cửa sang xác suất rồi cộng lại, tổng thường lớn hơn 100%.
      </P>
      <P>
        Xác suất thực trên banhbong.net được tính bằng cách loại phần margin này để đưa tổng xác suất về gần 100%.
        Kết quả giúp người xem có một điểm tham chiếu rõ hơn khi so sánh các cửa, nhưng không phải là dự đoán chắc
        chắn về kết quả trận đấu. Bạn cũng có thể tự nhập tỷ lệ vào{" "}
        <Link href={L("/calculators/de-vig")} className="text-brand underline">công cụ loại margin</Link> để kiểm tra
        cách xác suất được tính.
      </P>

      <H2>Cách sử dụng bảng kèo bóng đá</H2>
      <P>Một quy trình tham khảo đơn giản gồm bốn bước:</P>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        <li>Chọn ngày hoặc tìm tên đội bóng.</li>
        <li>So sánh kèo châu Á, Tài/Xỉu và 1X2 của trận đấu.</li>
        <li>Mở chi tiết để kiểm tra kèo mở, kèo hiện tại và xác suất sau khi loại margin.</li>
        <li>Đối chiếu với thông tin đội hình, phong độ và bối cảnh trận đấu trước khi hình thành nhận định.</li>
      </ol>
      <P>
        Bảng kèo cho biết thị trường đang định giá trận đấu ra sao, nhưng không giải thích đầy đủ nguyên nhân đằng
        sau mức giá. Để xem thêm bối cảnh, bạn có thể truy cập khu vực{" "}
        <Link href={L("/analysis")} className="text-brand underline">nhận định và phân tích bóng đá</Link>. Nếu chỉ
        muốn xem những trận được Chú Tám Banh lựa chọn hoặc chủ động bỏ qua, hãy kiểm tra{" "}
        <Link href={L("/daily-board")} className="text-brand underline">bảng dự đoán hôm nay</Link>.
      </P>

      <H2>Vì sao banhbong.net không đưa ra kèo cho mọi trận?</H2>
      <P>
        Không phải trận đấu nào có tỷ lệ cũng tạo ra một lựa chọn đáng theo dõi. Có những trận thiếu thông tin đội
        hình, giá đã phản ánh gần hết dữ kiện hoặc không có đủ cơ sở để đưa ra nhận định.
      </P>
      <P>
        Vì vậy, bảng kèo có thể hiển thị nhiều trận trong khi bảng dự đoán chỉ chọn một vài trận, thậm chí không
        chọn trận nào. Đây là quyết định có chủ đích, không phải thiếu dữ liệu. Mọi lựa chọn đã công bố đều được lưu
        lại, bao gồm cả kết quả thắng, thua và hòa — bạn có thể kiểm tra{" "}
        <Link href={L("/track-record")} className="text-brand underline">toàn bộ thành tích công khai</Link> thay vì
        chỉ xem những kết quả thuận lợi.
      </P>

      <H2>Câu hỏi thường gặp về kèo bóng đá hôm nay</H2>
      <H3>Tỷ lệ kèo bóng đá được cập nhật khi nào?</H3>
      <P>Bảng kèo tại banhbong.net được cập nhật định kỳ mỗi 3 giờ. Tỷ lệ có thể tiếp tục thay đổi trước khi trận đấu bắt đầu.</P>
      <H3>Bảng có kèo hiệp một không?</H3>
      <P>Có. Trang hiển thị kèo châu Á, Tài/Xỉu và 1X2 cho cả toàn trận lẫn hiệp một khi dữ liệu tương ứng có sẵn.</P>
      <H3>Mũi tên tăng giảm trong bảng kèo có ý nghĩa gì?</H3>
      <P>Mũi tên thể hiện tỷ lệ hiện tại đã tăng hoặc giảm so với lần ghi nhận trước. Đây là dấu hiệu biến động giá, không phải tín hiệu đảm bảo một cửa sẽ thắng.</P>
      <H3>Xác suất thực có phải dự đoán kết quả không?</H3>
      <P>Không. Xác suất thực là xác suất hàm ý được điều chỉnh sau khi loại margin. Nó phản ánh cách thị trường đang định giá các khả năng, không thể loại bỏ yếu tố bất ngờ của bóng đá.</P>
      <H3>banhbong.net có phải nhà cái không?</H3>
      <P>Không. banhbong.net cung cấp dữ liệu, công cụ và nội dung phân tích để tham khảo; website không nhận tiền cược và không tổ chức cá cược.</P>
      <H3>Có kèo bóng đá nào chắc thắng không?</H3>
      <P>
        Không. Mọi trận đấu đều có rủi ro và không mô hình hay người phân tích nào có thể bảo đảm kết quả. Nếu lựa
        chọn tham gia, hãy đặt giới hạn rõ ràng và xem{" "}
        <Link href={L("/responsible-play")} className="text-brand underline">nguyên tắc chơi có trách nhiệm</Link>.
      </P>
    </section>
  );
}
