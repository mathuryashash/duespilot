import { NextResponse } from 'next/server';
import { COOKIE, safeEqual, sessionToken } from '@/lib/gate';
import { loadRootEnv } from '@/lib/config';
import { publicUrl } from '@/lib/origin';

// Form POST from /login. Sets an httpOnly session cookie (HMAC of the passcode, never the passcode).
// Redirects use publicUrl(): req.url is the internal localhost address behind Render's proxy.
export async function POST(req: Request) {
  loadRootEnv();
  const pass = process.env.DEMO_PASSCODE ?? '';
  const got = String((await req.formData().catch(() => null))?.get('passcode') ?? '');
  if (!pass || !safeEqual(got, pass)) return NextResponse.redirect(publicUrl('/login?bad=1', req.url), 303);
  const res = NextResponse.redirect(publicUrl('/', req.url), 303);
  res.cookies.set(COOKIE, sessionToken(pass), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
