/**
 * Nạp MỘT lần mọi dòng dự đoán (bài có nhận định + tệp tuần) cho /du-doan, trang trận
 * /du-doan/{slug} và sitemap. `cache` của React gộp lời gọi trong cùng một lượt dựng trang
 * (generateMetadata + trang cùng gọi vẫn chỉ kéo dữ liệu một lần).
 */
import { cache } from "react";
import { getTodaysPicks } from "./data";
import { getMucDuDoan } from "./du-doan";
import { doiCanPhongDo, dungHang } from "./du-doan-hang";
import { doiThieuPhongDo, hangTuan } from "./du-doan-tuan";
import { getOddsBoard } from "./odds-data";
import { getTranDaDa } from "./phong-do-db";

export const taiDuDoan = cache(async () => {
  const [muc, picks, odds] = await Promise.all([
    getMucDuDoan(),
    getTodaysPicks().catch(() => []),
    getOddsBoard().catch(() => []),
  ]);
  const curator = picks.filter((p) => (p.author ?? "curator") === "curator");
  const [daDa, daDaTuan] = await Promise.all([getTranDaDa(doiCanPhongDo(muc)), getTranDaDa(doiThieuPhongDo())]);
  const hangBai = dungHang(muc, curator, odds, daDa);
  // Bài có nhận định trước, rồi dự đoán nạp từ tệp tuần (trùng trận thì giữ bài).
  return { muc, hang: [...hangBai, ...hangTuan(hangBai, daDaTuan, Date.now())] };
});
