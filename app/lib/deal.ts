// Agreed deal -> two invoice drafts: deposit (due on receipt) + balance (net-N, early-pay discount).
import type { z } from 'zod';
import type { Deal } from './schemas';
import { addDays, type Draft } from './draft';

export function dealToDrafts(deal: z.infer<typeof Deal>, o: { recipient: string; project: string; today: string }): Draft[] {
  const common = { recipient_email: o.recipient, currency: 'USD' as const, invoice_date: o.today };
  return [
    { ...common, item_name: `${o.project}: ${deal.deposit_pct}% deposit`, amount_usd: deal.deposit_usd, due_date: o.today,
      discount_pct: 0, discount_until: null, note: `Deposit agreed by DuesPilot negotiation (${deal.rounds} rounds). Sandbox demo.` },
    { ...common, item_name: `${o.project}: balance`, amount_usd: deal.balance_usd, due_date: addDays(o.today, deal.balance_net_days),
      discount_pct: deal.early_pay_discount_pct, discount_until: deal.early_pay_discount_pct ? addDays(o.today, deal.early_pay_window_days) : null,
      note: `Balance net-${deal.balance_net_days}. ${deal.early_pay_discount_pct}% off if paid within ${deal.early_pay_window_days} days. Sandbox demo.` },
  ];
}
