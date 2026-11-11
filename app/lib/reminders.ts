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
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
export const templateReminder = (c: ReminderCtx) => ({
  subject: `Invoice ${c.number} is ${days(c.days_overdue)} overdue`,
  note: { friendly: `Hi ${c.company}, a friendly reminder that invoice ${c.number} for $${c.amount_usd} was due ${days(c.days_overdue)} ago. You can pay it from the PayPal invoice. Thanks!`,
    firm: `Hi ${c.company}, invoice ${c.number} for $${c.amount_usd} is ${days(c.days_overdue)} past due. Please pay it this week from the PayPal invoice.`,
    final: `Hi ${c.company}, invoice ${c.number} for $${c.amount_usd} is ${days(c.days_overdue)} past due. This is a final reminder; please pay it now from the PayPal invoice.` }[c.tone],
});

// Plain-code checker for a reminder draft. The model writes; this decides. Empty = OK.
const SOFT = /friendly reminder|gentle reminder|just a (quick )?(reminder|nudge|note)|no rush|no pressure|whenever (you|it'?s)|when you get a chance|just checking in|at your convenience/i;
const THREAT = /legal action|lawyer|attorney|\bcourt\b|collections?\b|\bsue\b|late fee|penalt|interest (charge|of|will)|credit (score|bureau|rating)|report you|blacklist/i;
const amounts = (s: string) => (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((x) => Number(x.replace(/,/g, '')));
export function reminderIssues(t: { subject: string; note: string }, c: ReminderCtx): string[] {
  const all = `${t.subject}\n${t.note}`;
  const v: string[] = [];
  if (!all.includes(c.number)) v.push(`missing the invoice number ${c.number}`);
  if (!amounts(all).some((a) => Math.abs(a - c.amount_usd) < 0.005)) v.push(`missing the exact amount $${c.amount_usd}`);
  if (c.tone !== 'friendly' && !new RegExp(`\\b${c.days_overdue}\\s*days?\\b`, 'i').test(all)) v.push(`missing how many days overdue (${c.days_overdue})`);
  const soft = all.match(SOFT);
  if (c.tone !== 'friendly' && soft) v.push(`soft wording "${soft[0]}" in a ${c.tone} reminder`);
  const threat = all.match(THREAT);
  if (threat) v.push(`threat or invented fee "${threat[0]}" (not in the freelancer's terms)`);
  if (c.tone === 'final' && !/\bfinal\b|last (notice|reminder)/i.test(all)) v.push('final reminder must say it is the final notice');
  if (c.tone !== 'final' && /\bfinal\b|last (notice|reminder)/i.test(all)) v.push(`only the final step may say "final" (this is ${c.tone})`);
  if (t.note.split(/\s+/).length > 90) v.push('longer than 90 words');
  return v;
}

export type Attempt = { subject?: string; note?: string; issues: string[] };
// Model drafts -> checker -> one retry with the checker's reasons -> deterministic template (which always passes).
export async function draftReminderText(model: LanguageModelV1, c: ReminderCtx, usage?: { prompt: number; completion: number }) {
  const attempts: Attempt[] = [];
  const system = `You write a short payment reminder email from a freelancer to a client. Tone: ${c.tone} (friendly = warm nudge, firm = clear and direct, final = last notice, still polite).
Must include the invoice number, the exact amount and${c.tone === 'friendly' ? '' : ' the number of days overdue, and'} no threats, fees or penalties.${c.tone === 'final' ? ' Say this is the final reminder.' : ' Do not call it final.'}
Plain text only, no links, no email addresses, under 80 words. The PayPal invoice already contains the pay button. Return JSON {subject, note}.`;
  const base = `Client: ${c.company} (payment habit: ${c.persona}). Invoice ${c.number}, $${c.amount_usd} USD, ${c.days_overdue} days overdue.`;
  for (let i = 0; i < 2; i++) {
    const prev = attempts.at(-1);
    try {
      const r = await generateObject({
        model, mode: 'json', temperature: 0.3, maxTokens: 1500, schema: z.object({ subject: z.string(), note: z.string() }), system,
        prompt: prev ? `${base}\nYour previous draft was rejected by the checker: ${prev.issues.join('; ')}.\nPrevious draft: ${JSON.stringify({ subject: prev.subject, note: prev.note })}\nWrite a corrected draft.` : base,
      });
      if (usage) { usage.prompt += r.usage.promptTokens || 0; usage.completion += r.usage.completionTokens || 0; }
      const t = cleanReminderText(r.object);
      const issues = t.subject && t.note ? reminderIssues(t, c) : ['empty subject or note'];
      attempts.push({ ...t, issues });
      if (!issues.length) return { ...t, source: i === 0 ? 'llm' as const : 'llm-retry' as const, attempts };
    } catch (e) { attempts.push({ issues: [`model error: ${String((e as Error).message).slice(0, 80)}`] }); break; }
  }
  return { ...cleanReminderText(templateReminder(c)), source: 'template' as const, attempts };
}
