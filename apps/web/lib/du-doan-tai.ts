/**
 * Nạp MỘT lần mọi dòng dự đoán (bài có nhận định + tệp tuần) cho /du-doan, trang trận
 * /du-doan/{slug} và sitemap. `cache` của React gộp lời gọi trong cùng một lượt dựng trang
 * (generateMetadata + trang cùng gọi vẫn chỉ kéo dữ liệu một lần).
 */
import { cache } from "react";
import { getTodaysPicks } from "./data";
import { getMucDuDoan } from "./du-doan";
import { boSungTySoLS, canBuTySo } from "./du-doan-ls";
import { doiCanPhongDo, dungHang } from "./du-doan-hang";
import { doiThieuPhongDo, gopTuan, hangTuan } from "./du-doan-tuan";
import { lichSuTySo } from "./ket-qua-ls";
import { getOddsBoard } from "./odds-data";
import { getTranDaDa } from "./phong-do-db";

export const taiDuDoan = cache(async () => {
  const [mucGoc, picks, odds] = await Promise.all([
    getMucDuDoan(),
    getTodaysPicks().catch(() => []),
    getOddsBoard().catch(() => []),
  ]);
  // Bảng fixtures ngừng có tỷ số từ 8/9 → trận từ bài đã đá mà thiếu số thì bù từ livescore (≤ 14 ngày, mỗi ngày UTC một lượt).
  const bayGio = Date.now();
  const ngayCan = [...new Set(mucGoc.filter((m) => canBuTySo(m, bayGio) && bayGio - Date.parse(m.kickoffUtc ?? "") < 14 * 86_400_000).map((m) => (m.kickoffUtc ?? "").slice(0, 10)))];
  const ls = (await Promise.all(ngayCan.map((d) => lichSuTySo(d, d).catch(() => [])))).flat();
  const muc = boSungTySoLS(mucGoc, ls, bayGio);
  const curator = picks.filter((p) => (p.author ?? "curator") === "curator");
  const [daDa, daDaTuan] = await Promise.all([getTranDaDa(doiCanPhongDo(muc)), getTranDaDa(doiThieuPhongDo())]);
  const hangBai = gopTuan(dungHang(muc, curator, odds, daDa));
  // Bài có nhận định trước, rồi dự đoán nạp từ tệp tuần (trùng trận thì giữ bài).
  return { muc, hang: [...hangBai, ...hangTuan(hangBai, daDaTuan, Date.now())] };
});
