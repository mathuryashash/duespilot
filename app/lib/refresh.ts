// Invoice state from PayPal (poll or webhook re-fetch). PayPal GET is the source of truth; transitions are
// idempotent and monotonic (SENT -> PARTIALLY_PAID -> PAID -> refunded/cancelled), so a stale read never undoes a payment.
import { audit, type State, type Store } from './store';
import type { InvoiceView } from './paypal';

const RANK: Record<string, number> = { DRAFT: 0, SCHEDULED: 0, SENT: 1, UNPAID: 1, PAYMENT_PENDING: 1.5, PARTIALLY_PAID: 2,
  PAID: 3, MARKED_AS_PAID: 3, PARTIALLY_REFUNDED: 4, REFUNDED: 5, MARKED_AS_REFUNDED: 5, CANCELLED: 6 };
const SETTLED = 3; // PAID and later: the scheduled poll stops asking

export function applyInvoice(s: State, v: InvoiceView, source: 'poll' | 'webhook'): string | null {
  const cur = s.invoices[v.id];
  if (!cur) return null;
  if ((RANK[v.status] ?? 0) < (RANK[cur.status] ?? 0)) return null; // stale read
  const from = cur.status;
  Object.assign(cur, { status: v.status, amount_usd: v.amount_usd, paid_usd: v.paid_usd, due_usd: v.due_usd,
    pay_link: v.pay_link ?? cur.pay_link, due_on: v.due_on ?? cur.due_on, updated_at: new Date().toISOString() });
  if (from === v.status) return null;
  const change = `${v.id}: ${from} -> ${v.status}`;
  audit(s, `${source} ${change}${v.paid_usd ? ` (paid $${v.paid_usd} of $${v.amount_usd})` : ''}`);
  return change;
}

// all=false (scheduled poll): only invoices not yet settled. GETs run outside the store transaction.
export async function refreshAll(store: Store, get: (id: string) => Promise<InvoiceView>, o: { all?: boolean } = {}) {
  const ids = Object.values((await store.read()).invoices).filter((i) => o.all || (RANK[i.status] ?? 0) < SETTLED).map((i) => i.id);
  const changed: string[] = []; const errors: string[] = [];
  for (const id of ids) {
    try {
      const v = await get(id);
      const c = await store.update((s) => applyInvoice(s, v, 'poll'));
      if (c) changed.push(c);
    } catch (e) { errors.push(`${id}: ${String((e as Error).message).slice(0, 120)}`); }
  }
  return errors.length ? { checked: ids.length, changed, errors } : { checked: ids.length, changed };
}
