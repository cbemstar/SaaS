import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { hasRateLimitConfig, upstashRedisToken, upstashRedisUrl } from "@/lib/env";

/**
 * Distributed rate limiting backed by Upstash Redis.
 *
 * Design choices for scale + safety:
 * - **Opt-in / fail-open:** if Upstash isn't configured, `enforceRateLimit`
 *   allows the request. This keeps local/dev and not-yet-provisioned deploys
 *   working, and means a Redis outage degrades to "no limit" rather than taking
 *   the app down. (For hard abuse protection, also enable the Vercel WAF rate
 *   limiter at the platform edge — see docs.)
 * - **Sliding window** algorithm: smoother than fixed windows, no burst at the
 *   boundary.
 * - **ephemeralCache:** in-process cache so a warm function instance can reject
 *   obvious floods without a Redis round-trip.
 * - Limiters are created lazily and reused per limit config.
 */

const redis = hasRateLimitConfig
  ? new Redis({ url: upstashRedisUrl!, token: upstashRedisToken! })
  : null;

const ephemeralCache = new Map<string, number>();
const limiterCache = new Map<string, Ratelimit>();

export type RateLimitTier = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window duration, e.g. "10 s", "1 m", "1 h". */
  window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`;
  /** Namespace prefix so different routes don't share counters. */
  prefix: string;
};

/** Sensible defaults for the routes we protect. */
export const RATE_LIMITS = {
  /** Expensive AI generations — keyed per workspace. */
  ai: { limit: 20, window: "1 m", prefix: "rl:ai" },
  /** Unauthenticated / public endpoints — keyed per IP. */
  public: { limit: 60, window: "1 m", prefix: "rl:public" },
  /** Auth-sensitive or mutating POSTs — keyed per workspace/user. */
  mutation: { limit: 120, window: "1 m", prefix: "rl:mut" },
} as const satisfies Record<string, RateLimitTier>;

function getLimiter(tier: RateLimitTier): Ratelimit | null {
  if (!redis) return null;
  let limiter = limiterCache.get(tier.prefix);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tier.limit, tier.window),
      prefix: tier.prefix,
      analytics: true,
      ephemeralCache,
    });
    limiterCache.set(tier.prefix, limiter);
  }
  return limiter;
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window resets. */
  reset: number;
};

/**
 * Check (and consume) one unit against `identifier` for the given tier.
 * Returns success=true when allowed; fail-open (success=true) when unconfigured.
 */
export async function enforceRateLimit(
  tier: RateLimitTier,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(tier);
  if (!limiter) {
    return { success: true, limit: tier.limit, remaining: tier.limit, reset: 0 };
  }
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { success, limit, remaining, reset };
  } catch (error) {
    // Never let a limiter failure block legitimate traffic.
    console.error("Rate limiter error (allowing request)", error);
    return { success: true, limit: tier.limit, remaining: tier.limit, reset: 0 };
  }
}

/** Best-effort client IP from standard proxy headers (Vercel sets these). */
export function clientIpFrom(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Standard 429 response with rate-limit headers. */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = result.reset ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) : 60;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}
