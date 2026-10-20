import { NextResponse } from 'next/server';
import { store } from '@/lib/server';
import { handleWebhook } from '@/lib/webhook';
import { getInvoice, verifyWebhook } from '@/lib/paypal';
import { config } from '@/lib/config';

// Real events: PayPal postback verification (needs PAYPAL_WEBHOOK_ID). Local dev: DEMO_ALLOW_SIM=1 accepts
// events marked x-duespilot-sim: 1. Either way invoice state comes from re-fetching PayPal, never the payload.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const verify = async (h: Record<string, string | undefined>, raw: string) =>
    (config().allowSim && h['x-duespilot-sim'] === '1') || verifyWebhook(h, raw);
  const r = await handleWebhook({ headers, rawBody }, { store, verify, getInvoice });
  return NextResponse.json(r.body, { status: r.status });
}
