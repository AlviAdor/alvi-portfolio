import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { anonymize } from "./request";

/*
 * Token-bucket rate limiting. Upstash Redis (REST, edge-compatible, free tier)
 * when UPSTASH_REDIS_REST_URL/TOKEN are set; otherwise an in-memory sliding
 * window per server instance, which is fine for local dev and degrades
 * gracefully on serverless.
 */

export type Bucket = "api" | "contact" | "send";

const RULES: Record<Bucket, { tokens: number; refillPerMinute: number; windowMs: number }> = {
  /** 10 requests / minute / IP on every API route. */
  api: { tokens: 10, refillPerMinute: 10, windowMs: 60_000 },
  /** 10 contact attempts (token fetches + submits) / minute / IP. */
  contact: { tokens: 10, refillPerMinute: 10, windowMs: 60_000 },
  /** 3 delivered emails / 10 minutes / IP. Counted only when a message actually goes out. */
  send: { tokens: 3, refillPerMinute: 0.3, windowMs: 600_000 },
};

export interface RateResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the next token is available. */
  reset: number;
  backend: "upstash" | "memory";
}

export const upstashConfigured = (): boolean => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let limiters: Partial<Record<Bucket, Ratelimit>> | null = null;
function upstash(bucket: Bucket): Ratelimit | null {
  if (!upstashConfigured()) return null;
  limiters ??= {};
  const existing = limiters[bucket];
  if (existing) return existing;
  const rule = RULES[bucket];
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter:
      bucket === "send"
        ? Ratelimit.slidingWindow(rule.tokens, "10 m")
        : Ratelimit.tokenBucket(rule.refillPerMinute, "1 m", rule.tokens),
    prefix: `aa:rl:${bucket}`,
    ephemeralCache: new Map(),
    analytics: false,
    timeout: 1500,
  });
  limiters[bucket] = limiter;
  return limiter;
}

// in-memory token bucket fallback
const memory = new Map<string, { tokens: number; at: number }>();
function memoryLimit(bucket: Bucket, key: string): RateResult {
  const rule = RULES[bucket];
  const now = Date.now();
  const id = `${bucket}:${key}`;
  const state = memory.get(id) ?? { tokens: rule.tokens, at: now };
  const refill = ((now - state.at) / rule.windowMs) * rule.tokens;
  state.tokens = Math.min(rule.tokens, state.tokens + refill);
  state.at = now;
  const success = state.tokens >= 1;
  if (success) state.tokens -= 1;
  memory.set(id, state);
  if (memory.size > 10_000) memory.clear();
  const msPerToken = rule.windowMs / rule.tokens;
  return {
    success,
    limit: rule.tokens,
    remaining: Math.floor(state.tokens),
    reset: now + (success ? 0 : Math.ceil((1 - state.tokens) * msPerToken)),
    backend: "memory",
  };
}

export async function rateLimit(bucket: Bucket, ip: string): Promise<RateResult> {
  const key = await anonymize(ip);
  const limiter = upstash(bucket);
  if (limiter) {
    try {
      const r = await limiter.limit(key);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset, backend: "upstash" };
    } catch (err) {
      console.error("[rate-limit] upstash unavailable, falling back to memory", err);
    }
  }
  return memoryLimit(bucket, key);
}

/** Standard headers for any limited response. */
export function rateHeaders(r: RateResult): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(Math.max(0, r.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(r.reset / 1000)),
  };
  if (!r.success) h["Retry-After"] = String(Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)));
  return h;
}

/** Single-use markers (form-token nonces). Upstash SET NX EX when available. */
const usedMemory = new Map<string, number>();
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  if (upstashConfigured()) {
    try {
      const res = await Redis.fromEnv().set(`aa:once:${key}`, 1, { nx: true, ex: ttlSeconds });
      return res === "OK";
    } catch (err) {
      console.error("[rate-limit] upstash claimOnce failed, using memory", err);
    }
  }
  const now = Date.now();
  for (const [k, exp] of usedMemory) if (exp < now) usedMemory.delete(k);
  if (usedMemory.has(key)) return false;
  usedMemory.set(key, now + ttlSeconds * 1000);
  return true;
}
