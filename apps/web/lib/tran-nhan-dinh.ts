/**
 * Bài nhận định SINH TỪ SỐ cho trang trận tệp tuần (15/11, Peter chốt: mọi trận có dự đoán đều
 * có trang đủ dày). Mỗi đoạn viết từ số riêng của trận đó (10 trận gần nhất, đối đầu, bảng xếp
 * hạng, tỷ lệ) và câu chọn theo tình huống → hai trận khác nhau ra bài khác nhau. Không số nào bịa:
 * thiếu dữ liệu thì bỏ cả đoạn. Tỷ lệ bọc T() để ChuTy đổi kiểu hiển thị. Hàm THUẦN, import TƯƠNG ĐỐI.
 */
import { tenSo } from "./du-doan-cham";
import { cauThang } from "./du-doan-tran";
import { doanDoi } from "./tran-nhan-dinh-doi";
import { chon, soDoi, soDoiDau, xacSuat1X2, type SoDoi } from "./tran-nhan-dinh-so";
import { cuaNoiNhat, docHtft, KHOA_HTFT, nhanCua, type HtFt } from "./tran-htft";
import type { ThiTruongPhu } from "./tran-keo-phu";
import type { DongBangXep, SoLieuTran } from "./tran-so-lieu";
import { T } from "./ty-le";

export interface DauVaoNhanDinh {
  slug: string;
  /** Tên hiển thị (tên Việt nếu có) và tên gốc trong tệp (để khớp danh sách trận). */
  nha: string;
  khach: string;
  nhaGoc: string;
  khachGoc: string;
  du: [number, number] | null;
  mot: [number, number, number] | null;
  taiXiu: string | null;
  haiDoiGhi: boolean | null;
  /** Số liệu đã lọc độ mới (soLieuTuan). */
  so: SoLieuTran | null;
  pOu?: ThiTruongPhu;
  pBtts?: ThiTruongPhu;
  pCs?: ThiTruongPhu;
  htft?: HtFt;
  /** Đã qua giờ bóng lăn → nói tỷ lệ ở thì "trước trận", không "đang là". */
  daDa: boolean;
}

export interface MucNhanDinh { tieuDe: string; doan: string }

const dong = (ten: string, d: DongBangXep) => `${ten} đứng thứ ${d.hang} với ${d.diem} điểm sau ${d.tran} trận`;

function doanBangXep(v: DauVaoNhanDinh): string | null {
  const [a, b] = [v.so?.bxn, v.so?.bxk];
  if (!a && !b) return null;
  if (!a || !b) return a ? `${dong(v.nha, a)} (hiệu số ${a.bt}-${a.bb}).` : `${dong(v.khach, b!)} (hiệu số ${b!.bt}-${b!.bb}).`;
  const cach = Math.abs(a.hang - b.hang);
  const [tren, duoi, tenTren, tenDuoi] = a.hang <= b.hang ? [a, b, v.nha, v.khach] : [b, a, v.khach, v.nha];
  const mo =
    cach >= 8
      ? `Hai đội cách nhau khá xa trên bảng xếp hạng: ${dong(tenTren, tren)}, trong khi ${tenDuoi} xếp thứ ${duoi.hang} với ${duoi.diem} điểm.`
      : cach <= 2
        ? `Hai đội đứng sát nhau trên bảng xếp hạng: ${v.nha} thứ ${a.hang} (${a.diem} điểm), ${v.khach} thứ ${b.hang} (${b.diem} điểm)${a.diem === b.diem ? ", bằng điểm nhau" : ""}, nên đây là trận tranh điểm trực tiếp.`
        : `${dong(v.nha, a)}, còn ${v.khach} xếp thứ ${b.hang} với ${b.diem} điểm sau ${b.tran} trận.`;
  const hieuSo = `Hiệu số bàn thắng bại là ${a.bt}-${a.bb} cho ${v.nha} và ${b.bt}-${b.bb} cho ${v.khach}.`;
  const it = Math.min(a.tran, b.tran);
  return [mo, hieuSo, it <= 5 ? `Bảng mới qua ${it} trận nên thứ hạng chưa phản ánh hết thực lực.` : null].filter(Boolean).join(" ");
}

function doanDoiDau(v: DauVaoNhanDinh): string | null {
  const s = soDoiDau(v.so?.h2h, v.nhaGoc);
  if (!s) return null;
  const m = s.moi;
  const [nhaLanDo, khachLanDo] = tenSo(m.nha) === tenSo(v.nhaGoc) ? [v.nha, v.khach] : [v.khach, v.nha];
  const kqMoi = m.tsn === m.tsk ? `hai đội hòa ${m.tsn}-${m.tsk} trên sân của ${nhaLanDo}` : m.tsn > m.tsk ? `${nhaLanDo} thắng ${khachLanDo} ${m.tsn}-${m.tsk} trên sân nhà` : `${khachLanDo} thắng ${m.tsk}-${m.tsn} ngay trên sân của ${nhaLanDo}`;
  if (s.lan === 1) return `Trong dữ liệu chỉ có một lần hai đội gặp nhau: mùa ${m.mua}, ${kqMoi}.`;
  const pham = s.cungSan ? `${s.lan} lần ${v.nha} tiếp ${v.khach} gần nhất` : `${s.lan} lần gặp gần nhất`;
  const mo =
    s.nhaThang / s.lan >= 0.6
      ? `${v.nha} chiếm ưu thế rõ trong lịch sử đối đầu: ${pham}, họ thắng ${s.nhaThang}, hòa ${s.hoa}, thua ${s.khachThang}.`
      : s.khachThang / s.lan >= 0.6
        ? `${v.khach} lại là đội hay thắng ở cặp đấu này: ${pham}, họ thắng ${s.khachThang}, hòa ${s.hoa}, thua ${s.nhaThang}.`
        : s.hoa / s.lan >= 0.5
          ? `Cặp đấu này hay kết thúc với tỷ số hòa: trong ${pham}, hai đội hòa ${s.hoa}, ${v.nha} thắng ${s.nhaThang}, ${v.khach} thắng ${s.khachThang}.`
          : `Thành tích đối đầu khá cân bằng: ${pham}, ${v.nha} thắng ${s.nhaThang}, hòa ${s.hoa}, ${v.khach} thắng ${s.khachThang}.`;
  const tb = s.tbBan.toFixed(1);
  const ban = s.tbBan >= 3 ? `Các trận này thường nhiều bàn, trung bình ${tb} bàn mỗi trận.` : s.tbBan <= 2 ? `Các trận này ít bàn, trung bình chỉ ${tb} bàn mỗi trận.` : `Trung bình mỗi trận có ${tb} bàn.`;
  return `${mo} ${ban} Lần gần nhất, mùa ${m.mua}, ${kqMoi}.`;
}

/** Tỷ lệ của đúng tỷ số dự đoán (tệp ghi tip tỷ số khác thì không dùng). */
function tyLeTySoDu(v: DauVaoNhanDinh): number | null {
  const so = v.pCs?.tip.match(/(\d+)\s*-\s*(\d+)/);
  const tl = v.pCs?.keo[0];
  return v.du && so && Number(so[1]) === v.du[0] && Number(so[2]) === v.du[1] && tl && tl > 1 ? tl : null;
}

const haiTyLe = (k: ThiTruongPhu | undefined) => (k && k.keo.length === 2 && k.keo.every((x) => x > 1) ? k.keo : null);

function doanBanThang(v: DauVaoNhanDinh, n: SoDoi | null, k: SoDoi | null): string | null {
  if (!n || !k || (!v.taiXiu && v.haiDoiGhi === null)) return null;
  const cau: string[] = [];
  if (v.taiXiu) {
    const moc = v.taiXiu.match(/\d+(\.\d+)?/)?.[0] ?? "2.5";
    const phan = (n.nhieuBan + k.nhieuBan) / (n.tran + k.tran);
    const over = /^over/i.test(v.taiXiu);
    cau.push(`${n.nhieuBan}/${n.tran} trận gần nhất của ${v.nha} có từ 3 bàn trở lên, con số này ở ${v.khach} là ${k.nhieuBan}/${k.tran}.`);
    cau.push(
      over
        ? phan >= 0.5
          ? `Cả hai đều hay đá những trận nhiều bàn, vì vậy dự đoán là ${v.taiXiu}.`
          : phan < 0.4
            ? `Số trận nhiều bàn không cao, nên lựa chọn ${v.taiXiu} ở đây rủi ro hơn bình thường.`
            : `Số liệu chỉ nghiêng nhẹ về phía nhiều bàn, dự đoán chọn ${v.taiXiu}.`
        : phan <= 0.4
          ? `Phần lớn các trận của hai đội dừng ở 2 bàn trở xuống, dự đoán vì thế là ${v.taiXiu}.`
          : phan >= 0.6
            ? `Dù hai đội hay đá nhiều bàn, dự đoán vẫn chọn ${v.taiXiu}, một lựa chọn đi ngược số liệu gần đây.`
            : `Số liệu không nghiêng hẳn về bên nào, dự đoán chọn ${v.taiXiu}.`,
    );
    const tl = haiTyLe(v.pOu);
    if (tl) cau.push(`Tỷ lệ ${v.daDa ? "trước trận" : "hiện tại"}: Over ${moc} là ${T(tl[0])}, Under ${moc} là ${T(tl[1])}.`);
  }
  if (v.haiDoiGhi !== null) {
    cau.push(`Cả hai đội cùng ghi bàn ở ${n.cungGhi}/${n.tran} trận gần nhất của ${v.nha} và ${k.cungGhi}/${k.tran} trận của ${v.khach}.`);
    const tl = haiTyLe(v.pBtts);
    const kem = tl ? ` (tỷ lệ ${T(v.haiDoiGhi ? tl[0] : tl[1])})` : "";
    cau.push(v.haiDoiGhi ? `Dự đoán: có, cả hai đội đều ghi bàn${kem}.` : `Dự đoán: không, ít nhất một đội không ghi bàn${kem}.`);
  }
  return cau.join(" ");
}

function lyDo(v: DauVaoNhanDinh, n: SoDoi | null, k: SoDoi | null, chieu: number): string | null {
  if (!n || !k) return null;
  const so = `${v.nha} giành ${n.diem}/${n.tran * 3} điểm trong ${n.tran} trận gần nhất, ${v.khach} giành ${k.diem}/${k.tran * 3}`;
  const lech = n.diem / n.tran - k.diem / k.tran;
  if (chieu === 0) {
    if (lech >= 0.5) return `${so}: chủ nhà có phong độ tốt hơn hẳn và còn được đá sân nhà.`;
    if (lech <= -0.5) return `${so}. Phong độ của đội khách nhỉnh hơn, nhưng lợi thế sân nhà khiến dự đoán vẫn nghiêng về ${v.nha}.`;
    return `${so}. Phong độ hai đội không chênh nhiều, lợi thế sân nhà là điểm khác biệt.`;
  }
  if (chieu === 2) {
    if (lech <= -0.5) return `${so}: đội khách đang chơi tốt hơn rõ, đủ để thắng dù phải đá xa nhà.`;
    if (lech >= 0.5) return `${so}. Xét phong độ thì chủ nhà nhỉnh hơn, nên dự đoán ${v.khach} thắng là lựa chọn mạo hiểm.`;
    return `${so}. Hai đội có phong độ ngang nhau, dự đoán nghiêng nhẹ về ${v.khach}.`;
  }
  if (Math.abs(lech) < 0.5) return `${so}. Phong độ tương đương nên một trận hòa là kết quả hợp lý.`;
  return `${so}. Dù ${lech > 0 ? v.nha : v.khach} có phong độ tốt hơn, dự đoán là hai đội chia điểm.`;
}

function doanChot(v: DauVaoNhanDinh, n: SoDoi | null, k: SoDoi | null): string | null {
  const thang = cauThang(v);
  if (!v.du || !thang) return null;
  const chieu = v.du[0] > v.du[1] ? 0 : v.du[0] === v.du[1] ? 1 : 2;
  const cau: (string | null)[] = [
    chon([`Dự đoán của banhbong: ${thang}.`, `Chốt lại, banhbong dự đoán ${thang}.`, `Tỷ số dự đoán cho trận này: ${thang}.`], `${v.slug}-chot`),
    lyDo(v, n, k, chieu),
  ];
  const xs = xacSuat1X2(v.mot);
  if (v.mot && xs) {
    const cua = [`${v.nha} thắng`, "hòa", `${v.khach} thắng`];
    const thap = v.mot.indexOf(Math.min(...v.mot));
    // Dãy số 1·X·2 đã nêu ở đoạn mở trang (cauTomTat) → ở đây chỉ quy ra phần trăm, không nhắc lại số.
    cau.push(`Quy từ tỷ lệ 1·X·2 ${v.daDa ? "trước trận" : "hiện tại"}, khả năng là khoảng ${xs[0]}% ${v.nha} thắng, ${xs[1]}% hòa, ${xs[2]}% ${v.khach} thắng.`);
    cau.push(thap === chieu ? "Dự đoán trùng với cửa có tỷ lệ thấp nhất." : `Dự đoán không trùng với cửa có tỷ lệ thấp nhất (${cua[thap]}), nên rủi ro cao hơn.`);
  }
  const tyLeTySo = tyLeTySoDu(v);
  if (tyLeTySo) cau.push(`Tỷ số ${v.du[0]}-${v.du[1]} ${v.daDa ? "trước trận có" : "đang có"} tỷ lệ ${T(tyLeTySo)}.`);
  const ds = docHtft(v.htft);
  const khoa = v.htft ? cuaNoiNhat(v.htft) : null;
  if (ds && khoa) cau.push(`Ở cửa Hiệp 1 / Cả trận, tỷ lệ thấp nhất${v.daDa ? " trước trận" : ""} là "${nhanCua(khoa, v.nha, v.khach)}" (${T(ds[KHOA_HTFT.indexOf(khoa)])}).`);
  return cau.filter(Boolean).join(" ");
}

/** Các đoạn của bài nhận định; đoạn nào thiếu số thì không có trong danh sách. */
export function nhanDinhTran(v: DauVaoNhanDinh, tenDoi: (goc: string) => string): MucNhanDinh[] {
  const n = soDoi(v.so?.gn, v.nhaGoc, "nha");
  const k = soDoi(v.so?.gk, v.khachGoc, "khach");
  const dn = n ? doanDoi(v.nha, n, "nha", tenDoi, `${v.slug}-n`) : null;
  const dk = k ? doanDoi(v.khach, k, "khach", tenDoi, `${v.slug}-k`, dn?.mau) : null;
  const muc: [string, string | null][] = [
    ["Vị trí trên bảng xếp hạng", doanBangXep(v)],
    [`Phong độ ${v.nha}`, dn?.doan ?? null],
    [`Phong độ ${v.khach}`, dk?.doan ?? null],
    [`Lịch sử đối đầu ${v.nha} vs ${v.khach}`, doanDoiDau(v)],
    ["Over/Under và khả năng hai đội cùng ghi bàn", doanBanThang(v, n, k)],
    [`Dự đoán tỷ số ${v.nha} vs ${v.khach}`, doanChot(v, n, k)],
  ];
  return muc.flatMap(([tieuDe, doan]) => (doan ? [{ tieuDe, doan }] : []));
}
