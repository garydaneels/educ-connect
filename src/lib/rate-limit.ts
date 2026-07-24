type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
  lastCleanup = now;
}

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true; // autorisé
  }

  if (entry.count >= max) return false; // bloqué

  entry.count++;
  return true;
}

export function getIp(req: Request): string {
  // Only trust X-Forwarded-For if explicitly enabled
  const trustProxy = process.env.TRUST_PROXY === "true";

  if (!trustProxy) {
    // Fallback to unknown to prevent spoofing
    return "unknown";
  }

  // Get the first IP from X-Forwarded-For (rightmost is most recent proxy)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0] || "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}
