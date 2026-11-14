import type { KeoPhu } from "@/lib/du-doan-tuan";
import { cauChuoi, cauTySo, docChuoi, type ThiTruongPhu } from "@/lib/tran-keo-phu";
import { tenDoiViet } from "@/lib/ten-viet";
import { ChuTy, Ty } from "@/components/ty-le";

/**
 * Khối hai đội ghi bàn · tài xỉu 2,5 · tỷ số chính xác trên trang trận. Thị trường nào tệp không
 * ghi thì không vẽ; chuỗi 5 trận trái = cũ nhất, phải = mới nhất (như dải phong độ).
 */

const O = "mt-3 rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";

const TIP: Record<"btts" | "ou", (tip: string) => string> = {
  btts: (t) => (/yes/i.test(t) ? "Có" : "Không"),
  ou: (t) => (/over/i.test(t) ? "Tài 2.5" : "Xỉu 2.5"),
};
const CHON: Record<"btts" | "ou", [string, string]> = { btts: ["Có", "Không"], ou: ["Tài", "Xỉu"] };
const DAT: Record<"btts" | "ou", "Y" | "O"> = { btts: "Y", ou: "O" };

function Chuoi({ ten, s, loai }: { ten: string; s?: string; loai: "btts" | "ou" }) {
  const c = docChuoi(s, DAT[loai]);
  if (!c) return null;
  const [co, khong] = CHON[loai];
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate">{tenDoiViet(ten)}</span>
      {c.map((x, i) => (
        <span
          key={i}
          aria-label={x ? co : khong}
          className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded border px-1 font-display text-xs font-bold leading-none ${x ? "border-brand bg-brand/10 text-brand" : "border-line text-muted"}`}
        >
          {loai === "btts" ? (x ? "✓" : "✗") : x ? "↑" : "↓"}
        </span>
      ))}
    </div>
  );
}

function ThiTruong({ ten, loai, p, nha, khach }: { ten: string; loai: "btts" | "ou"; p: ThiTruongPhu; nha: string; khach: string }) {
  const [co, khong] = CHON[loai];
  const cau = cauChuoi(loai, tenDoiViet(nha), p.h5, tenDoiViet(khach), p.a5);
  const coKeo = p.keo.length === 2 && p.keo.every((x) => x > 0);
  return (
    <section className={O}>
      <h2 className={NHAN}>{ten}</h2>
      <p className="mt-2 text-[15px]">
        Dự đoán: <b className="font-display text-brand">{TIP[loai](p.tip)}</b>
        {coKeo && (
          <span className="text-muted">
            {" "}· Tỷ lệ {co} <b className="tabular-nums text-ink"><Ty v={p.keo[0]} /></b>, {khong} <b className="tabular-nums text-ink"><Ty v={p.keo[1]} /></b>
          </span>
        )}
      </p>
      <div className="mt-2 max-w-[560px] border-t border-line pt-1">
        <Chuoi ten={nha} s={p.h5} loai={loai} />
        <Chuoi ten={khach} s={p.a5} loai={loai} />
      </div>
      {cau && <p className="max-w-[560px] border-t border-line pt-2 text-[13px] leading-relaxed text-muted">{cau} Trái là trận cũ nhất, phải là trận mới nhất.</p>}
    </section>
  );
}

export function TranKeoPhu({ k }: { k: KeoPhu }) {
  const cs = k.pCs ? cauTySo(k.pCs.tip, k.pCs.keo) : null;
  return (
    <>
      {k.pBtts && <ThiTruong ten="Hai đội cùng ghi bàn" loai="btts" p={k.pBtts} nha={k.nha} khach={k.khach} />}
      {k.pOu && <ThiTruong ten="Tài xỉu 2.5 bàn" loai="ou" p={k.pOu} nha={k.nha} khach={k.khach} />}
      {cs && (
        <section className={O}>
          <h2 className={NHAN}>Tỷ số chính xác</h2>
          <p className="mt-2 text-[15px]"><ChuTy text={cs} /></p>
        </section>
      )}
    </>
  );
}
