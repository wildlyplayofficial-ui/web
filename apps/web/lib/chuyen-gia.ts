import { SITE_NAME } from "./brand";
import { tenGiaiGoc } from "./ten-viet";

/**
 * Chuyên gia ký tên dưới mỗi trận dự đoán (Peter 11/11/2026). Mỗi người ôm cố định vài giải để
 * người đọc quen mặt; giải không khớp ai thì về Phạm Tuấn Kiệt. Giới thiệu nằm ở mục "Đội ngũ
 * chuyên gia" trên /about (neo #slug) — không trang riêng, KHÔNG ảnh (Peter chốt 11/11).
 * Giới thiệu chỉ nói người đó theo dõi gì + dự đoán dựa trên gì — KHÔNG bịa năm kinh nghiệm,
 * nơi làm, giải thưởng, bằng cấp hay tỷ lệ trúng.
 */
export interface ChuyenGia {
  slug: string;
  ten: string;
  /** Mảng phụ trách, hiện trên trang hồ sơ. */
  phuTrach: string;
  gioiThieu: string[];
  /** Khớp tên giải (chữ thường) — so cả tên Việt lẫn tên gốc tiếng Anh. */
  giai: RegExp[];
}

// Cách chốt chung (số liệu gom, chốt trước giờ đá) đã nằm ở mục "Cách chúng tôi dự đoán" trên
// /about — giới thiệu từng người chỉ nói phần riêng của họ, khỏi lặp 5 lần.
export const CHUYEN_GIA: ChuyenGia[] = [
  {
    slug: "le-hoang-bach",
    ten: "Lê Hoàng Bách",
    phuTrach: "Ngoại hạng Anh, Cúp FA",
    gioiThieu: [
      "Theo dõi Ngoại hạng Anh và Cúp FA từng vòng.",
      "Ở các trận lớn giữa nhóm đầu bảng, phần đọc trận đặt nặng phong độ sân nhà, độ dày lịch thi đấu và những lần gặp nhau gần nhất.",
    ],
    giai: [/^(english |england )?premier league$/, /ngoại hạng anh/, /\bfa cup\b|cúp fa/],
  },
  {
    slug: "tran-minh-triet",
    ten: "Trần Minh Triết",
    phuTrach: "La Liga, Serie A",
    gioiThieu: [
      "Đọc trận từ góc chiến thuật.",
      "Mỗi dự đoán bắt đầu từ sơ đồ dự kiến, cách hai đội pressing và triển khai bóng, rồi đối chiếu với phong độ và tỷ lệ thị trường.",
    ],
    giai: [/^(spain )?la ?liga$/, /^(italy )?serie a$/],
  },
  {
    slug: "vu-duc-khai",
    ten: "Vũ Đức Khải",
    phuTrach: "Bundesliga, Ligue 1, cúp châu Âu",
    gioiThieu: [
      "Ở các trận cúp châu Âu, phần nhận định chú ý cách đội bóng xoay tua đội hình giữa giải quốc nội và đấu trường châu lục.",
      "Với các cặp đấu loại trực tiếp, kết quả lượt đi và lợi thế sân nhà ở lượt về được tính vào tỷ số dự đoán.",
    ],
    giai: [/^(germany )?bundesliga$/, /^(france )?ligue 1$/, /champions league|europa|conference league|cúp c[123]/],
  },
  {
    slug: "dang-quang-vinh",
    ten: "Đặng Quang Vinh",
    phuTrach: "Tuyển Việt Nam, V-League, bóng đá đội tuyển",
    gioiThieu: [
      "Theo sát đội tuyển Việt Nam, V-League và các trận đội tuyển: giao hữu quốc tế, AFF Cup, vòng loại châu Á, Nations League.",
      "Với trận đội tuyển, dự đoán cân nhắc thêm danh sách triệu tập, thời gian tập trung và mục tiêu của từng đội ở giải.",
    ],
    giai: [
      /v-?league|việt nam|vietnam/,
      /giao hữu|friendl/,
      /\baff\b|asean|casper/,
      /asian cup|\bafc\b|vòng loại|qualif/,
      /nations league|cup of nations|đội tuyển/,
    ],
  },
  {
    slug: "pham-tuan-kiet",
    ten: "Phạm Tuấn Kiệt",
    phuTrach: "Các giải hạng dưới, Bắc Âu, Nam Mỹ và các giải còn lại",
    gioiThieu: [
      "Các giải hạng dưới và giải ít được chú ý thường ít tin tức đội hình, nên dự đoán dựa chủ yếu vào số liệu.",
      "Ba thứ được xem trước tiên: xu hướng bàn thắng, chuỗi phong độ và khoảng cách giữa hai đội trên bảng xếp hạng.",
    ],
    giai: [],
  },
];

const KIET = CHUYEN_GIA[4];
const VINH = CHUYEN_GIA[3];
const VN = /^(việt nam|vietnam)$/i;

/** Neo của chuyên gia trong mục "Đội ngũ chuyên gia" trên /about. */
export const duongDanChuyenGia = (c: ChuyenGia) => `/about#${c.slug}`;

/** Person cho JSON-LD (author của trang trận + khai trên /about), @id trùng nhau để Google gộp. */
export function nguoiChuyenGia(c: ChuyenGia, base: string) {
  return {
    "@type": "Person",
    "@id": `${base}${duongDanChuyenGia(c)}`,
    name: c.ten,
    url: `${base}${duongDanChuyenGia(c)}`,
    description: c.gioiThieu[0],
    knowsAbout: c.phuTrach,
    worksFor: { "@type": "Organization", name: SITE_NAME, url: base },
  };
}

/** Chuyên gia phụ trách một trận: trận có tuyển Việt Nam luôn về Đặng Quang Vinh. */
export function chuyenGiaCua(h: { giai: string; nha: string; khach: string }): ChuyenGia {
  if (VN.test(h.nha) || VN.test(h.khach)) return VINH;
  const ten = [h.giai, tenGiaiGoc(h.giai)].map((s) => s.toLowerCase().trim());
  return CHUYEN_GIA.find((c) => c.giai.some((re) => ten.some((t) => re.test(t)))) ?? KIET;
}

/** Tên cũ của tác giả nhận định (lib/brand.ts CHU_TAM), viết tay để file này khỏi kéo brand vào test. */
const CHU_TAM = "Chú Tám Banh";

/**
 * Bài nhận định ký "Chú Tám Banh" → ký tên chuyên gia phụ trách trận (Peter 11/11/2026 "apply các
 * chuyên gia vào các trận dự đoán"). Đổi cả chữ "Chú Tám" trong thân bài. Bài tác giả khác giữ nguyên.
 */
export function ganChuyenGia<
  T extends { byline: string; league?: string | null; body?: string; du_doan?: { home: string; away: string } | null; teams?: string[] | null },
>(a: T): T {
  if (a.byline !== CHU_TAM) return a;
  const [nha = "", khach = ""] = a.du_doan ? [a.du_doan.home, a.du_doan.away] : (a.teams ?? []);
  const ten = chuyenGiaCua({ giai: a.league ?? "", nha, khach }).ten;
  return { ...a, byline: ten, ...(a.body ? { body: a.body.replace(/Chú Tám( Banh)?/g, ten) } : {}) };
}
