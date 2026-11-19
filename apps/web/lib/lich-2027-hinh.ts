/**
 * Hình lịch thi đấu 1200x675 của 5 trang lịch 2027, vẽ từ chính tệp dữ kiện của trang.
 * Sửa ngày trong lib/*-2027.ts xong thì vẽ lại: node apps/web/scripts/ve-hinh-lich-2027.mjs
 */
export interface HinhLich2027 {
  src: string;
  alt: string;
  width: 1200;
  height: 675;
}

const ALT: Record<string, string> = {
  "/lich-thi-dau-asian-cup-2027":
    "Lịch thi đấu Asian Cup 2027: khai mạc 23/12/2027, chung kết 21/1/2028 tại Saudi Arabia, vòng bảng chưa công bố, Việt Nam ở bảng E",
  "/chung-ket-c1-2027":
    "Lịch chung kết C1 2027: bán kết 27 và 28/4, 4 và 5/5, chung kết thứ Bảy 5/6/2027 tại sân Metropolitano, Madrid",
  "/world-cup-nu-2027":
    "Lịch thi đấu World Cup nữ 2027: khai mạc 24/6, chung kết 25/7/2027 tại Brazil, 32 đội, Việt Nam không có vé",
  "/sea-games-2027":
    "Lịch thi đấu SEA Games 2027: khai mạc 18/9, bế mạc 29/9/2027 tại Malaysia, bóng đá thi đấu ở Johor",
  "/lich-thi-dau-bong-da-2027":
    "Lịch thi đấu bóng đá 2027: chung kết C1 5/6, World Cup nữ 24/6 đến 25/7, SEA Games 18 đến 29/9, Asian Cup 23/12/2027 đến 21/1/2028",
};

export function hinhLich2027(duong: string): HinhLich2027 {
  return { src: `/lich-2027${duong}.webp`, alt: ALT[duong], width: 1200, height: 675 };
}
