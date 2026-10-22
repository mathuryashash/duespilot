import { NextResponse } from 'next/server';
import { store } from '@/lib/server';

// Render health check (unauthenticated): process up + DB readable. No state is returned.
export async function GET() {
  try { await store.read(); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
