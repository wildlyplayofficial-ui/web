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
 *  6 giây là rộng rãi: đo 30 lượt song song từ máy hết 4 giây, tất cả 200.
 *  Chỗ gọi đã có .catch(() => []) nên quá hạn thì dải trận thiếu một giải,
 *  KHÔNG sập trang. Thiếu một giải còn hơn trắng trang. */
const HAN_CHO_MS = 6000;

export function lsFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  try {
    void getServiceSupabase()
      ?.rpc("increment_api_calls", { p_source: SOURCE, p_n: 1 })
      .then(() => undefined, () => undefined);
  } catch { /* best-effort */ }
  // Chỗ gọi tự truyền signal thì tôn trọng, không đè.
  const signal = init?.signal ?? AbortSignal.timeout(HAN_CHO_MS);
  return fetch(url, { ...init, signal });
}
