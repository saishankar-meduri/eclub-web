import "server-only";

// Fixed-window limiter. Uses Upstash Redis (REST, shared across serverless instances) when
// UPSTASH_REDIS_REST_URL/TOKEN are set; otherwise falls back to per-instance memory (best effort).
const mem = new Map();

function memHit(key, limit, windowMs) {
  const now = Date.now();
  const arr = (mem.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  mem.set(key, arr);
  if (mem.size > 5000) for (const [k, v] of mem) if (!v.length || now - v[v.length - 1] > windowMs) mem.delete(k);
  return { ok: arr.length <= limit, retryAfter: Math.ceil(windowMs / 1000) };
}

export async function rateLimit(key, limit, windowSec) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memHit(key, limit, windowSec * 1000);
  try {
    const r = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec), "NX"]]),
      cache: "no-store",
    });
    const [{ result: count }] = await r.json();
    return { ok: count <= limit, retryAfter: windowSec };
  } catch (e) {
    console.error("rateLimit redis failed, using memory", e.message);
    return memHit(key, limit, windowSec * 1000);
  }
}

export const clientIp = (req) =>
  req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
