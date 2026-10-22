// Demo passcode gate (BLOCKER 3). One shared passcode from DEMO_PASSCODE; the cookie holds an HMAC of it, never the
// passcode itself, so rotating DEMO_PASSCODE logs everyone out. Compared in constant time.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'dp_session';
const sha = (s: string) => createHash('sha256').update(s).digest();
export const safeEqual = (a: string, b: string) => timingSafeEqual(sha(a), sha(b)) && a === b; // hashes first: any length, no early exit
export const sessionToken = (passcode: string) => createHmac('sha256', passcode).update('duespilot-session-v1').digest('hex');

// Exempt: PayPal webhook (signature-verified instead), health check, the login page/route, static assets.
const OPEN = [/^\/api\/webhooks\/paypal$/, /^\/api\/health$/, /^\/login$/, /^\/api\/login$/, /^\/_next\//, /^\/favicon\.ico$/];

export type Decision = 'allow' | 'login' | 'deny' | 'misconfigured';
export function gateDecision(r: { pathname: string; cookie?: string; passcode: string; production: boolean }): Decision {
  if (/\/\.\.?(\/|$)|%2e|%2f/i.test(r.pathname)) return 'deny';
  if (OPEN.some((re) => re.test(r.pathname))) return 'allow';
  if (!r.passcode) return r.production ? 'misconfigured' : 'allow'; // local dev without a passcode stays open
  if (r.cookie && safeEqual(r.cookie, sessionToken(r.passcode))) return 'allow';
  return r.pathname.startsWith('/api/') ? 'deny' : 'login';
}
