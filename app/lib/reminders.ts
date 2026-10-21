// Reminder ladder. Schedule and tone are deterministic (persona cadence + reliability score); the LLM only writes the words.
import { generateObject, type LanguageModelV1 } from 'ai';
import { z } from 'zod';

export type Tone = 'friendly' | 'firm' | 'final';
const TONES: Tone[] = ['friendly', 'firm', 'final'];

// Pure ladder by score, at most one send per UTC day.
export function ladder(daysOverdue: number, score: number, lastSentAt: string | null, now: string): { tone: Tone } | null {
  if (daysOverdue <= 0) return null;
  if (lastSentAt && lastSentAt.slice(0, 10) === now.slice(0, 10)) return null;
  return { tone: score >= 80 ? 'friendly' : score >= 50 ? 'firm' : 'final' };
}

// Days after the due date on which reminder N goes out, per client persona (seed personalities).
export const CADENCE = {
  prompt: [3, 10],
  slow: [3, 10, 21],
  haggler: [3, 7, 14],
  ghost: [1, 4, 8, 15, 30],
  disputer: [5, 14],
} as const;
export type Persona = keyof typeof CADENCE;

const OPEN = new Set(['SENT', 'UNPAID', 'PARTIALLY_PAID', 'DISPUTED']);
const day = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const diff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export type NextReminder = { step: number; next_on: string; due_now: boolean; tone: Tone; days_overdue: number };

// Pure: invoice + persona + score + today -> next reminder slot, or null (paid / not overdue / ladder exhausted).
export function nextReminder(inv: { due_on: string; sent: string[]; status: string }, persona: Persona, score: number, today: string): NextReminder | null {
  if (!OPEN.has(inv.status)) return null;
  const overdue = diff(inv.due_on, today);
  if (overdue <= 0) return null;
  const steps = CADENCE[persona];
  const step = inv.sent.length;
  if (step >= steps.length) return null;
  const next_on = day(inv.due_on, steps[step]);
  const last = inv.sent.at(-1) ?? null;
  const byScore = ladder(overdue, score, last, today)?.tone ?? (score >= 80 ? 'friendly' : score >= 50 ? 'firm' : 'final');
  const tone = TONES[Math.max(Math.min(step, 2), TONES.indexOf(byScore))];
  return { step, next_on, due_now: today >= next_on && last !== today, tone, days_overdue: overdue };
}

// Plain text only: strip markup, links and emails; cap lengths (BLOCKER 4).
export function cleanReminderText(t: { subject: string; note: string }) {
  const clean = (s: string, n: number) => s.replace(/<[^>]*>/g, '').replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '')
    .replace(/\S+@\S+/g, '').replace(/[<>@]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
  return { subject: clean(t.subject, 100), note: clean(t.note, 600) };
}

export type ReminderCtx = { tone: Tone; persona: string; company: string; number: string; amount_usd: number; days_overdue: number };
const template = (c: ReminderCtx) => ({
  subject: `Invoice ${c.number} is ${c.days_overdue} day${c.days_overdue === 1 ? '' : 's'} overdue`,
  note: { friendly: `Hi ${c.company}, a friendly reminder that invoice ${c.number} for $${c.amount_usd} is now due. You can pay it from the PayPal link. Thanks!`,
    firm: `Hi ${c.company}, invoice ${c.number} for $${c.amount_usd} is ${c.days_overdue} days past due. Please pay it this week using the PayPal link.`,
    final: `Hi ${c.company}, invoice ${c.number} for $${c.amount_usd} is ${c.days_overdue} days past due. This is a final reminder; please pay now via the PayPal link.` }[c.tone],
});

export async function draftReminderText(model: LanguageModelV1, c: ReminderCtx, usage?: { prompt: number; completion: number }) {
  try {
    const r = await generateObject({
      model, mode: 'json', temperature: 0.3, maxTokens: 1500, schema: z.object({ subject: z.string(), note: z.string() }),
      system: `You write a short payment reminder email from a freelancer to a client. Tone: ${c.tone} (friendly = warm nudge, firm = clear and direct, final = last notice, still polite).
Plain text only, no links, no email addresses, under 80 words. The PayPal invoice already contains the pay button. Return JSON {subject, note}.`,
      prompt: `Client: ${c.company} (payment habit: ${c.persona}). Invoice ${c.number}, $${c.amount_usd} USD, ${c.days_overdue} days overdue.`,
    });
    if (usage) { usage.prompt += r.usage.promptTokens || 0; usage.completion += r.usage.completionTokens || 0; }
    const t = cleanReminderText(r.object);
    if (t.subject && t.note) return { ...t, source: 'llm' as const };
  } catch { /* fall through to the deterministic template */ }
  return { ...cleanReminderText(template(c)), source: 'template' as const };
}
