// Deterministic executors run only by approve(id, hash). Each re-validates its payload at execution time.
import { z } from 'zod';
import { audit, type Store } from './store';
import { draftSchema } from './draft';
import { createAndSend, pp } from './paypal';

type Call = (method: string, p: string, body?: unknown) => Promise<any>;
const REMINDABLE = new Set(['SENT', 'UNPAID', 'PARTIALLY_PAID']);
const plain = (n: number) => z.string().min(1).max(n).refine((s) => !/[<>]|https?:\/\/|@/.test(s), 'plain text only (no markup, links or emails)');
export const ReminderPayload = z.object({
  invoice_id: z.string().regex(/^INV2(-[A-Z0-9]{4}){4}$/), subject: plain(100), note: plain(600),
  tone: z.enum(['friendly', 'firm', 'final']), step: z.number().int().min(0).max(10),
});

export function makeExecutors(d: { store: Store; call?: Call; allowedDomain: string; today: () => string | Promise<string> }) {
  const call = d.call ?? pp;
  return {
    async send_invoices(payload: { drafts: unknown[]; client_id?: string; negotiation?: unknown }) {
      const S = draftSchema(d.allowedDomain);
      const drafts = payload.drafts.map((x) => S.parse(x)); // re-validate at execution time
      const role = (i: number) => (payload.negotiation ? (i === 0 ? 'deposit' : 'balance') : 'invoice');
      const out = [];
      for (const [i, dr] of drafts.entries()) {
        const v = await createAndSend(dr, call);
        await d.store.update((s) => {
          s.invoices[v.id] = { ...v, role: role(i), due_on: dr.due_date, client_id: payload.client_id, reminders: [], updated_at: new Date().toISOString() };
          audit(s, `invoice ${v.id} (${role(i)} $${v.amount_usd}) created+sent -> ${v.status}`);
        });
        out.push(v);
      }
      return { invoices: out };
    },
    async send_reminder(payload: unknown) {
      const p = ReminderPayload.parse(payload);
      const inv = (await d.store.read()).invoices[p.invoice_id];
      if (!inv) throw new Error('invoice is not tracked by DuesPilot');
      if (!REMINDABLE.has(inv.status)) throw new Error(`invoice is ${inv.status}; nothing to remind`);
      await call('POST', `/v2/invoicing/invoices/${p.invoice_id}/remind`, { subject: p.subject, note: p.note, send_to_invoicer: false, send_to_recipient: true });
      const sent_on = await d.today();
      await d.store.update((s) => {
        s.invoices[p.invoice_id].reminders = [...(s.invoices[p.invoice_id].reminders ?? []), { sent_on, tone: p.tone }];
        audit(s, `reminder ${p.tone} #${p.step + 1} sent via PayPal for ${p.invoice_id}`);
      });
      return { reminded: p.invoice_id, tone: p.tone };
    },
  };
}
