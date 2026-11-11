import type { LucLuong } from "@/lib/luc-luong";

const O = "rounded-card border border-line bg-card p-4";
const NHAN = "text-xs font-semibold uppercase tracking-wide text-muted";

/** Khối Lực lượng: ai vắng của từng đội + nguồn. Không có dữ liệu thì trang không gọi khối này. */
export function TranLucLuong({ l, nha, khach }: { l: LucLuong; nha: string; khach: string }) {
  const doi: [string, LucLuong["nha"]][] = [[nha, l.nha], [khach, l.khach]];
  const [y, m, d] = l.capNhat.split("-").map(Number);
  return (
    <section className={`mt-3 ${O}`}>
      <h2 className={NHAN}>Lực lượng</h2>
      {doi.map(([ten, ds]) => (
        <div key={ten} className="mt-3">
          <p className="text-[15px] font-semibold">{ten}</p>
          {ds.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Chưa có thông tin vắng mặt.</p>
          ) : (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {ds.map((c) => (
                <li key={c.ten}>
                  <span className="font-semibold">{c.ten}</span> <span className="text-muted">· {c.lyDo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <p className="mt-3 text-xs text-muted">
        Nguồn:{" "}
        {l.url ? (
          <a href={l.url} rel="nofollow noopener" target="_blank" className="underline hover:text-ink">{l.nguon}</a>
        ) : (
          l.nguon
        )}
        {d ? ` · cập nhật ${d}/${m}/${y}` : ""}
      </p>
    </section>
  );
}
