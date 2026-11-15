// Nạp vòng KẾ của các giải lớn (PredictZ, qua ~/.claude/tools/banhbong_predictz/giai_tiep.py) vào data/du-doan-tuan.json,
// để trang tip theo giải không trống lúc nghỉ FIFA. Chạy: node apps/web/scripts/nap-giai-tiep.mjs <out/giai-tiep-YYYY-MM-DD.json>
// Ghép theo ngay + nha + khach: trận chưa có thì thêm (bỏ trường `link`); trận đã có thì giữ nguyên, chỉ ĐIỀN
// các khối số liệu còn thiếu (đối đầu, BXH, HT/FT, điểm form, tỷ lệ phụ, 10 trận gần nhất). Chỉ in số đếm.
import fs from "node:fs";
import path from "node:path";

const vao = process.argv[2];
if (!vao) {
  process.stderr.write("thieu duong dan tep giai-tiep json\n");
  process.exit(1);
}
const RA = path.join(path.dirname(new URL(import.meta.url).pathname), "../data/du-doan-tuan.json");
const nguon = JSON.parse(fs.readFileSync(vao, "utf8"));
const hang = JSON.parse(fs.readFileSync(RA, "utf8"));
const khoa = (d) => `${d.ngay}|${d.nha}|${d.khach}`;
const co = new Map(hang.map((d) => [khoa(d), d]));
const DIEN = ["h2h", "bxn", "bxk", "htft", "diem", "pDnb", "pKqBtts", "pKqOu", "gn", "gk"];
const coGiaTri = (v) => (Array.isArray(v) ? v.length > 0 : v != null && typeof v === "object" && Object.keys(v).length > 0);
let them = 0;
let dien = 0;
for (const { link, ...d } of Array.isArray(nguon) ? nguon : nguon.tran ?? []) {
  if (!d.ngay || !d.nha || !d.khach || !d.gioUtc) continue;
  const cu = co.get(khoa(d));
  if (cu) {
    // Dòng gõ tay (`bai`) hoặc trận đã có kết quả: không đụng.
    if (cu.bai || cu.kq) continue;
    const thieu = DIEN.filter((k) => !coGiaTri(cu[k]) && coGiaTri(d[k]));
    for (const k of thieu) cu[k] = d[k];
    if (thieu.length) dien += 1;
    continue;
  }
  hang.push(d);
  co.set(khoa(d), d);
  them += 1;
}
if (them > 0 || dien > 0) fs.writeFileSync(RA, `[\n${hang.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);
process.stdout.write(`nap-giai-tiep: them ${them} tran, dien so lieu ${dien} tran (nguon ${Array.isArray(nguon) ? nguon.length : "?"})\n`);
