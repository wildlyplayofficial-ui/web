// Tỷ lệ thập phân: HTML máy chủ luôn là thập phân (SEO); DoiDinhDang ở chân trang đổi chữ sau khi tải nếu khách chọn kiểu khác.
export function Ty({ v }: { v: number }) {
  const s = v.toFixed(2);
  return <span data-ty={s}>{s}</span>;
}

/** Câu chữ có tỷ lệ đánh dấu bằng T(): mỗi tỷ lệ thành một Ty để đổi theo kiểu khách chọn. */
export function ChuTy({ text }: { text: string }) {
  const phan = text.split(/\u27E6([\d.]+)\u27E7/);
  return (
    <>
      {phan.map((p, i) => (i % 2 === 1 ? <Ty key={i} v={Number(p)} /> : p))}
    </>
  );
}
