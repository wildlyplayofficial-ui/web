import { createHmac, timingSafeEqual } from "crypto";

/** Verify Telegram Mini App initData signature. Returns parsed data if valid, null if invalid. */
export function verifyTmaInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 300,
): Record<string, string> | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  // Check auth_date TTL
  const authDate = params.get("auth_date");
  if (!authDate) return null;
  const age = Math.floor(Date.now() / 1000) - parseInt(authDate, 10);
  if (age > maxAgeSeconds) return null;

  // HMAC verification
  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const expected = Buffer.from(hash, "hex");
  if (computed.length !== expected.length || !timingSafeEqual(computed, expected)) return null;

  // Return parsed data
  const result: Record<string, string> = {};
  for (const [k, v] of entries) result[k] = v;
  result.hash = hash;
  return result;
}
