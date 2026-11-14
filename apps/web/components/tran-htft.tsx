import type { HtftDiem } from "@/lib/du-doan-tuan";
import { cauDiem, cauHtft, cuaNoiNhat, DIEM_TOI_DA, docDiem, docHtft, KHOA_HTFT, xacSuatTheoHang } from "@/lib/tran-htft";
import { tenDoiViet } from "@/lib/ten-viet";

/**
 * Khối "Hiệp 1 / Cả trận" (9 cửa, tô cửa tỷ lệ thấp nhất) và "Điểm tấn công / phòng ngự" (thang 1 đến 10) của từng đội.
 * Phần nào tệp không ghi thì không vẽ — không số giả, không khung trống.
 */

const O = "mt-3 rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";
const COT = ["Nhà thắng", "Hòa", "Khách thắng"];
const HANG = ["Nhà dẫn", "Hòa", "Khách dẫn"];

function Hiep({ k }: { k: HtftDiem }) {
  const ds = docHtft(k.htft);
  if (!k.htft || !ds) return null;
  const nha = tenDoiViet(k.nha);
  const khach = tenDoiViet(k.khach);
  const noi = cuaNoiNhat(k.htft);
  const xs = xacSuatTheoHang(k.htft);
  return (
    <section className={O}>
      <h2 className={NHAN}>Hiệp 1 / Cả trận</h2>
      <p className="mt-2 text-[15px]">{cauHtft(k.htft, nha, khach)}</p>
      <div className="mt-3 max-w-[560px] overflow-x-auto">
        <div className="grid min-w-[300px] grid-cols-[64px_repeat(3,1fr)] gap-1 text-center text-xs sm:grid-cols-[84px_repeat(3,1fr)] sm:text-sm">
          <span />
          {COT.map((c) => (
            <span key={c} className="py-1 text-muted">{c}</span>
          ))}
          {KHOA_HTFT.map((khoa, i) => (
            <span key={khoa} className="contents">
              {i % 3 === 0 && <span className="self-center pr-1 text-left text-muted">Hiệp 1: {HANG[i / 3].toLowerCase()}</span>}
              <span
                className={`rounded border py-2 font-display font-bold tabular-nums ${khoa === noi ? "border-brand bg-brand/10 text-brand" : "border-line text-ink"}`}
              >
                {ds[i].toFixed(2)}
              </span>
            </span>
          ))}
        </div>
      </div>
      {xs && (
        <p className="mt-3 max-w-[560px] border-t border-line pt-2 text-[13px] leading-relaxed text-muted">
          Ước tính từ các tỷ lệ trên: hiệp 1 nhà dẫn {xs.hiep1[0]}%, hòa {xs.hiep1[1]}%, khách dẫn {xs.hiep1[2]}%. Cả trận nhà thắng {xs.catran[0]}%, hòa {xs.catran[1]}%, khách thắng {xs.catran[2]}%.
        </p>
      )}
    </section>
  );
}

function Cham({ v }: { v: number }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`${v} trên ${DIEM_TOI_DA}`}>
      {Array.from({ length: DIEM_TOI_DA }, (_, i) => i + 1).map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-sm sm:w-4 ${i <= v ? "bg-brand" : "bg-line"}`} />
      ))}
    </span>
  );
}

function DongDiem({ ten, v }: { ten: string; v: [number, number] }) {
  return (
    <div className="py-2.5">
      <p className="truncate text-sm font-semibold">{ten}</p>
      {(["Tấn công", "Phòng ngự"] as const).map((nhan, i) => (
        <p key={nhan} className="mt-1.5 flex items-center gap-3 text-sm">
          <span className="w-[72px] shrink-0 text-muted">{nhan}</span>
          <Cham v={v[i]} />
          <b className="font-display tabular-nums">{v[i]}/{DIEM_TOI_DA}</b>
        </p>
      ))}
    </div>
  );
}

function Diem({ k }: { k: HtftDiem }) {
  const n = docDiem(k.diem?.n);
  const kh = docDiem(k.diem?.k);
  if (!n || !kh) return null;
  const nha = tenDoiViet(k.nha);
  const khach = tenDoiViet(k.khach);
  return (
    <section className={O}>
      <h2 className={NHAN}>Điểm tấn công / phòng ngự</h2>
      <div className="mt-1 max-w-[560px] divide-y divide-line">
        <DongDiem ten={nha} v={n} />
        <DongDiem ten={khach} v={kh} />
      </div>
      <p className="max-w-[560px] border-t border-line pt-2 text-[13px] leading-relaxed text-muted">
        {cauDiem(nha, k.diem?.n)} {cauDiem(khach, k.diem?.k)}{" "}
        {k.diem?.loai === "san"
          ? "Đội nhà tính riêng các trận sân nhà, đội khách tính riêng các trận sân khách (10 trận gần nhất)."
          : "Tính theo các trận gần đây."}{" "}
        Thang 1 đến 10, điểm cao là phong độ tốt hơn ở phần đó.
      </p>
    </section>
  );
}

export function TranHtftDiem({ k }: { k: HtftDiem }) {
  return (
    <>
      <Hiep k={k} />
      <Diem k={k} />
    </>
  );
}
