// Bù số liệu trận + link highlight cho kho trận đã đá (data/du-doan-luu-tru.json) từ FotMob (Peter 15/11/2026).
// Chạy: node apps/web/scripts/nap-highlight.mjs   (gọi sau nap-predictz.mjs trong nap_repo.sh)
// - Nguồn: FotMob matchDetails → content.matchFacts.highlights (video YouTube kênh chính thức của giải / CLB,
//   kiểm 15/11: 43/47 trận 5 giải lớn + C1 tuần 4–8/11 có link, cả 42 xem được từ IP Việt Nam) và
//   content.stats (kiểm soát bóng, xG, sút…). API nội bộ không công bố của FotMob: mỗi trận 1-2 lượt, nghỉ giữa lượt.
// - Chỉ xét trận đá xong >= 2 giờ và trong 4 ngày gần nhất chưa có highlight; quá 4 ngày thì thôi tìm.
// - Tên kênh: YouTube oEmbed author_name; video tắt nhúng (oEmbed 401) thì ghi "YouTube".
// - Chỉ nhận link youtube.com. Lỗi mạng / không khớp trận thì bỏ qua trận đó, không chặn luồng. Chỉ in số đếm.
import fs from "node:fs";
import path from "node:path";

const LT = path.join(path.dirname(new URL(import.meta.url).pathname), "../data/du-doan-luu-tru.json");
const in1 = (s) => process.stdout.write(`${s}\n`);
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" };
const nghi = (ms) => new Promise((r) => setTimeout(r, ms));
const lay = async (u) => {
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }).catch(() => null);
  return r?.ok ? r.json().catch(() => null) : null;
};

// FotMob: 47 Premier League, 87 LaLiga, 55 Serie A, 54 Bundesliga, 53 Ligue 1, 42 Champions League.
const GIAI_FM = { "England Premier League": 47, "Spain La Liga": 87, "Italy Serie A": 55, "Germany Bundesliga": 54, "France Ligue 1": 53, "UEFA Champions League": 42 };
const SO = { BallPossesion: "pos", expected_goals: "xg", total_shots: "sh", ShotsOnTarget: "st", big_chance: "bc", corners: "co", yellow_cards: "yc" };

const chuan = (s) =>
  (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|afc|cd|ud|sd|club|de|the|hove|albion|united|utd|city)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
const giong = (a, b) => {
  const x = chuan(a);
  const y = chuan(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};
const ngayFm = (iso) => iso.slice(0, 10).replace(/-/g, "");

const kho = JSON.parse(fs.readFileSync(LT, "utf8"));
const bayGio = Date.now();
const can = kho.filter((t) => {
  const ko = Date.parse(t.gioUtc ?? `${t.ngay}T12:00:00Z`);
  return GIAI_FM[t.giai] && !t.hl && bayGio - ko > 2 * 3600e3 && bayGio - ko < 4 * 864e5;
});

const dsNgay = new Map();
async function tranNgay(ngay) {
  if (!dsNgay.has(ngay)) {
    dsNgay.set(ngay, (await lay(`https://www.fotmob.com/api/data/matches?date=${ngay}`))?.leagues ?? []);
    await nghi(1500);
  }
  return dsNgay.get(ngay);
}

async function timFm(t) {
  if (t.fm) return t.fm;
  const ko = t.gioUtc ?? `${t.ngay}T12:00:00Z`;
  for (const ngay of new Set([ngayFm(ko), ngayFm(new Date(Date.parse(ko) - 864e5).toISOString()), ngayFm(new Date(Date.parse(ko) + 864e5).toISOString())])) {
    const leagues = (await tranNgay(ngay)).filter((l) => l.primaryId === GIAI_FM[t.giai]);
    const m = leagues.flatMap((l) => l.matches ?? []).find((x) => giong(x.home?.name, t.nha) && giong(x.away?.name, t.khach));
    if (m) return m.id;
  }
  return null;
}

async function tenKenh(url) {
  const o = await lay(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
  return typeof o?.author_name === "string" && o.author_name ? o.author_name : "YouTube";
}

let soHl = 0;
let soSo = 0;
let khongKhop = 0;
for (const t of can) {
  const fm = await timFm(t);
  if (!fm) {
    khongKhop++;
    continue;
  }
  t.fm = fm;
  const md = await lay(`https://www.fotmob.com/api/data/matchDetails?matchId=${fm}`);
  await nghi(1500);
  if (!md?.content) continue;
  if (!t.so) {
    const so = {};
    for (const nhom of md.content.stats?.Periods?.All?.stats ?? []) {
      for (const s of nhom.stats ?? []) {
        const k = SO[s.key];
        const v = (s.stats ?? []).map((x) => Number.parseFloat(String(x)));
        if (k && !so[k] && v.length === 2 && v.every(Number.isFinite)) so[k] = v;
      }
    }
    if (Object.keys(so).length > 0) {
      t.so = so;
      soSo++;
    }
  }
  const url = md.content.matchFacts?.highlights?.url;
  if (typeof url === "string" && /^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+$/.test(url)) {
    t.hl = { url, nguon: await tenKenh(url) };
    soHl++;
  }
}

fs.writeFileSync(LT, `[\n${kho.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);
in1(`highlight: xet ${can.length} tran | them highlight ${soHl} | them so lieu ${soSo} | khong khop FotMob ${khongKhop}`);
