import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Production: Use Upstash Redis for distributed rate limiting
// Development: Fallback to in-memory if env vars not set
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// In-memory fallback for development
type Entry = { count: number; resetAt: number };
const memoryStore = new Map<string, Entry>();

async function rateLimitUpstash(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  if (!redis) return rateLimitMemory(key, max, windowSeconds * 1000);

  try {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds}s`),
    });

    const result = await ratelimit.limit(key);
    return result.success;
  } catch (error) {
    console.error("Rate limit check failed, falling back to memory:", error);
    return rateLimitMemory(key, max, windowSeconds * 1000);
  }
}

function rateLimitMemory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  return rateLimitUpstash(key, max, windowSeconds);
}

export function getIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0] || "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}
