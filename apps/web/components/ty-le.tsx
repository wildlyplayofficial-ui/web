// Tỷ lệ thập phân: HTML máy chủ luôn là thập phân (SEO); DoiDinhDang ở chân trang đổi chữ sau khi tải nếu khách chọn kiểu khác.
export function Ty({ v }: { v: number }) {
  const s = v.toFixed(2);
  return <span data-ty={s}>{s}</span>;
}
