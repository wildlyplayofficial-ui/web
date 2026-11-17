// Chốt chặn luật nội dung (Peter): chữ khách nhìn thấy không được có "tài xỉu" (dùng Over/Under);
// "nhà cái" chỉ được ở những chỗ đã có sẵn (đếm khoá cứng, thêm chỗ mới là đỏ).
// Quét chuỗi/JSX text trong mã nguồn + giá trị trong JSON dữ liệu; bỏ qua comment, định danh, tệp test.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
// Dùng chung mẫu với chốt chặn của worker (hàm thuần, không import gì thêm).
import { scrubTaiXiu } from "../../worker/src/vi-lexicon";

const GOC = join(__dirname, "..");
const THU_MUC = ["app", "components", "lib", "data"];
const DUOI_MA = /\.(ts|tsx)$/;
const DUOI_JSON = /\.json$/;

/** Tệp được phép chứa chữ "tài xỉu"/"Tài 2.5"/"Xỉu 2.5" — mỗi dòng một lý do. */
const CHO_PHEP_TAI_XIU: ReadonlyArray<{ tep: string; lyDo: string }> = [
  { tep: "data/du-doan-tuan.json", lyDo: "tệp nạp tự động giữ nhãn cũ Tài/Xỉu; lib/du-doan-tuan.ts (chuanOU) đổi sang Over/Under trước khi hiển thị" },
  { tep: "data/thanh-tich.json", lyDo: "sổ nội bộ do scripts/nap-predictz.mjs ghi, không có trang nào đọc để hiển thị" },
];

/** "nhà cái" hiện có trong chữ hiển thị (số lần theo tệp, chốt ngày viết test). Chờ Peter quyết giữ hay đổi. */
const NHA_CAI_HIEN_CO: Readonly<Record<string, number>> = {
  "app/[lang]/donate/page.tsx": 1, // "không affiliate nhà cái" (phủ định)
  "app/[lang]/keo/page.tsx": 1, // "phần nhà cái giữ lại" (giải thích xác suất thực)
  "components/keo-seo-content.tsx": 1, // H3 "banhbong.net có phải nhà cái không?"
  "components/odds-detail.tsx": 1, // "đã bóc phần nhà cái giữ"
  "lib/goalline/strings.ts": 2, // "tỷ lệ nhà cái thật" + "Không phải nhà cái."
  "lib/mock.ts": 1, // dữ liệu mock
};

type Doan = { tep: string; dong: number; chu: string };

function lietKe(thuMuc: string): string[] {
  return readdirSync(thuMuc).flatMap((ten) => {
    const duong = join(thuMuc, ten);
    if (ten === "node_modules" || ten === ".next") return [];
    return statSync(duong).isDirectory() ? lietKe(duong) : [duong];
  });
}

const tuongDoi = (duong: string) => relative(GOC, duong).split(sep).join("/");
const laTest = (tep: string) => /\.test\.(ts|tsx)$/.test(tep);

/** Mọi đoạn chữ khách có thể thấy trong một tệp .ts/.tsx (comment và tên biến không bao giờ lọt vào đây). */
function doanChuTrongMa(tep: string, nguon: string): Doan[] {
  const sf = ts.createSourceFile(tep, nguon, ts.ScriptTarget.Latest, true, tep.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ra: Doan[] = [];
  const them = (nut: ts.Node, chu: string) => {
    if (chu.trim()) ra.push({ tep, dong: sf.getLineAndCharacterOfPosition(nut.getStart(sf)).line + 1, chu });
  };
  const duyet = (nut: ts.Node): void => {
    const khongPhaiImport = !(ts.isImportDeclaration(nut.parent ?? nut) || ts.isExportDeclaration(nut.parent ?? nut));
    if (ts.isStringLiteral(nut) && khongPhaiImport) them(nut, nut.text);
    else if (ts.isNoSubstitutionTemplateLiteral(nut) || ts.isTemplateHead(nut) || ts.isTemplateMiddle(nut) || ts.isTemplateTail(nut)) them(nut, nut.text);
    else if (ts.isJsxText(nut)) them(nut, nut.text);
    ts.forEachChild(nut, duyet);
  };
  duyet(sf);
  return ra;
}

/** JSON không có comment: quét từng dòng. */
function doanChuTrongJson(tep: string, nguon: string): Doan[] {
  return nguon.split("\n").map((chu, i) => ({ tep, dong: i + 1, chu }));
}

function docDoan(): Doan[] {
  return THU_MUC.flatMap((t) => lietKe(join(GOC, t)))
    .map((d) => ({ d, tep: tuongDoi(d) }))
    .filter(({ tep }) => !laTest(tep))
    .flatMap(({ d, tep }) => {
      if (DUOI_MA.test(tep)) return doanChuTrongMa(tep, readFileSync(d, "utf8"));
      if (DUOI_JSON.test(tep)) return doanChuTrongJson(tep, readFileSync(d, "utf8"));
      return [];
    });
}

const choPhep = new Set(CHO_PHEP_TAI_XIU.map((x) => x.tep));
const cat = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 80);
const viPham = (d: Doan) => `${d.tep}:${d.dong}  ${cat(d.chu)}`;

describe("luật chữ hiển thị: không 'tài xỉu'", () => {
  const doan = docDoan();

  it("quét được mã nguồn và dữ liệu (không quét hụt thư mục)", () => {
    const tep = new Set(doan.map((d) => d.tep));
    expect([...tep].some((t) => t.startsWith("app/"))).toBe(true);
    expect([...tep].some((t) => t.startsWith("components/"))).toBe(true);
    expect([...tep].some((t) => t.startsWith("lib/"))).toBe(true);
    expect(tep.has("data/giai-hub.json")).toBe(true);
  });

  it("không chuỗi/JSX text nào chứa 'tài xỉu', 'tài/xỉu', 'Tài 2.5', 'Xỉu 2.5' (dùng Over/Under)", () => {
    const loi = doan.filter((d) => !choPhep.has(d.tep) && scrubTaiXiu(d.chu) !== d.chu).map(viPham);
    expect(loi).toEqual([]);
  });

  it("mỗi tệp trong danh sách cho phép vẫn tồn tại và vẫn có lý do", () => {
    for (const x of CHO_PHEP_TAI_XIU) {
      expect(x.lyDo.length).toBeGreaterThan(10);
      expect(statSync(join(GOC, x.tep)).isFile()).toBe(true);
    }
  });

  it("bắt đúng ca vi phạm trong mã (chuỗi, JSX text, template) và bỏ qua comment/định danh", () => {
    const mau = [
      "// tài xỉu trong comment",
      "/* Tài 2.5 */",
      "const taiXiu = 'Over 2.5';",
      "const a = 'Kèo Tài xỉu hôm nay';",
      "const b = <p>Xỉu 2.5 là gì</p>;",
      "const c = `Tài/Xỉu ${1}`;",
      "const d = 'trọng tài 2 lần';",
    ].join("\n");
    const bat = doanChuTrongMa("mau.tsx", mau).filter((x) => scrubTaiXiu(x.chu) !== x.chu);
    expect(bat.map((x) => x.dong)).toEqual([4, 5, 6]);
  });
});

describe("luật chữ hiển thị: không thêm 'nhà cái' mới", () => {
  it("số lần 'nhà cái' trong chữ hiển thị khớp danh sách đã chốt, tệp mới có là đỏ", () => {
    const dem: Record<string, number> = {};
    for (const d of docDoan()) {
      const n = (d.chu.match(/nhà\s+cái/gi) ?? []).length;
      if (n > 0) dem[d.tep] = (dem[d.tep] ?? 0) + n;
    }
    expect(dem).toEqual(NHA_CAI_HIEN_CO);
  });
});
