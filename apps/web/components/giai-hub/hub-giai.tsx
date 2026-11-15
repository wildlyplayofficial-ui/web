import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/brand";
import { jsonLd, suKienTran } from "@/lib/du-doan-schema";
import type { GiaiTrang } from "@/lib/du-doan-loc";
import { ngayThang, thuVN } from "@/lib/du-doan-tran";
import type { HubGiaiData, NgayDuDoan } from "@/lib/giai-hub";
import { withLang, type Lang } from "@/lib/i18n";
import { duongTipGiai } from "@/lib/tip-giai";
import type { AnalysisArticle } from "@/lib/types";
import { BaiMoi } from "./bai-moi";
import { DuDoanTheoNgay } from "./du-doan-ngay";
import { FaqHub, type CauHoiHub } from "./faq";
import { KetQuaVong } from "./ket-qua";
import { Khoi } from "./khoi";
import { LucLuong } from "./luc-luong";
import { ThongKeCauThu } from "./thong-ke";

export interface DauBang {
  nhat: { ten: string; diem: number };
  nhi: { ten: string; diem: number };
  vong: number;
}

interface Props {
  lang: Lang;
  compName: string;
  mua: string;
  giai: GiaiTrang;
  data: HubGiaiData;
  ngay: NgayDuDoan[];
  /** Bảng xếp hạng đầy đủ (LeagueTable + tab sân nhà/khách) dựng sẵn ở trang. */
  bang: ReactNode;
  dauBang: DauBang | null;
  /** Tên đội trong BXH — để khớp tên ngắn của tệp dự đoán ("Man City") ra logo. */
  tenBang: string[];
  bai: AnalysisArticle[];
  trangTru: AnalysisArticle[];
}

const LINK_KHAC = "inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold transition-colors hover:border-brand hover:text-brand";

function cauHoi({ compName, mua, data, ngay, dauBang }: Props): CauHoiHub[] {
  const ds: CauHoiHub[] = [];
  if (dauBang) {
    const cach = dauBang.nhat.diem - dauBang.nhi.diem;
    ds.push({
      hoi: `Ai đang dẫn đầu ${compName} ${mua}?`,
      dap: cach === 0
        ? `Sau ${dauBang.vong} vòng, ${dauBang.nhat.ten} và ${dauBang.nhi.ten} cùng có ${dauBang.nhat.diem} điểm ở hai vị trí đầu bảng xếp hạng.`
        : `Sau ${dauBang.vong} vòng, ${dauBang.nhat.ten} dẫn đầu với ${dauBang.nhat.diem} điểm, hơn ${dauBang.nhi.ten} ${cach} điểm.`,
    });
  }
  if (ngay.length > 0 && data.vongToi) {
    const dau = ngay[0];
    const cuoi = ngay[ngay.length - 1];
    const soTran = ngay.reduce((n, d) => n + d.ds.length, 0);
    const tu = `${thuVN(dau.ngay)} ${ngayThang(dau.ngay)}`;
    const den = `${thuVN(cuoi.ngay)} ${ngayThang(cuoi.ngay)}`;
    ds.push({
      hoi: `Vòng ${data.vongToi} ${compName} đá ngày nào?`,
      dap: `${dau === cuoi ? `Ngày ${tu}` : `Từ ${tu} đến ${den}`} (giờ Việt Nam). Trận đầu tiên: ${dau.ds[0].nha} vs ${dau.ds[0].khach} lúc ${dau.ds[0].gio}. Trang đang có dự đoán tỷ số cho ${soTran} trận.`,
    });
  }
  const vua = data.top.ban[0];
  if (vua) {
    ds.push({
      hoi: `Ai đang dẫn đầu danh sách ghi bàn ${compName}?`,
      dap: `${vua.ten} (${vua.doi}) với ${vua.gt} bàn${data.vongXong ? ` sau vòng ${data.vongXong}` : ""}, theo số liệu ${data.nguon}.`,
    });
  }
  return ds;
}

export function HubGiai(p: Props) {
  const { lang, compName, mua, giai, data, ngay, bang, bai, trangTru } = p;
  const soVang = data.vang.reduce((n, d) => n + d.ds.length, 0);
  const tran = ngay.flatMap((d) => d.ds);
  const hoiDap = cauHoi(p);
  const suKien = tran.length > 0 && {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Lịch thi đấu và dự đoán ${compName} vòng ${data.vongToi ?? ""}`.trim(),
    itemListElement: tran.map((h, i) => ({ "@type": "ListItem", position: i + 1, item: suKienTran(h, SITE_URL, true) })),
  };
  return (
    <div className="mx-auto max-w-[860px] px-4 pb-12 sm:px-5">
      <header className="pt-6 pb-4">
        <h1 className="font-display text-[26px] font-bold leading-tight sm:text-3xl">{`Lịch thi đấu, kết quả, dự đoán ${compName} ${mua}`}</h1>
        <p className="mt-2 text-sm text-muted">
          {[`Mùa ${mua}`, data.vongXong ? `cập nhật sau vòng ${data.vongXong}` : null, "giờ Việt Nam"].filter(Boolean).join(" · ")}
        </p>
        {/* Peter 15/11 "cái này để lên trên / kiểu 2 option khác cho user chọn". */}
        <nav aria-label={`Dự đoán khác ${compName}`} className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Dự đoán khác:</span>
          <Link href={withLang(duongTipGiai("tai-xiu", giai), lang)} className={LINK_KHAC}>
            Over/Under 2.5
          </Link>
          <Link href={withLang(duongTipGiai("hai-doi-ghi-ban", giai), lang)} className={LINK_KHAC}>
            Cả 2 đội ghi bàn
          </Link>
        </nav>
      </header>

      {/* Peter 15/11: 1 cột, BXH → thống kê cầu thủ → kết quả vòng. */}
      <div className="space-y-10">
        <Khoi id="du-doan" tieuDe={`Lịch thi đấu & dự đoán vòng ${data.vongToi ?? ""}`.trim()}>
          <DuDoanTheoNgay
            ngay={ngay}
            lang={lang}
            nl={{ ungVien: [...p.tenBang, ...data.ketQua.flatMap((k) => [k.nha, k.khach]), ...data.vang.map((v) => v.doi), ...Object.keys(data.logo ?? {})], du: data.logo }}
          />
        </Khoi>
        <Khoi id="bang-xep-hang" tieuDe={`Bảng xếp hạng ${compName} ${mua}`}>
          {bang}
        </Khoi>
        <Khoi id="thong-ke" tieuDe={`Thống kê cầu thủ ${compName}`} phu={`Nguồn: ${data.nguon}${data.vongXong ? ` · sau vòng ${data.vongXong}` : ""}`}>
          <ThongKeCauThu top={data.top} logo={data.logo} />
        </Khoi>
        {data.ketQua.length > 0 && (
          <Khoi id="ket-qua" tieuDe={`Kết quả ${compName} vòng ${data.vongXong}`}>
            <KetQuaVong ds={data.ketQua} logo={data.logo} />
          </Khoi>
        )}
        {data.vang.length > 0 && (
          <Khoi
            id="luc-luong"
            tieuDe={data.coTreoGio ? "Lực lượng: chấn thương & treo giò" : "Chấn thương"}
            phu={`${soVang} cầu thủ có thể vắng${data.vongToi ? ` ở vòng ${data.vongToi}` : ""}`}
          >
            <LucLuong data={data} />
          </Khoi>
        )}
        {/* Peter 15/11 "bỏ lịch fantasy ra đi": gỡ khối Lịch khó/dễ (độ khó FPL). */}
        {(bai.length > 0 || trangTru.length > 0) && (
          <Khoi id="bai-moi" tieuDe={`Bài mới về ${compName}`}>
            <BaiMoi bai={bai} trangTru={trangTru} lang={lang} />
          </Khoi>
        )}
      </div>

      {hoiDap.length > 0 && (
        <div className="mt-10">
          <Khoi id="hoi-dap" tieuDe={`Câu hỏi thường gặp về ${compName}`}>
            <FaqHub ds={hoiDap} />
          </Khoi>
        </div>
      )}
      {suKien && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(suKien) }} />}
    </div>
  );
}
