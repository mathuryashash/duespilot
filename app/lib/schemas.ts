// Shared zod schemas for seed data, mandate, AP policy, offers and the final deal.
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pct = z.number().min(0).max(100);
export const PERSONALITIES = ['prompt', 'slow', 'haggler', 'ghost', 'disputer'] as const;

export const Reminder = z.object({ sent_on: isoDate, tone: z.enum(['friendly', 'firm', 'final']) });

export const Invoice = z.object({
  id: z.string(),
  client_id: z.enum(PERSONALITIES),
  currency: z.literal('USD'),
  amount_usd: z.number().positive().max(10_000),
  issued_on: isoDate,
  due_on: isoDate,
  paid_on: isoDate.nullable(),
  status: z.enum(['PAID', 'UNPAID', 'PARTIALLY_PAID', 'DISPUTED']),
  paid_usd: z.number().min(0),
  reminders: z.array(Reminder),
  note: z.string().optional(),
}).superRefine((inv, ctx) => {
  const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
  if (days(inv.issued_on, inv.due_on) < 0 || days(inv.issued_on, inv.due_on) > 90) ctx.addIssue({ code: 'custom', message: `${inv.id}: due must be 0..90 d after issue` });
  if (inv.paid_on && inv.paid_on < inv.issued_on) ctx.addIssue({ code: 'custom', message: `${inv.id}: paid before issued` });
  if ((inv.status === 'PAID') !== (inv.paid_usd === inv.amount_usd && inv.paid_on !== null)) ctx.addIssue({ code: 'custom', message: `${inv.id}: PAID iff fully paid with a date` });
  if (inv.paid_usd > inv.amount_usd) ctx.addIssue({ code: 'custom', message: `${inv.id}: overpaid` });
});

export const Client = z.object({
  id: z.enum(PERSONALITIES),
  name: z.string(),
  company: z.string(),
  country: z.string(),
  email: z.string().email(),
  personality: z.string(),
});

// Freelancer's mandate: hard limits the AR agent may never cross (server re-checks them).
export const Mandate = z.object({
  freelancer: z.string(),
  currency: z.literal('USD'),
  max_rounds: z.number().int().min(1).max(3),
  deposit_pct_min: pct,
  deposit_pct_min_if_score_below_70: pct,
  balance_net_days_max: z.number().int().min(0).max(90),
  balance_net_days_max_if_score_below_70: z.number().int().min(0).max(90),
  early_pay_discount_pct_max: z.number().min(0).max(20),
  early_pay_window_days_max: z.number().int().min(1).max(30),
});

// Client's AP-agent policy (the haggler).
export const ApPolicy = z.object({
  client_id: z.enum(PERSONALITIES),
  budget_cycle: z.string(),
  opening_ask: z.object({ deposit_pct: pct, balance_net_days: z.number().int(), early_pay_discount_pct: z.number() }),
  deposit_pct_max: pct,
  balance_net_days_min: z.number().int(),
  discount_pct_required_if_net_under_30: z.number(),
  always_counter_first_offer: z.boolean(),
});

export const Seed = z.object({
  as_of: isoDate,
  note: z.string(),
  clients: z.array(Client).length(5),
  invoices: z.array(Invoice).min(20),
  mandate: Mandate,
  ap_policies: z.array(ApPolicy).min(1),
});

// One offer = what the AR agent proposes via the propose_terms tool.
export const Offer = z.object({
  deposit_pct: pct,
  balance_net_days: z.number().int().min(0).max(90),
  early_pay_discount_pct: z.number().min(0).max(20),
  early_pay_window_days: z.number().int().min(1).max(30),
  message: z.string().max(600),
});

export const Deal = z.object({
  client_id: z.enum(PERSONALITIES),
  currency: z.literal('USD'),
  total_usd: z.number().positive().max(10_000),
  deposit_pct: pct,
  deposit_usd: z.number().positive(),
  balance_usd: z.number().min(0),
  balance_net_days: z.number().int().min(0).max(90),
  early_pay_discount_pct: z.number().min(0).max(20),
  early_pay_window_days: z.number().int().min(1).max(30),
  rounds: z.number().int().min(1).max(3),
}).refine((d) => Math.abs(d.deposit_usd + d.balance_usd - d.total_usd) < 0.01, 'deposit + balance must equal total');

// Plan §3 formula. ghost = still unpaid > 60 d past due.
export function reliabilityScore(invoices: z.infer<typeof Invoice>[], asOf: string): number {
  const d = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  const paid = invoices.filter((i) => i.paid_on);
  const avgLate = paid.length ? paid.reduce((s, i) => s + Math.max(0, d(i.due_on, i.paid_on!)), 0) / paid.length : 0;
  const ghosts = invoices.filter((i) => !i.paid_on && d(i.due_on, asOf) > 60).length;
  return Math.max(0, Math.min(100, Math.round(100 - 4 * avgLate - 15 * ghosts)));
}

// Server-side mandate check: returns violations (empty = OK). Never trust the LLM to self-police.
export function mandateViolations(o: z.infer<typeof Offer>, m: z.infer<typeof Mandate>, score: number): string[] {
  const low = score < 70;
  const depMin = low ? m.deposit_pct_min_if_score_below_70 : m.deposit_pct_min;
  const netMax = low ? m.balance_net_days_max_if_score_below_70 : m.balance_net_days_max;
  const v: string[] = [];
  if (o.deposit_pct < depMin) v.push(`deposit ${o.deposit_pct}% < floor ${depMin}%`);
  if (o.balance_net_days > netMax) v.push(`net ${o.balance_net_days} d > max ${netMax} d`);
  if (o.early_pay_discount_pct > m.early_pay_discount_pct_max) v.push(`discount ${o.early_pay_discount_pct}% > max ${m.early_pay_discount_pct_max}%`);
  if (o.early_pay_window_days > m.early_pay_window_days_max) v.push(`window ${o.early_pay_window_days} d > max ${m.early_pay_window_days_max} d`);
  return v;
}
