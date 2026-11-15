import { FaqHub, type CauHoiHub } from "@/components/giai-hub/faq";
import { SITE_URL } from "@/lib/brand";
import { jsonLd } from "@/lib/du-doan-schema";
import { nhanNgay, type TranKetQua } from "@/lib/ket-qua";

/**
 * SEO/GEO trang /ket-qua (Peter 15/11 "thêm seo và geo / nhắc là xem ở đâu, link kèm vào tỷ số /
 * khi người ta kiếm kết quả trận sẽ có bài mình"). Mọi câu đều lấy số thật đang hiện trên trang.
 */
interface Props {
  ngay: string;
  homNay: string;
  ngays: string[];
  nhom: [string, TranKetQua[]][];
}

const tySo = (t: TranKetQua) => `${t.nha} ${t.kq[0]}-${t.kq[1]} ${t.khach}`;

/** Đoạn mở đầu: ngày, số trận, số giải, giải nhiều trận nhất + 1 tỷ số mẫu. */
export function KetQuaMoDau({ ngay, homNay, nhom }: Omit<Props, "ngays">) {
  const soTran = nhom.reduce((n, [, ds]) => n + ds.length, 0);
  const [giaiDau, dsDau] = nhom[0];
  return (
    <p className="mt-2 text-[15px] leading-relaxed text-ink">
      {`Kết quả bóng đá ${nhanNgay(ngay, homNay).toLowerCase()}: ${soTran} trận thuộc ${nhom.length} giải, giờ Việt Nam. `}
      {nhom.length > 1
        ? `Nhiều trận nhất là ${giaiDau} (${dsDau.length} trận), ví dụ ${tySo(dsDau[0])}. `
        : `Tất cả thuộc ${giaiDau}, ví dụ ${tySo(dsDau[0])}. `}
      Mỗi tỷ số bên dưới là link tới trang riêng của trận trên banhbong.net, có kết quả cùng dự đoán và số liệu trước trận.
    </p>
  );
}

function cauHoi({ ngay, homNay, ngays, nhom }: Props): CauHoiHub[] {
  const nhan = nhanNgay(ngay, homNay).toLowerCase();
  const soTran = nhom.reduce((n, [, ds]) => n + ds.length, 0);
  const giai = nhom.slice(0, 3).map(([g]) => g).join(", ");
  return [
    {
      hoi: "Xem kết quả bóng đá hôm qua ở đâu?",
      dap: `Trên banhbong.net/ket-qua. Ngày ${nhan} có ${soTran} trận, gom theo giải (${giai}${nhom.length > 3 ? "…" : ""}), giờ Việt Nam. Bấm vào tỷ số để mở trang riêng của trận.`,
    },
    {
      hoi: "Xem kết quả một trận cụ thể ở đâu?",
      dap: "Mỗi trận có một trang riêng trên banhbong.net, tiêu đề dạng \"Kết quả đội nhà tỷ số đội khách\". Trang ghi tỷ số cuối cùng cùng dự đoán và số liệu trước trận. Từ trang Kết Quả, bấm vào tỷ số là tới.",
    },
    {
      hoi: "Kết quả bóng đá cập nhật lúc nào?",
      dap: `Tỷ số cập nhật mỗi sáng theo giờ Việt Nam, gồm các trận đêm qua và rạng sáng nay. Trang giữ ${ngays.length} ngày gần nhất có kết quả: ${ngays.map((k) => nhanNgay(k, homNay)).join(", ")}.`,
    },
  ];
}

/** Câu hỏi thường gặp + dữ liệu có cấu trúc (danh sách trận đã đá, mỗi trận trỏ về trang trận). */
export function KetQuaHoiDap(p: Props) {
  const tran = p.nhom.flatMap(([, ds]) => ds);
  const ds = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Kết quả bóng đá ${nhanNgay(p.ngay, p.homNay)}`,
    itemListElement: tran.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SportsEvent",
        name: `Kết quả ${t.nha} vs ${t.khach}`,
        sport: "Football",
        ...(t.khoa.endsWith("T99") ? {} : { startDate: t.khoa }),
        url: `${SITE_URL}/du-doan/${t.slug}`,
        description: `${t.giai}: ${tySo(t)}`,
        homeTeam: { "@type": "SportsTeam", name: t.nha },
        awayTeam: { "@type": "SportsTeam", name: t.khach },
      },
    })),
  };
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold">Câu hỏi thường gặp về kết quả bóng đá</h2>
      <FaqHub ds={cauHoi(p)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ds) }} />
    </section>
  );
}
