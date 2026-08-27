/**
 * fetch wrapper for livescore-api.com calls that counts usage in Supabase
 * (api_call_counters via increment_api_calls RPC — daily quota tracking).
 * Best-effort fire-and-forget: counting never blocks or fails the actual fetch.
 * No batching — serverless functions are short-lived and call volume is low.
 */
import { getServiceSupabase } from "./supabase-server";

const SOURCE = "livescore-web";

/** Hạn chờ mặc định cho mỗi lượt gọi nhà cung cấp tỷ số.
 *
 *  VÌ SAO CÓ: trước đây lsFetch là fetch trần, KHÔNG hạn giờ. Trang chủ gọi 33
 *  lượt trong một Promise.all — chỉ cần MỘT lượt treo là cả trang treo mãi tới
 *  khi Vercel cắt. Nick báo 27/8: trang chủ không vào được, trong khi /news,
 *  /matches, /analysis vẫn 0,5 giây. Đo lúc đó: gọi trơn quá 30 giây bỏ cuộc,
 *  gọi kèm tham số lạ thì ra 200 sau 10,6 giây — chậm chứ không chết, đúng dáng
 *  chờ một lượt gọi không bao giờ trả.
 *
 *  VÌ SAO 10 GIÂY chứ không phải 6: Jane bắn đúng bộ lượt trang chủ từ Railway,
 *  đo TỪNG lượt chứ không lấy trung bình — vì hạn giờ bắn theo từng lượt.
 *    đợt nguội: lượt chậm nhất 5,22 giây (lịch epl-2026)
 *    đợt nóng : 1,6 tới 2,2 giây cho cả đợt
 *  Hôm nay nhà cung cấp KHOẺ mà lượt nguội đã chạm 87% của hạn 6 giây. Ngày nào
 *  họ mệt hơn là bắn nhầm ngay, mà bắn nhầm thì dải trận biến mất im lặng.
 *  Cán cân lệch rõ về phía nới: trần chỉ chạm tới khi ĐANG hỏng, còn hạn quá
 *  chặt thì ăn nội dung ở MỌI lần dựng nguội.
 *  Chỗ gọi đã có .catch(() => []) nên quá hạn thì dải trận thiếu một giải,
 *  KHÔNG sập trang. Thiếu một giải còn hơn trắng trang. */
const HAN_CHO_MS = 10_000;

export function lsFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  try {
    void getServiceSupabase()
      ?.rpc("increment_api_calls", { p_source: SOURCE, p_n: 1 })
      .then(() => undefined, () => undefined);
  } catch { /* best-effort */ }
  // Chỗ gọi tự truyền signal thì tôn trọng, không đè.
  if (init?.signal) return fetch(url, init);

  const t0 = Date.now();
  return fetch(url, { ...init, signal: AbortSignal.timeout(HAN_CHO_MS) }).catch((e) => {
    // KÊU TO khi hạn giờ bắn. Chỗ gọi đều .catch(() => []) nên quá hạn là dải
    // trận biến mất KHÔNG một tiếng động — đúng loại hỏng thầm nhà mình cấm.
    // Thấy dòng này lặp nhiều nghĩa là 6 giây quá chặt, phải nới, chứ không
    // phải để nó lặng lẽ nuốt nội dung.
    const qua = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    console.warn(
      `[lsFetch] ${qua ? `QUÁ HẠN ${HAN_CHO_MS}ms` : "LỖI"} sau ${Date.now() - t0}ms — ` +
      `${String(url).replace(/(key|secret)=[^&]*/g, "$1=***").slice(0, 110)}`,
    );
    throw e;
  });
}
