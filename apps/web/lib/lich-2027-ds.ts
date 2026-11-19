import { CAP_NHAT_ISO as ASIAN_CUP_ISO } from "@/lib/asian-cup-2027";
import { CAP_NHAT_ISO as HUB_ISO, DU_LIEU as HUB } from "@/lib/lich-thi-dau-bong-da-2027";
import { CAP_NHAT_ISO as C1_ISO, DU_LIEU as C1 } from "@/lib/chung-ket-c1-2027";
import { CAP_NHAT_ISO as WC_NU_ISO, DU_LIEU as WC_NU } from "@/lib/world-cup-nu-2027";
import { CAP_NHAT_ISO as SEA_ISO, DU_LIEU as SEA } from "@/lib/sea-games-2027";

export interface TrangLich2027 {
  duong: string;
  ten: string;
  capNhatIso: string;
}

/** Hub + mọi trang sự kiện 2027: hub link tới tất cả, trang con link chéo nhau, sitemap đọc từ đây. */
export const TRANG_LICH_2027: TrangLich2027[] = [
  { duong: HUB.duong, ten: "Lịch thi đấu bóng đá 2027", capNhatIso: HUB_ISO },
  { duong: "/lich-thi-dau-asian-cup-2027", ten: "Lịch thi đấu Asian Cup 2027", capNhatIso: ASIAN_CUP_ISO },
  { duong: C1.duong, ten: "Chung kết C1 2027", capNhatIso: C1_ISO },
  { duong: WC_NU.duong, ten: "World Cup nữ 2027", capNhatIso: WC_NU_ISO },
  { duong: SEA.duong, ten: "SEA Games 2027", capNhatIso: SEA_ISO },
];
