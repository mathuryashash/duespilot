import { NextResponse } from 'next/server';
import { store } from '@/lib/server';
import { clientRows } from '@/lib/seed';
import { liveSummary } from '@/lib/paypal';

export async function GET(req: Request) {
  const s = await store.read();
  const live = new URL(req.url).searchParams.get('live') === '1' ? await liveSummary().catch((e) => ({ error: String(e.message) })) : null;
  const pending = Object.values(s.pending).map(({ id, kind, hash, status, payload, created_at, result }) => ({ id, kind, hash, status, payload, created_at, result }));
  return NextResponse.json({ clients: clientRows(), invoices: Object.values(s.invoices), pending, negotiations: s.negotiations, audit: s.audit.slice(-50), paypal_log: s.paypal_log.slice(-50), clock_days: s.clock_days, live });
}
