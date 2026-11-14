// Nạp vòng KẾ của các giải lớn (PredictZ, qua ~/.claude/tools/banhbong_predictz/giai_tiep.py) vào data/du-doan-tuan.json,
// để trang tip theo giải không trống lúc nghỉ FIFA. Chạy: node apps/web/scripts/nap-giai-tiep.mjs <out/giai-tiep-YYYY-MM-DD.json>
// Ghép theo ngay + nha + khach: trận đã có trong tệp thì GIỮ NGUYÊN, chưa có thì thêm (bỏ trường `link`). Chỉ in số đếm.
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
const co = new Set(hang.map(khoa));
let them = 0;
for (const { link, ...d } of Array.isArray(nguon) ? nguon : nguon.tran ?? []) {
  if (!d.ngay || !d.nha || !d.khach || !d.gioUtc || co.has(khoa(d))) continue;
  hang.push(d);
  co.add(khoa(d));
  them += 1;
}
if (them > 0) fs.writeFileSync(RA, `[\n${hang.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);
process.stdout.write(`nap-giai-tiep: them ${them} tran (nguon ${Array.isArray(nguon) ? nguon.length : "?"})\n`);
