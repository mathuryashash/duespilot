// Runs before every request (Next 16 Proxy, Node runtime): demo passcode gate, then per-IP rate limits.
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, gateDecision } from './lib/gate';
import { loadRootEnv } from './lib/config';
import { LIMITS, tokenBucket, clientIp, bucketFor } from './lib/ratelimit';

const buckets = Object.fromEntries(Object.entries(LIMITS).map(([k, l]) => [k, tokenBucket(l)])) as Record<keyof typeof LIMITS, ReturnType<typeof tokenBucket>>;

export function proxy(req: NextRequest) {
  loadRootEnv();
  const { pathname } = req.nextUrl;
  const d = gateDecision({ pathname, cookie: req.cookies.get(COOKIE)?.value, passcode: process.env.DEMO_PASSCODE ?? '', production: process.env.NODE_ENV === 'production' });
  if (d === 'misconfigured') return NextResponse.json({ error: 'DEMO_PASSCODE is not set' }, { status: 503 });
  if (d === 'deny') return NextResponse.json({ error: 'passcode required' }, { status: 401 });
  if (d === 'login') return NextResponse.redirect(new URL('/login', req.url));
  const b = bucketFor(req.method, pathname);
  if (b && !buckets[b].take(clientIp(req.headers)))
    return NextResponse.json({ error: `rate limited (${b}); try again in a minute` }, { status: 429, headers: { 'Retry-After': '60' } });
  return NextResponse.next();
}
