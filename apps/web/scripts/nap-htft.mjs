// Nạp Hiệp 1 / Cả trận (htft) + điểm tấn công / phòng ngự (diem) vào data/du-doan-tuan.json.
// Nguồn: tệp ngày của ~/.claude/tools/banhbong_predictz/keo.py (out/YYYY-MM-DD.json, mảng `predictz`).
// Chạy: node apps/web/scripts/nap-htft.mjs <out/YYYY-MM-DD.json>
// Ghép theo ngay + nha + khach (tên gốc PredictZ). Chỉ GHI khi nguồn có đủ 9 tỷ lệ / đủ 2 cặp điểm 1–10 (thang PredictZ);
// trận thiếu thì để nguyên (giữ giá trị cũ nếu có). Chỉ in số đếm.
import fs from "node:fs";
import path from "node:path";

const vao = process.argv[2];
if (!vao) {
  process.stderr.write("thieu duong dan tep out json cua keo.py\n");
  process.exit(1);
}
const RA = path.join(path.dirname(new URL(import.meta.url).pathname), "../data/du-doan-tuan.json");
const nguon = JSON.parse(fs.readFileSync(vao, "utf8")).predictz ?? [];
const hang = JSON.parse(fs.readFileSync(RA, "utf8"));

const KHOA = ["HH", "HD", "HA", "DH", "DD", "DA", "AH", "AD", "AA"];
const htftOk = (h) => h && KHOA.every((k) => Number.isFinite(h[k]) && h[k] > 1);
const cap = (d) => Array.isArray(d) && d.length === 2 && d.every((x) => Number.isInteger(x) && x >= 1 && x <= 10);
const diemOk = (d) => d && cap(d.n) && cap(d.k);
const khoa = (ngay, nha, khach) => `${ngay}|${nha}|${khach}`;
const pz = new Map(nguon.map((p) => [khoa(p.ngay, p.nha, p.khach), p]));

// Tỷ lệ làm mới mỗi sáng: CHỈ trận chưa đá (chưa có kq, giờ bắt đầu cả 2 nguồn còn ở tương lai); trận đã đá không đụng.
const bay_gio = Date.now();
const chuaDa = (d, p) =>
  !d.kq && [d.gioUtc, p.bat_dau].every((g) => !g || Date.parse(g) > bay_gio) && [d.gioUtc, p.bat_dau].some(Boolean);
const so = (x) => Number.isFinite(x) && x > 1;
const mang = (a, n) => Array.isArray(a) && a.length === n && a.every(so);
const dict = (o, ks) => (o && ks.every((k) => so(o[k])) ? Object.fromEntries(ks.map((k) => [k, o[k]])) : null);
let moiKeo = 0;
const oCapNhat = (() => {
  const t = Date.parse(JSON.parse(fs.readFileSync(vao, "utf8")).chay_luc ?? "");
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
})();
function lamMoiKeo(d, p) {
  if (!chuaDa(d, p)) return;
  let dem = 0;
  const o1 = (p.ty_le_moi ?? []).map(Number);
  if (mang(o1, 3)) (d.o = o1), dem++;
  if (d.pBtts && mang(p.btts_keo, 2)) (d.pBtts = { ...d.pBtts, keo: p.btts_keo }), dem++;
  if (d.pOu && mang(p.ou_keo, 2)) (d.pOu = { ...d.pOu, keo: p.ou_keo }), dem++;
  if (mang(p.dnb, 2)) (d.pDnb = p.dnb), dem++;
  const kb = dict(p.kq_btts, ["nY", "nN", "kY", "kN", "hY", "hN"]);
  if (kb) (d.pKqBtts = kb), dem++;
  const ko = dict(p.kq_ou, ["nT", "nX", "kT", "kX", "hT", "hX"]);
  if (ko) (d.pKqOu = ko), dem++;
  if (dem) {
    moiKeo++;
    if (oCapNhat) d.oCapNhat = oCapNhat;
  }
}

let ghepHt = 0;
let ghepDiem = 0;
for (const d of hang) {
  const p = pz.get(khoa(d.ngay, d.nha, d.khach));
  if (!p) continue;
  if (htftOk(p.htft)) {
    d.htft = Object.fromEntries(KHOA.map((k) => [k, p.htft[k]]));
    ghepHt++;
  }
  if (diemOk(p.diem)) {
    d.diem = { n: p.diem.n, k: p.diem.k, loai: p.diem.loai === "san" ? "san" : "chung" };
    if (cap(p.diem.c)) d.diem.c = p.diem.c; // Overall Form [nhà, khách]
    ghepDiem++;
  }
  lamMoiKeo(d, p);
}
fs.writeFileSync(RA, `[\n${hang.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);
const in1 = (s) => process.stdout.write(`${s}\n`);
in1(`dong tep: ${hang.length} | nguon: ${nguon.length} | ghep htft: ${ghepHt} | ghep diem: ${ghepDiem} | lam moi keo: ${moiKeo} tran`);
in1(`tong co htft: ${hang.filter((d) => d.htft).length} | tong co diem: ${hang.filter((d) => d.diem).length}`);
