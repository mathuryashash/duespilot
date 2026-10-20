// Webhook handling (BLOCKER 5): verify -> dedupe event.id -> re-fetch by id -> update. Payload amounts are never trusted.
import { audit, type Store } from './store';

export type WebhookDeps = { store: Store; verify: (h: Record<string, string | undefined>, raw: string) => Promise<boolean>;
  getInvoice: (id: string) => Promise<{ id: string; status: string; amount_usd: number }> };

export async function handleWebhook(req: { headers: Record<string, string | undefined>; rawBody: string }, d: WebhookDeps) {
  let ev: any;
  try { ev = JSON.parse(req.rawBody); } catch { return { status: 400, body: { error: 'bad json' } }; }
  if (typeof ev?.id !== 'string') return { status: 400, body: { error: 'no event id' } };
  if (!(await d.verify(req.headers, req.rawBody))) return { status: 401, body: { error: 'signature' } };
  if (d.store.read().events[ev.id]) return { status: 200, body: { duplicate: true } };
  const invId: string | undefined = ev.resource?.invoice?.id ?? ev.resource?.id;
  const tracked = invId ? d.store.read().invoices[invId] : undefined;
  const fresh = tracked ? await d.getInvoice(invId!) : undefined;
  const s = d.store.read();
  s.events[ev.id] = new Date().toISOString();
  if (fresh) {
    Object.assign(s.invoices[fresh.id], { status: fresh.status, amount_usd: fresh.amount_usd, updated_at: new Date().toISOString() });
    audit(s, `webhook ${String(ev.event_type).slice(0, 60)} -> ${fresh.id} now ${fresh.status}`);
  }
  d.store.write(s);
  return { status: 200, body: { ok: true, updated: fresh?.id ?? null } };
}
