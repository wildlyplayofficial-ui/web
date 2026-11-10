/** Nhãn nổi trên trận /du-doan — tách riêng, không kéo bảng logo (test chạy không cần alias @/). */

/** Tuyển Việt Nam · giải lớn · dự đoán chọn đội tỷ lệ cao hơn. */
export type NhanTran = "vn" | "hot" | "nguocKeo";

export interface TranCanNhan {
  giai: string;
  nha: string;
  khach: string;
  du: [number, number] | null;
  mot: [number, number, number] | null;
}

const GIAI_HOT = /nations league|^premier league|ngoại hạng anh|champions league|europa league|la ?liga|^serie a|bundesliga$|^ligue 1|world cup|v-league|aff|asian cup/i;
const VIET_NAM = /vi[eệ]t nam|vietnam/i;

/** Nhãn nổi trên trận: tuyển Việt Nam, giải lớn, dự đoán chọn đội có tỷ lệ cao hơn. */
export function nhanTran(h: TranCanNhan): NhanTran[] {
  const ds: NhanTran[] = [];
  if (VIET_NAM.test(h.nha) || VIET_NAM.test(h.khach)) ds.push("vn");
  if (GIAI_HOT.test(h.giai)) ds.push("hot");
  if (h.du && h.mot && h.du[0] !== h.du[1]) {
    const [mot, , hai] = h.mot;
    // Dự đoán đội thắng mà tỷ lệ đội đó cao hơn đội kia = đi ngược kèo.
    if (h.du[0] > h.du[1] ? mot > hai : hai > mot) ds.push("nguocKeo");
  }
  return ds;
}

