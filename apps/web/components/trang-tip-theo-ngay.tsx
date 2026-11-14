import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SO_NGAY_TIP, kyThu } from "@/components/chon-ngay-tip";
import { duongTip, metaTipNgay, TrangTipNgay, tipNgay, type KyNgay } from "@/components/trang-tip-ngay";
import { ngayVN } from "@/lib/du-doan-hang";
import { lechNgay } from "@/lib/du-doan-loc";
import { withLang, type Lang } from "@/lib/i18n";
import type { LoaiTip } from "@/lib/tip-ngay";

/**
 * Tip theo NGÀY CỤ THỂ: /tai-xiu/ngay/2026-11-17 (mục I, 14/11). Chỉ 5 ngày từ hôm nay; hôm nay / ngày mai
 * chuyển về đường cũ (-hom-nay / -ngay-mai). Ngoài 5 ngày hoặc sai dạng ngày → 404; ngày không có trận → noindex.
 */
function kyTuThamSo(ngay: string): KyNgay | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return null;
  const homNay = ngayVN(Date.now());
  for (let i = 0; i < SO_NGAY_TIP; i++) if (lechNgay(homNay, i) === ngay) return kyThu(homNay, i);
  return null;
}

export async function metaTipTheoNgay(loai: LoaiTip, ngay: string, lang: Lang): Promise<Metadata> {
  const ky = kyTuThamSo(ngay);
  if (!ky || ky === "hom-nay" || ky === "ngay-mai") return {};
  const { homNay, ds } = await tipNgay(loai, ky);
  return metaTipNgay(loai, homNay, ds.length, lang, ky);
}

export async function TrangTipTheoNgay({ loai, ngay, lang }: { loai: LoaiTip; ngay: string; lang: Lang }) {
  const ky = kyTuThamSo(ngay);
  if (!ky) notFound();
  if (ky === "hom-nay" || ky === "ngay-mai") redirect(withLang(duongTip(loai, ky), lang));
  const { homNay, ds } = await tipNgay(loai, ky);
  return <TrangTipNgay loai={loai} homNay={homNay} ds={ds} lang={lang} ky={ky} />;
}
