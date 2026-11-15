import xgDuLieu from "../data/xg-tuan.json";

/** Khung xG kiểu FotMob (Peter 15/11): số trái · nhãn · số phải, bên tốt hơn tô màu đội. Số từ FotMob,
 * máy ~/.claude/tools/banhbong_predictz/xg_fotmob.py ghi data/xg-tuan.json mỗi sáng.
 * Giải FotMob không có xG / thiếu chỉ số nào thì dòng đó tự ẩn; không có số thì ẩn cả khung. */
type K = "xf" | "xa" | "gf" | "ga" | "sh" | "st" | "bc" | "pos";
type Tran = { date: string; opp: string; ha: string } & Partial<Record<K, number>>;
const O = "mt-3 rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";
/** Trung bình các trận có chỉ số k; không trận nào có -> null (ẩn dòng). */
const tb = (r: Tran[], k: K) => {
  const v = r.map((x) => x[k]).filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const DONG: [string, K, (v: number) => string, boolean][] = [
  ["xG", "xf", (v) => v.toFixed(2), false],
  ["xG đối thủ", "xa", (v) => v.toFixed(2), true],
  ["Bàn thắng", "gf", (v) => v.toFixed(1), false],
  ["Bàn thua", "ga", (v) => v.toFixed(1), true],
  ["Cú sút", "sh", (v) => v.toFixed(1), false],
  ["Sút trúng đích", "st", (v) => v.toFixed(1), false],
  ["Cơ hội lớn", "bc", (v) => v.toFixed(1), false],
  ["Kiểm soát bóng", "pos", (v) => `${v.toFixed(0)}%`, false],
];
const MAU = ["#d4213d", "#f2c200"];

function So({ v, on, i }: { v: string; on: boolean; i: number }) {
  return on ? (
    <b className="rounded-full px-2.5 py-0.5" style={{ background: MAU[i], color: i ? "#111" : "#fff" }}>{v}</b>
  ) : (
    <b className="px-2.5 py-0.5">{v}</b>
  );
}

function GanDay({ ten, logo, r }: { ten: string; logo?: string | null; r: Tran[] }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold">{logo && <img src={logo} alt="" width={16} height={16} />}{ten}</div>
      {[...r].reverse().map((x) => {
        const kq = Math.sign((x.gf ?? 0) - (x.ga ?? 0));
        return (
          <div key={x.date + x.opp} className="flex items-center gap-2 border-t border-line py-1.5 text-[13px]">
            <b className="min-w-[34px] rounded px-1.5 text-center text-black" style={{ background: kq > 0 ? "#00c853" : kq < 0 ? "#ef5350" : "#9e9e9e" }}>{x.gf}-{x.ga}</b>
            <span className="flex-1 truncate">{x.ha === "N" ? "" : "@ "}{x.opp}</span>
            {x.xf != null && x.xa != null && (
              <span className="text-muted">xG <b className="text-ink">{x.xf.toFixed(1)}</b> - {x.xa.toFixed(1)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TranXg({ slug, nha, khach, logo }: { slug: string; nha: string; khach: string; logo: [string | null | undefined, string | null | undefined] }) {
  const d = (xgDuLieu as Record<string, { n: Tran[]; k: Tran[] }>)[slug];
  if (!d || !d.n.length || !d.k.length) return null;
  const tong = (r: Tran[], k: K) => r.reduce((s, x) => s + (x[k] ?? 0), 0);
  const coXg = d.n.filter((x) => x.xf != null && x.xa != null);
  const itHon = coXg.filter((x) => x.xa! - x.xf! >= 0.2).length;
  const noiBat: [number, string][] = [
    [0, `${d.n.length} trận gần nhất thủng ${tong(d.n, "ga")} bàn`],
    ...(coXg.length >= 3 ? [[0, `${itHon}/${coXg.length} trận tạo ít cơ hội hơn đối thủ`] as [number, string]] : []),
    [1, `Thủng ${tong(d.k, "ga")} bàn trong ${d.k.length} trận`],
  ];
  const coXgDong = tb(d.n, "xf") != null && tb(d.k, "xf") != null;
  return (
    <section className={O}>
      <h2 className={NHAN}>Thống kê trận gần nhất</h2>
      <div className="mt-3 flex items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-1.5">{logo[0] && <img src={logo[0]} alt="" width={22} height={22} />}{nha}</span>
        <span className="text-xs font-normal text-muted">trung bình/trận</span>
        <span className="flex items-center gap-1.5">{khach}{logo[1] && <img src={logo[1]} alt="" width={22} height={22} />}</span>
      </div>
      {DONG.map(([nhan, k, f, thap]) => {
        const a = tb(d.n, k), b = tb(d.k, k);
        if (a == null || b == null) return null;
        const fa = f(a), fb = f(b), khac = fa !== fb;
        return (
          <div key={k} className="flex items-center justify-between py-2 text-sm">
            <So v={fa} i={0} on={khac && (thap ? a < b : a > b)} />
            <span>{nhan}</span>
            <So v={fb} i={1} on={khac && (thap ? b < a : b > a)} />
          </div>
        );
      })}
      {coXgDong && (
        <details className="text-center text-xs text-muted">
          <summary className="cursor-pointer">ⓘ xG là gì?</summary>
          <p className="mt-1 text-left">xG (bàn thắng kỳ vọng) đo chất lượng cơ hội: mỗi cú sút có xác suất thành bàn từ 0 đến 1, cộng lại thành xG.</p>
        </details>
      )}
      <h3 className={`${NHAN} mt-4`}>Đáng chú ý</h3>
      {noiBat.map(([i, t]) => (
        <div key={t} className="my-1.5 flex items-center gap-2.5">
          {logo[i] && <img src={logo[i]!} alt="" width={20} height={20} />}
          <div className="flex-1 rounded-md border-l-[3px] bg-line/40 px-2.5 py-2 text-[13px]" style={{ borderColor: MAU[i] }}>{t}</div>
        </div>
      ))}
      <GanDay ten={nha} logo={logo[0]} r={d.n} />
      <GanDay ten={khach} logo={logo[1]} r={d.k} />
      <p className="mt-2 text-[11px] text-muted">Nguồn: FotMob</p>
    </section>
  );
}
