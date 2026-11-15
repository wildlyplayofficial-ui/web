import xgDuLieu from "../data/xg-tuan.json";

/** Biểu đồ xG lên/xuống 10 trận giải VĐQG gần nhất (Peter 15/11, kiểu trang Fantasy). SVG vẽ phía server,
 * không dùng thư viện biểu đồ. Số từ FotMob (xg_fotmob.py ghi cn/ck vào data/xg-tuan.json), chỉ top 5 giải. */
type Diem = { date: string; opp: string; ha: string; xf: number; xa: number };
const XANH = "#16a34a";
const DO = "#dc2626";
const W = 340, H = 130, TRAI = 22, PHAI = 6, TREN = 8, DUOI = 22;

function BieuDo({ ten, d }: { ten: string; d: Diem[] }) {
  const tran = Math.max(3, Math.ceil(Math.max(...d.flatMap((x) => [x.xf, x.xa]))));
  const x = (i: number) => TRAI + (i * (W - TRAI - PHAI)) / Math.max(1, d.length - 1);
  const y = (v: number) => TREN + (1 - v / tran) * (H - TREN - DUOI);
  const duong = (k: "xf" | "xa") => d.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const tbf = d.reduce((s, p) => s + p.xf, 0) / d.length, tba = d.reduce((s, p) => s + p.xa, 0) / d.length;
  return (
    <figure className="mt-3">
      <figcaption className="flex items-baseline justify-between text-sm">
        <b className="text-ink">{ten}</b>
        <span className="text-xs text-muted">
          TB <b style={{ color: XANH }}>{tbf.toFixed(2)}</b> · <b style={{ color: DO }}>{tba.toFixed(2)}</b>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block h-auto w-full" role="img"
        aria-label={`${ten}: xG tạo ra trung bình ${tbf.toFixed(2)}, xG để đối thủ có trung bình ${tba.toFixed(2)} trong ${d.length} trận`}>
        {Array.from({ length: tran + 1 }, (_, v) => (
          <g key={v}>
            <line x1={TRAI} x2={W - PHAI} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={TRAI - 5} y={y(v) + 3} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.55}>{v}</text>
          </g>
        ))}
        <path d={duong("xa")} fill="none" stroke={DO} strokeWidth={2} strokeLinejoin="round" />
        <path d={duong("xf")} fill="none" stroke={XANH} strokeWidth={2.5} strokeLinejoin="round" />
        {d.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.xa)} r={2.5} fill={DO}><title>{`${p.date} ${p.ha === "N" ? "vs" : "@"} ${p.opp}: để đối thủ ${p.xa}`}</title></circle>
            <circle cx={x(i)} cy={y(p.xf)} r={3} fill={XANH}><title>{`${p.date} ${p.ha === "N" ? "vs" : "@"} ${p.opp}: tạo ra ${p.xf}`}</title></circle>
            {/* nhãn ngày cách 1 trận; trận cuối luôn có nhãn, neo phải cho khỏi tràn mép */}
            {((i % 2 === 0 && i < d.length - 2) || i === d.length - 1) && (
              <text x={x(i)} y={H - 6} textAnchor={i === d.length - 1 ? "end" : i === 0 ? "start" : "middle"}
                fontSize={9} fill="currentColor" fillOpacity={0.55}>{p.date}</text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function TranXgChuoi({ slug, nha, khach }: { slug: string; nha: string; khach: string }) {
  const d = (xgDuLieu as Record<string, { cn?: Diem[]; ck?: Diem[] }>)[slug];
  if (!d?.cn?.length || !d?.ck?.length) return null;
  return (
    <section className="mt-3 rounded-card border border-line bg-card p-4 text-muted">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">xG lên xuống {Math.max(d.cn.length, d.ck.length)} trận gần nhất</h2>
      <p className="mt-1 text-xs">xG là số bàn một đội đáng lẽ ghi được, tính từ chất lượng từng cú sút.</p>
      <p className="mt-2 flex gap-4 text-xs">
        <span><i className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ background: XANH }} />xG tạo ra</span>
        <span><i className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ background: DO }} />xG để đối thủ có</span>
      </p>
      <BieuDo ten={nha} d={d.cn} />
      <BieuDo ten={khach} d={d.ck} />
      <p className="mt-2 text-right text-[11px]">Giải VĐQG · Nguồn: FotMob</p>
    </section>
  );
}
