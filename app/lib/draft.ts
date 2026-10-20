// Server-side invoice draft limits (BLOCKER 4). Every write payload passes this before and at execution.
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
export const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

// Loose shape the LLM fills; the strict schema below decides.
export const DraftShape = z.object({
  recipient_email: z.string(), currency: z.string(), item_name: z.string(), amount_usd: z.number(),
  invoice_date: z.string(), due_date: z.string(), discount_pct: z.number(), discount_until: z.string().nullable(), note: z.string(),
});

export const draftSchema = (domain: string) => z.object({
  recipient_email: z.string().email().max(254).refine((e) => e.toLowerCase().endsWith('@' + domain.toLowerCase()), 'recipient not on allowlist'),
  currency: z.literal('USD'),
  item_name: z.string().min(1).max(200),
  amount_usd: z.number().positive().max(10_000).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'max 2 decimals'),
  invoice_date: isoDate,
  due_date: isoDate,
  discount_pct: z.number().min(0).max(20),
  discount_until: isoDate.nullable(),
  note: z.string().max(600),
}).superRefine((d, ctx) => {
  const due = days(d.invoice_date, d.due_date);
  if (!(due >= 0 && due <= 90)) ctx.addIssue({ code: 'custom', path: ['due_date'], message: 'due date must be 0..90 days after invoice date' });
  if ((d.discount_pct > 0) !== (d.discount_until !== null)) ctx.addIssue({ code: 'custom', path: ['discount_until'], message: 'discount needs an end date (and vice versa)' });
  if (d.discount_until && !(d.discount_until >= d.invoice_date && d.discount_until <= d.due_date)) ctx.addIssue({ code: 'custom', path: ['discount_until'], message: 'discount must end between invoice and due date' });
});
export type Draft = z.infer<ReturnType<typeof draftSchema>>;
export const issuesOf = (e: z.ZodError) => e.issues.map((i) => `${i.path.join('.') || 'draft'}: ${i.message}`);
