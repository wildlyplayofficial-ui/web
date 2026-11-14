import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Thân bài markdown của bài Desk — dùng chung cho /analysis/{slug} và trang dự đoán
 * /du-doan/{slug} (14/11: trang trận mang luôn phần nhận định để Google có nội dung riêng).
 *
 * Hai loại ảnh khác nhau trong thân bài, đừng gộp làm một:
 *  · LOGO ĐỘI chèn trong ô bảng lịch — phải nhỏ và có sẵn kích thước,
 *    không thì bảng vài chục dòng logo nhảy layout khi tải xong.
 *  · HÌNH MINH HOẠ (bảng lịch, sơ đồ bảng đấu) — phải hiện hết chiều ngang.
 * Trước 2/9/2026 mã ép CỨNG mọi ảnh 20x20, nên chèn hình minh hoạ vào
 * bài là ra một chấm 20px — không ai thấy. Phân biệt bằng NƠI CHỨA:
 * hình minh hoạ nằm ở kho blog-images, logo đội thì không.
 */
export function ThanBaiMd({ body }: { body: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="table-wrap"><table>{children}</table></div>
        ),
        img: ({ src, alt }) => {
          const url = typeof src === "string" ? src : "";
          const laHinhMinhHoa = url.includes("/blog-images/");
          return laHinhMinhHoa ? (
            <img src={url} alt={alt ?? ""} loading="lazy" decoding="async"
                 className="my-6 h-auto w-full rounded-card" />
          ) : (
            <img src={url} alt={alt ?? ""} loading="lazy" decoding="async"
                 width={20} height={20} />
          );
        },
      }}
    >
      {body.replace(/^\s*[-*]{3,}\s*\n/gm, "")}
    </ReactMarkdown>
  );
}
