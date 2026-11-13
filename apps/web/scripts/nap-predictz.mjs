// Nạp tệp PredictZ hằng ngày (Jane gửi 8h sáng vào nhóm) → data/du-doan-tuan.json.
// Chạy: railway run --service wildlyplay-worker node apps/web/scripts/nap-predictz.mjs <predictz.json>
// - Ngày >= ngay_lay: thay bằng tệp mới. Ngày cũ hơn: giữ lại tối đa 7 ngày (để nút "Hôm qua" còn dữ liệu).
// - Giờ đá: giữ giờ đã ghép; trận mới ghép lịch livescore (khoá lấy từ env, KHÔNG in khoá).
// - Kết quả hôm qua: gắn kq [bàn nhà, bàn khách] theo khoá ngay + nha + khach (tên gốc PredictZ).
// Chỉ in số đếm.
import fs from "node:fs";
import path from "node:path";

const vao = process.argv[2];
if (!vao) {
  process.stderr.write("thieu duong dan tep json\n");
  process.exit(1);
}
const RA = path.join(path.dirname(new URL(import.meta.url).pathname), "../data/du-doan-tuan.json");
const moi = JSON.parse(fs.readFileSync(vao, "utf8"));
const cu = JSON.parse(fs.readFileSync(RA, "utf8"));
const in1 = (s) => process.stdout.write(`${s}\n`);

const khoa = (ngay, nha, khach) => `${ngay}|${nha}|${khach}`;
const cong = (ngay, n) => new Date(Date.parse(`${ngay}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const gioCu = new Map(cu.map((d) => [khoa(d.ngay, d.nha, d.khach), d.gioUtc]));

const SO_LIEU = ["h2h", "bxn", "bxk", "gn", "gk"];
const PHU = [["btts", "pBtts"], ["ou", "pOu"], ["cs", "pCs"]];
// Tệp ghi [] hoặc {} cho trận không có số liệu (đội tuyển) → bỏ, đừng đếm là có.
const coGiaTri = (v) => (Array.isArray(v) ? v.length > 0 : v != null && Object.keys(v).length > 0);
const dong = (t) => ({
  ngay: t.ngay,
  giai: t.giai,
  nha: t.nha,
  khach: t.khach,
  du: t.tip,
  fn: t.f_nha ?? "",
  fk: t.f_khach ?? "",
  o: Array.isArray(t.keo) ? t.keo : [],
  gioUtc: gioCu.get(khoa(t.ngay, t.nha, t.khach)) ?? null,
  btts: t.btts?.tip ? (/yes/i.test(t.btts.tip) ? "Có" : "Không") : undefined,
  tx: t.ou?.tip ? (/over/i.test(t.ou.tip) ? "Tài 2.5" : "Xỉu 2.5") : undefined,
  // Khối phụ trang trận: tip + tỷ lệ + chuỗi 5 trận (h5/a5). cs chỉ ~1/10 trận có.
  ...Object.fromEntries(PHU.filter(([k]) => t[k]?.tip).map(([k, ra]) => [ra, { tip: t[k].tip, keo: Array.isArray(t[k].keo) ? t[k].keo : [], h5: t[k].h5 ?? "", a5: t[k].a5 ?? "" }])),
  // Số liệu trang trận (đối đầu, bảng xếp hạng, 10 trận gần nhất): có thì giữ nguyên.
  ...Object.fromEntries(SO_LIEU.filter((k) => coGiaTri(t[k])).map((k) => [k, t[k]])),
});

const tuNgay = moi.ngay_lay;
// Dòng gõ tay cho trận có bài nhận định (trường `bai`, vd ĐTQG nguồn không có) giữ qua lần nạp lại cùng ngày.
const giu = cu.filter((d) => (d.ngay < tuNgay || d.bai) && d.ngay >= cong(tuNgay, -7));
const hang = [...giu, ...moi.tran.map(dong)];

// Kết quả hôm qua: [ngày, giờ Anh, giải, nhà, bàn nhà, khách, bàn khách]. Tháng 11 giờ Anh = UTC.
const kq = new Map((moi.ket_qua_hom_qua ?? []).map((r) => [khoa(r[0], r[3], r[5]), r]));
let soKq = 0;
for (const d of hang) {
  const r = kq.get(khoa(d.ngay, d.nha, d.khach));
  if (!r) continue;
  d.kq = [Number(r[4]), Number(r[6])];
  if (!d.gioUtc && /^\d\d:\d\d$/.test(r[1])) d.gioUtc = `${r[0]}T${r[1]}:00Z`;
  soKq++;
}

// Sổ thành tích (số nội bộ, không hiện lên web — Peter 13/11): ghi thêm mọi trận đã có kết quả, KHÔNG bao giờ xoá
// (tệp tuần chỉ giữ 7 ngày). Cùng trận thì dòng mới đè dòng cũ.
const SO = path.join(path.dirname(RA), "thanh-tich.json");
const so0 = fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, "utf8")) : [];
const soMap = new Map(so0.map((d) => [khoa(d.ngay, d.nha, d.khach), d]));
for (const d of hang.filter((x) => x.kq)) {
  soMap.set(khoa(d.ngay, d.nha, d.khach), { ngay: d.ngay, giai: d.giai, nha: d.nha, khach: d.khach, du: d.du, tx: d.tx, btts: d.btts, kq: d.kq });
}
const soMoi = [...soMap.values()].sort((a, b) => a.ngay.localeCompare(b.ngay));
fs.writeFileSync(SO, `[\n${soMoi.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);

// Ghép giờ đá cho trận chưa có giờ.
const LK = process.env.LIVESCORE_API_KEY || "";
const LS = process.env.LIVESCORE_API_SECRET || "";
const so = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|afc|cf|sc|united|utd|city|town|athletic|the)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
const giong = (x, y) => x && y && (x === y || x.includes(y) || y.includes(x));
const tu = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
const chungTu = (x, y) => tu(x).some((w) => tu(y).includes(w));
// Khớp: cả 2 đội giống, hoặc 1 đội giống + đội kia chung 1 từ >= 4 chữ (Congo DR / DR Congo, Rep of Ireland / Republic of Ireland).
const khop = (f, d) => {
  const n = giong(f.h, so(d.nha));
  const k = giong(f.a, so(d.khach));
  return (n && k) || (n && chungTu(f.an, d.khach)) || (k && chungTu(f.hn, d.nha));
};
const thieu = hang.filter((d) => !d.gioUtc);
let ghep = 0;
if (thieu.length > 0 && LK && LS) {
  const fx = [];
  for (const ngay of [...new Set(thieu.map((d) => d.ngay))]) {
    for (let p = 1; p <= 10; p++) {
      const u = `https://livescore-api.com/api-client/fixtures/matches.json?key=${LK}&secret=${LS}&date=${ngay}&page=${p}`;
      const r = await fetch(u, { signal: AbortSignal.timeout(20000) }).catch(() => null);
      if (!r?.ok) {
        in1(`lich ${ngay} trang ${p}: loi ${r?.status ?? "mang"}`);
        break;
      }
      const j = await r.json();
      for (const f of j?.data?.fixtures ?? []) {
        const hn = f.home?.name ?? f.home_name;
        const an = f.away?.name ?? f.away_name;
        fx.push({ d: f.date, t: f.time, hn, an, h: so(hn), a: so(an) });
      }
      if (!j?.data?.next_page) break;
    }
  }
  for (const d of thieu) {
    const f = fx.find((f) => f.d === d.ngay && khop(f, d));
    if (f) {
      d.gioUtc = `${f.d}T${f.t.length === 5 ? `${f.t}:00` : f.t}Z`;
      ghep++;
    }
  }
} else if (thieu.length > 0) {
  in1("khong co khoa lich trong env: bo qua ghep gio (chay qua railway run)");
}

hang.sort((a, b) => (a.gioUtc ?? `${a.ngay}T99`).localeCompare(b.gioUtc ?? `${b.ngay}T99`));
fs.writeFileSync(RA, `[\n${hang.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);
in1(`giu ngay cu: ${giu.length} | tep moi: ${moi.tran.length} | tong: ${hang.length}`);
in1(`co so lieu tran: ${hang.filter((d) => SO_LIEU.some((k) => coGiaTri(d[k]))).length}`);
in1(`so thanh tich: ${soMoi.length} tran`);
in1(`ket qua gan: ${soKq} | gio ghep moi: ${ghep} | con thieu gio: ${hang.filter((d) => !d.gioUtc).length}`);
