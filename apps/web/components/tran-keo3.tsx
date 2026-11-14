import type { Keo3Tuan } from "@/lib/du-doan-tuan";
import { cauDnb, cauKqBtts, cauKqOu, docDnb, docKqBtts, docKqOu, KHOA_BTTS, KHOA_OU, oThapNhat } from "@/lib/tran-keo3";
import { tenDoiViet } from "@/lib/ten-viet";
import { ChuTy, Ty } from "@/components/ty-le";

/** Ba hộp tỷ lệ phụ (Hòa hoàn tiền · Kết quả + cả hai đội ghi bàn · Kết quả + Over/Under 2.5). Hộp nào thiếu số thì không vẽ. */

const O = "mt-3 rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";
const ODS = (hot: boolean) => `rounded border py-2 font-display font-bold tabular-nums ${hot ? "border-brand bg-brand/10 text-brand" : "border-line text-ink"}`;

function Luoi({ cot, hang, khoa, g }: { cot: string[]; hang: string[]; khoa: readonly string[]; g: Record<string, number> }) {
  const hot = oThapNhat(g);
  return (
    <div className="mt-3 max-w-[560px]">
      <div className="grid grid-cols-[84px_repeat(2,1fr)] gap-1 text-center text-xs sm:text-sm">
        <span />
        {cot.map((c) => (
          <span key={c} className="py-1 text-muted">{c}</span>
        ))}
        {khoa.map((k, i) => (
          <span key={k} className="contents">
            {i % 2 === 0 && <span className="self-center pr-1 text-left text-muted">{hang[i / 2]}</span>}
            <span className={ODS(k === hot)}><Ty v={g[k]} /></span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TranKeo3({ k }: { k: Keo3Tuan }) {
  const nha = tenDoiViet(k.nha);
  const khach = tenDoiViet(k.khach);
  const dnb = docDnb(k.pDnb);
  const btts = docKqBtts(k.pKqBtts);
  const ou = docKqOu(k.pKqOu);
  const hang = ["Nhà thắng", "Hòa", "Khách thắng"];
  return (
    <>
      {dnb && (
        <section className={O} data-hop="keo3">
          <h2 className={NHAN}>Hòa hoàn tiền</h2>
          <p className="mt-2 text-[15px]"><ChuTy text={cauDnb(dnb, nha, khach)} /></p>
          <div className="mt-3 grid max-w-[560px] grid-cols-2 gap-1 text-center text-xs sm:text-sm">
            <span className="py-1 text-muted">Nhà thắng</span>
            <span className="py-1 text-muted">Khách thắng</span>
            <span className={ODS(dnb[0] <= dnb[1])}><Ty v={dnb[0]} /></span>
            <span className={ODS(dnb[1] < dnb[0])}><Ty v={dnb[1]} /></span>
          </div>
        </section>
      )}
      {btts && (
        <section className={O} data-hop="keo3">
          <h2 className={NHAN}>Kết quả + cả hai đội ghi bàn</h2>
          <p className="mt-2 text-[15px]"><ChuTy text={cauKqBtts(btts, nha, khach)} /></p>
          <Luoi cot={["Có", "Không"]} hang={hang} khoa={KHOA_BTTS} g={btts} />
        </section>
      )}
      {ou && (
        <section className={O} data-hop="keo3">
          <h2 className={NHAN}>Kết quả + Over/Under 2.5</h2>
          <p className="mt-2 text-[15px]"><ChuTy text={cauKqOu(ou, nha, khach)} /></p>
          <Luoi cot={["Over", "Under"]} hang={hang} khoa={KHOA_OU} g={ou} />
        </section>
      )}
    </>
  );
}
