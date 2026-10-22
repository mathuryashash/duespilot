// Webhook handling (BLOCKER 5): verify -> dedupe event.id -> re-fetch by id -> update. Payload amounts are never trusted.
import type { Store } from './store';
import type { InvoiceView } from './paypal';
import { applyInvoice } from './refresh';

export type WebhookDeps = { store: Store; verify: (h: Record<string, string | undefined>, raw: string) => Promise<boolean>;
  getInvoice: (id: string) => Promise<InvoiceView> };

export async function handleWebhook(req: { headers: Record<string, string | undefined>; rawBody: string }, d: WebhookDeps) {
  let ev: any;
  try { ev = JSON.parse(req.rawBody); } catch { return { status: 400, body: { error: 'bad json' } }; }
  if (typeof ev?.id !== 'string') return { status: 400, body: { error: 'no event id' } };
  if (!(await d.verify(req.headers, req.rawBody))) return { status: 401, body: { error: 'signature' } };
  const before = await d.store.read();
  if (before.events[ev.id]) return { status: 200, body: { duplicate: true } };
  const invId: string | undefined = ev.resource?.invoice?.id ?? ev.resource?.id;
  const fresh = invId && before.invoices[invId] ? await d.getInvoice(invId) : undefined;
  const dup = await d.store.update((s) => {
    if (s.events[ev.id]) return true; // a concurrent delivery won the race
    s.events[ev.id] = new Date().toISOString();
    if (fresh) applyInvoice(s, fresh, 'webhook');
    return false;
  });
  if (dup) return { status: 200, body: { duplicate: true } };
  return { status: 200, body: { ok: true, updated: fresh?.id ?? null } };
}
