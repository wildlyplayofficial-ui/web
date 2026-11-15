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

/** Đoạn mở đầu: số trận + các giải, viết như người nói (Peter 15/11 "e viết kì qá"). */
export function KetQuaMoDau({ ngay, homNay, nhom }: Omit<Props, "ngays">) {
  const soTran = nhom.reduce((n, [, ds]) => n + ds.length, 0);
  return (
    <p className="mt-2 text-[15px] leading-relaxed text-ink">
      {`Tỷ số ${soTran} trận ${nhanNgay(ngay, homNay).toLowerCase()} (giờ Việt Nam), gồm ${dsGiai(nhom)}. `}
      Bấm vào trận để xem nhận định và dự đoán banhbong đưa ra trước trận.
    </p>
  );
}

const dsGiai = (nhom: Props["nhom"]) =>
  nhom.slice(0, 3).map(([g]) => g).join(", ") + (nhom.length > 3 ? "…" : "");

function cauHoi({ homNay, ngays }: Props): CauHoiHub[] {
  return [
    {
      hoi: "Xem kết quả bóng đá hôm qua ở đâu?",
      dap: "Ngay trên trang này của banhbong.net. Kết quả xếp theo giải, giờ Việt Nam, cập nhật mỗi sáng. Bấm vào trận để mở trang chi tiết.",
    },
    {
      hoi: "Xem kết quả một trận cụ thể ở đâu?",
      dap: "Bấm vào trận trong danh sách. Mỗi trận có trang riêng: tỷ số, nhận định, dự đoán trước trận và phong độ hai đội.",
    },
    {
      hoi: "Kết quả bóng đá cập nhật lúc nào?",
      dap: `Mỗi sáng, gồm các trận tối qua và rạng sáng nay theo giờ Việt Nam. Bấm tab ngày ở đầu trang để xem lại: ${ngays.map((k) => nhanNgay(k, homNay)).join(", ")}.`,
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
