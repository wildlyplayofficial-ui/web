/**
 * Vẽ "hình lịch thi đấu" 1200x675 cho 5 trang lịch 2027 từ chính tệp dữ kiện của trang.
 * Chạy lại mỗi khi sửa ngày trong apps/web/lib/{asian-cup,chung-ket-c1,world-cup-nu,sea-games,lich-thi-dau-bong-da}-2027.ts:
 *   node apps/web/scripts/ve-hinh-lich-2027.mjs            (chạy từ gốc repo)
 * Ra apps/web/public/lich-2027/<slug>.webp. Cần Chromium của Playwright:
 *   CHROMIUM_PATH=/đường/dẫn/chrome-headless-shell (mặc định: bản trong ~/Library/Caches/ms-playwright).
 * Dựng từ HTML (không dùng ảnh AI) nên chữ tiếng Việt luôn đúng dấu. Có kiểm tràn khung: phần tử nào
 * lòi ra ngoài 1200x675 thì script dừng với mã lỗi.
 */
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(WEB, "package.json"));
const ts = require("typescript");
const sharp = require("sharp");
const { chromium } = createRequire(join(WEB, "..", "..", "package.json"))("playwright");

const W = 1200;
const H = 675;
const OUT = join(WEB, "public", "lich-2027");

/** Biên dịch các tệp .ts trong lib/ sang .mjs tạm, đổi "@/lib/x" thành đường tương đối, rồi import. */
async function napDuLieu() {
  const tmp = mkdtempSync(join(tmpdir(), "lich2027-"));
  const lib = join(WEB, "lib");
  for (const f of readdirSync(lib).filter((n) => /2027\.ts$/.test(n) || n === "lich-2027-kieu.ts")) {
    const js = ts.transpileModule(readFileSync(join(lib, f), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "@\/lib\/([^"]+)"/g, 'from "./$1.mjs"');
    writeFileSync(join(tmp, f.replace(/\.ts$/, ".mjs")), js);
  }
  const nap = (ten) => import(pathToFileURL(join(tmp, `${ten}.mjs`)).href);
  return {
    tmp,
    asian: await nap("asian-cup-2027"),
    c1: await nap("chung-ket-c1-2027"),
    wc: await nap("world-cup-nu-2027"),
    sea: await nap("sea-games-2027"),
    hub: await nap("lich-thi-dau-bong-da-2027"),
  };
}

const bang = (d) => d.DU_LIEU.khoi[0].bang.hang;

/** Mỗi hình: tiêu đề, dòng phụ vàng, các hàng bảng [nhãn, giá trị, (cột 3)], dải ghi chú dưới bảng. */
function cacHinh(m) {
  const bangE = m.asian.BANG_DAU.find((b) => b.bang === "E").doi;
  return [
    {
      slug: "lich-thi-dau-asian-cup-2027",
      tieuDe: "Lịch thi đấu Asian Cup 2027",
      phu: "Saudi Arabia · 23/12/2027 – 21/1/2028",
      hang: m.asian.MOC_LICH.map((x) => [x.moc, x.lichMoi]),
      dai: `Việt Nam ở bảng E: ${bangE.join(" · ")}`,
      capNhat: m.asian.CAP_NHAT,
    },
    {
      slug: "chung-ket-c1-2027",
      tieuDe: "Chung kết C1 2027",
      phu: m.c1.DU_LIEU.ogPhu,
      hang: bang(m.c1),
      dai: "Chung kết Champions League mùa 2026/27",
      capNhat: m.c1.CAP_NHAT,
    },
    {
      slug: "world-cup-nu-2027",
      tieuDe: "World Cup nữ 2027",
      phu: m.wc.DU_LIEU.ogPhu,
      hang: bang(m.wc),
      dai: "Việt Nam không có vé dự vòng chung kết",
      capNhat: m.wc.CAP_NHAT,
    },
    {
      slug: "sea-games-2027",
      tieuDe: "SEA Games 2027",
      phu: m.sea.DU_LIEU.ogPhu,
      hang: bang(m.sea),
      dai: "SEA Games 34 · bóng đá thi đấu ở Johor",
      capNhat: m.sea.CAP_NHAT,
    },
    {
      slug: "lich-thi-dau-bong-da-2027",
      tieuDe: "Lịch thi đấu bóng đá 2027",
      phu: "Các giải lớn theo thứ tự thời gian",
      hang: bang(m.hub),
      dai: null,
      capNhat: m.hub.CAP_NHAT,
    },
  ];
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(h, fontDir, markUrl) {
  const nCot = Math.max(...h.hang.map((r) => r.length));
  const co = nCot === 3 ? 26 : h.hang.length > 5 ? 29 : 31;
  const rows = h.hang
    .map(
      (r) =>
        `<tr>${r
          .map((c, i) => {
            const cls = c === "Chưa công bố" ? "cb" : i === 0 && nCot === 2 ? "nhan" : i === 0 ? "ngay" : "";
            return `<td class="${cls}">${esc(c)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:SG;font-weight:500;src:url("${fontDir}/SpaceGrotesk-Medium.ttf")}
@font-face{font-family:SG;font-weight:700;src:url("${fontDir}/SpaceGrotesk-Bold.ttf")}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:SG,sans-serif;color:#fff;
 background:linear-gradient(135deg,#00c853 0%,#0b4a2d 78%);position:relative}
.glow{position:absolute;right:-160px;top:-200px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(255,224,132,.22),transparent 70%)}
.wrap{position:absolute;inset:0;padding:30px 56px 26px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:12px;font-size:28px;font-weight:700;letter-spacing:.2px}
.logo img{width:44px;height:44px}
.logo i{font-style:normal;color:#ffe084}
.tag{font-size:22px;font-weight:700;color:#0b4a2d;background:#ffe084;border-radius:999px;padding:7px 20px}
h1{margin-top:14px;font-size:60px;line-height:1.05;font-weight:700;letter-spacing:-.5px}
.phu{margin-top:6px;font-size:30px;font-weight:700;color:#ffe084}
table{margin-top:14px;width:100%;border-collapse:separate;border-spacing:0 6px;table-layout:auto}
td{background:rgba(5,40,24,.5);padding:0 22px;height:${h.hang.length > 5 ? 46 : 54}px;font-size:${co}px;font-weight:500;line-height:1.15;vertical-align:middle}
td:first-child{border-radius:12px 0 0 12px}td:last-child{border-radius:0 12px 12px 0}
td.nhan{font-weight:700;width:40%}
td.ngay{font-weight:700;color:#ffe084;white-space:nowrap}
td.cb{color:#b9e8cf;font-style:italic}
.dai{margin-top:6px;font-size:26px;font-weight:700;background:rgba(255,224,132,.16);border:2px solid rgba(255,224,132,.55);color:#ffe084;border-radius:14px;padding:8px 22px}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:22px;font-weight:500;color:#d6f5e4;padding-top:8px}
.foot b{color:#fff}
</style></head><body><div class="glow"></div><div class="wrap">
<div class="top"><div class="logo"><img src="${markUrl}" alt=""><span>banhbong<i>.net</i></span></div><div class="tag">Lịch thi đấu 2027</div></div>
<h1>${esc(h.tieuDe)}</h1><div class="phu">${esc(h.phu)}</div>
<table>${rows}</table>
${h.dai ? `<div class="dai">${esc(h.dai)}</div>` : ""}
<div class="foot"><span>Cập nhật ${esc(h.capNhat)}</span><b>banhbong.net</b></div>
</div></body></html>`;
}

const m = await napDuLieu();
mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROMIUM_PATH ||
  join(homedir(), "Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const fontDir = pathToFileURL(join(WEB, "app/api/og/_assets")).href;
const markUrl = pathToFileURL(join(WEB, "public/brand/bb-mark-white.png")).href;
let loi = 0;
for (const h of cacHinh(m)) {
  const file = join(m.tmp, `${h.slug}.html`);
  writeFileSync(file, html(h, fontDir, markUrl));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  const tran = await page.evaluate(
    ([w, hh]) =>
      [...document.querySelectorAll(".wrap *")].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.right > w - 40 || r.bottom > hh - 20 || r.left < 40 || r.top < 0 || (e.scrollWidth > e.clientWidth + 1 && e.tagName === "TD");
      }).map((e) => `${e.tagName}.${e.className}: ${e.textContent.slice(0, 40)}`),
    [W, H],
  );
  if (tran.length) {
    loi++;
    console.error(`TRÀN ${h.slug}:`, tran);
  }
  const png = await page.screenshot({ type: "png" });
  const webp = await sharp(png).webp({ quality: 88 }).toBuffer();
  writeFileSync(join(OUT, `${h.slug}.webp`), webp);
  console.log(`${h.slug}.webp ${(webp.length / 1024).toFixed(1)} KB`);
}
await browser.close();
if (loi) process.exit(1);
