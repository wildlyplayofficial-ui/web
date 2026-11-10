/**
 * Tên tiếng Việt cho đội tuyển + giải trong tệp dự đoán tuần (người Việt tìm bằng tên Việt).
 * CLB giữ tên gốc như báo Việt vẫn viết. Tên gốc vẫn dùng để tra logo + phong độ.
 */

const DOI_TUYEN: Record<string, string> = {
  Austria: "Áo", Belgium: "Bỉ", Cyprus: "Síp", "Czech Republic": "CH Séc", Denmark: "Đan Mạch", England: "Anh",
  "Faroe Islands": "Quần đảo Faroe", Finland: "Phần Lan", France: "Pháp", Germany: "Đức", Greece: "Hy Lạp",
  Netherlands: "Hà Lan", "North Macedonia": "Bắc Macedonia", "Northern Ireland": "Bắc Ireland", Norway: "Na Uy",
  Poland: "Ba Lan", Portugal: "Bồ Đào Nha", "Rep of Ireland": "CH Ireland", Spain: "Tây Ban Nha", Sweden: "Thụy Điển",
  Switzerland: "Thụy Sĩ", Turkey: "Thổ Nhĩ Kỳ", Wales: "Xứ Wales", Scotland: "Scotland", Italy: "Italy",
  Croatia: "Croatia", Hungary: "Hungary", Romania: "Romania", Serbia: "Serbia", Ukraine: "Ukraine",
};

const GIAI: Record<string, string> = {
  "Premier League": "Ngoại hạng Anh",
  "English Premier League": "Ngoại hạng Anh",
  "England Premier League": "Ngoại hạng Anh",
  "Algeria Ligue 1": "VĐQG Algeria",
  "Brazil Serie A": "VĐQG Brazil",
  "Brazil Serie B": "Hạng 2 Brazil",
  "Colombia Categoria Primera A": "VĐQG Colombia",
  "England League One": "Hạng 3 Anh (League One)",
  "England League Two": "Hạng 4 Anh (League Two)",
  "England National League": "Hạng 5 Anh (National League)",
  "England National League North": "Hạng 6 Anh miền Bắc",
  "England National League South": "Hạng 6 Anh miền Nam",
  "Germany Regionalliga Bayern": "Hạng 4 Đức (Bayern)",
  "Germany Regionalliga North": "Hạng 4 Đức (miền Bắc)",
  "Germany Regionalliga Southwest": "Hạng 4 Đức (Tây Nam)",
  "Germany Regionalliga West": "Hạng 4 Đức (miền Tây)",
  "India I League": "Hạng 2 Ấn Độ (I-League)",
  "Italy Serie C": "Serie C Ý",
  "Montenegro First League": "VĐQG Montenegro",
  "Northern Ireland Premier League": "VĐQG Bắc Ireland",
  "Serbia Prva Liga": "Hạng 2 Serbia",
  "Slovenia 2. SNL": "Hạng 2 Slovenia",
  "Spain Segunda Division": "Hạng 2 Tây Ban Nha",
  "Spain La Liga": "La Liga",
  "Uganda Premier League": "VĐQG Uganda",
  "Ukraine Persha Liga": "Hạng 2 Ukraine",
  "Uruguay Primera Division Finals": "Chung kết VĐQG Uruguay",
  "UEFA Nations League": "Nations League",
};

export const tenDoiViet = (ten: string) => DOI_TUYEN[ten] ?? ten;
export const tenGiaiViet = (ten: string) => GIAI[ten] ?? ten;
const GIAI_GOC = Object.fromEntries(Object.entries(GIAI).map(([goc, viet]) => [viet, goc]));

/** Tên nước đứng đầu tên giải gốc ("England League One") → mã cờ. Bắc Ireland xét trước Anh. */
const NUOC_GIAI: [RegExp, string][] = [
  [/^northern ireland/, "gb-nir"], [/^scotland/, "gb-sct"], [/^wales/, "gb-wls"], [/^england/, "gb-eng"],
  [/^germany/, "de"], [/^italy/, "it"], [/^spain/, "es"], [/^france/, "fr"], [/^brazil/, "br"], [/^colombia/, "co"],
  [/^algeria/, "dz"], [/^india/, "in"], [/^montenegro/, "me"], [/^serbia/, "rs"], [/^slovenia/, "si"],
  [/^uganda/, "ug"], [/^ukraine/, "ua"], [/^uruguay/, "uy"], [/^uefa|nations league/, "eu"],
];

/** Cờ giải theo tên nước trong tên gốc; nhận cả tên Việt (đổi ngược về tên gốc trước). */
export function coGiaiGoc(giai: string): string | null {
  const goc = (GIAI_GOC[giai] ?? giai).toLowerCase();
  const nuoc = NUOC_GIAI.find(([re]) => re.test(goc));
  return nuoc ? `https://flagcdn.com/w40/${nuoc[1]}.png` : null;
}
