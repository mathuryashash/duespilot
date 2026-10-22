// Per-IP token buckets (BLOCKER 3). ponytail: in-memory, one Node process; resets on restart. Redis if we scale out.
export type Limit = { capacity: number; refillPerMin: number };

// Documented limits (README "Guardrails"). LLM routes are the Nebius spend; PayPal routes are sandbox writes/GET fan-out.
export const LIMITS = {
  llm: { capacity: 5, refillPerMin: 0.2 },    // burst 5, then 1 every 5 min (12/h) per IP
  paypal: { capacity: 10, refillPerMin: 1 },  // burst 10, then 1/min per IP
  login: { capacity: 5, refillPerMin: 1 },    // passcode guesses: burst 5, then 1/min per IP
} satisfies Record<string, Limit>;

export function tokenBucket(l: Limit, now = Date.now) {
  const b = new Map<string, { t: number; at: number }>();
  return {
    take(key: string) {
      const n = now();
      const cur = b.get(key) ?? { t: l.capacity, at: n };
      const t = Math.min(l.capacity, cur.t + ((n - cur.at) / 60_000) * l.refillPerMin);
      const ok = t >= 1;
      b.set(key, { t: ok ? t - 1 : t, at: n });
      if (b.size > 10_000) b.delete(b.keys().next().value!); // bound memory
      return ok;
    },
  };
}

// Render sits behind a proxy that sets x-forwarded-for; the first hop is the client.
export const clientIp = (h: Headers) => h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local';

// Which bucket a request spends from (null = not limited).
export function bucketFor(method: string, pathname: string): keyof typeof LIMITS | null {
  if (method !== 'POST') return null;
  if (pathname === '/api/login') return 'login';
  if (['/api/negotiate', '/api/intake', '/api/reminders'].includes(pathname)) return 'llm';
  if (/^\/api\/actions\/[^/]+\/approve$/.test(pathname) || pathname === '/api/invoices/refresh') return 'paypal';
  return null;
}
