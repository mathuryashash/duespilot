// Wiring used by route handlers and the smoke script (server only).
import 'server-only';
import { config, loadRootEnv } from './config';
import path from 'node:path';
import { sqliteStore, audit, type Store } from './store';
import { refreshAll } from './refresh';
import { resetDemo as reset } from './reset';
import { loadSeed, clientRows } from './seed';
import { negotiate, checkStats } from './negotiate';
import { forecast } from './forecast';
import { personas, withPersona } from './personas';
import { makeArTurn, nebiusModel } from './llm';
import { dealToDrafts } from './deal';
import { draftSchema, issuesOf } from './draft';
import { createPending, approve } from './actions';
import { getInvoice, setWriteLogger } from './paypal';
import { makeExecutors } from './executors';
import { draftFromBrief } from './intake';
import { nextReminder, draftReminderText, type Persona } from './reminders';
import { readOnlyToolkit } from './toolkit';
import { listDisputes } from './disputes';

// One SQLite connection per process (globalThis survives Next dev hot reloads). DATABASE_PATH points at a Render disk.
// Opened on first use, not at import: `next build` imports every route module, and the Render disk is not mounted then.
loadRootEnv();
const g = globalThis as { __dpStore?: Store };
const db = (): Store => g.__dpStore ??= sqliteStore(process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data', 'duespilot.db'),
  path.resolve(process.cwd(), 'data', 'state.json'));
export const store: Store = { read: async () => db().read(), update: async (fn) => db().update(fn) };
// Activity log: every PayPal write lands in state.paypal_log with its PayPal-Request-Id and debug id.
setWriteLogger((l) => { void store.update((s) => { s.paypal_log.push(l); }); });

// Simulated clock ("Advance clock" button), labelled in the UI.
export const today = async () => new Date(Date.now() + (await store.read()).clock_days * 86_400_000).toISOString().slice(0, 10);
export function advanceClock(days: number) {
  return store.update((s) => {
    s.clock_days = days === 0 ? 0 : s.clock_days + days;
    audit(s, `simulated clock ${days === 0 ? 'reset' : `+${days}d`} -> offset ${s.clock_days}d`);
    return s.clock_days;
  });
}
export const resetDemo = (all = false) => reset(store, { all });
const executors = () => makeExecutors({ store, allowedDomain: config().allowedDomain, today });

export async function runNegotiation(clientId: string, totalUsd: number, project: string, personaId?: string) {
  const c = config();
  const seed = personaId ? withPersona(loadSeed(), personaId) : loadSeed();
  const persona = personaId ? personas().find((p) => p.id === personaId) : undefined;
  if (persona && persona.client_id !== clientId) throw new Error('persona belongs to another client');
  if (!seed.ap_policies.some((p) => p.client_id === clientId)) throw new Error('client has no AP agent');
  const row = clientRows(seed).find((r) => r.id === clientId)!;
  const usage = { prompt: 0, completion: 0 };
  const arTurn = makeArTurn(nebiusModel(c.nebiusKey, c.model), { m: seed.mandate, totalUsd, clientId,
    history: `${row.invoices} invoices, avg ${row.avg_days_late} days late (seeded)`, usage });
  const r = await negotiate({ seed, clientId, totalUsd, arTurn });
  const drafts = r.deal ? dealToDrafts(r.deal, { recipient: c.buyerEmail, project, today: new Date().toISOString().slice(0, 10) }) : [];
  const S = draftSchema(c.allowedDomain);
  const bad = drafts.flatMap((d) => { const p = S.safeParse(d); return p.success ? [] : issuesOf(p.error); });
  if (bad.length) throw new Error('deal failed draft schema: ' + bad.join('; '));
  const pending = drafts.length ? await createPending(store, 'send_invoices', { negotiation: { clientId, totalUsd, project }, client_id: clientId, drafts }) : null;
  const nid = pending?.id ?? crypto.randomUUID();
  const checks = checkStats(r.rounds);
  await store.update((s) => {
    s.negotiations[nid] = { clientId, totalUsd, project, persona: persona?.label, score: r.score, deal: r.deal, rounds: r.rounds.map(({ raw, ...x }) => x), checks, usage, model: c.model, at: new Date().toISOString() };
    audit(s, `negotiation ${clientId}${persona ? ` (persona: ${persona.label})` : ''} $${totalUsd}: ${r.deal ? `deal in ${r.deal.rounds} rounds` : 'no deal'}; server check rejected ${checks.rejected} of ${checks.proposed} offers, model fixed ${checks.fixed}`);
  });
  return { score: r.score, rounds: r.rounds, deal: r.deal, drafts, pending, usage, checks, persona: persona && { label: persona.label, feasible: persona.feasible } };
}

export async function approveSend(id: string, hash: string) {
  const p = (await store.read()).pending[id];
  const ex = executors();
  const exec = p?.kind === 'send_reminder' ? ex.send_reminder : ex.send_invoices;
  return approve(store, id, hash, exec as (x: any) => Promise<unknown>);
}

// Brief -> one validated invoice draft -> pending action (same approval gate as negotiation).
export async function runIntake(brief: string) {
  const c = config();
  const seed = loadSeed();
  const usage = { prompt: 0, completion: 0 };
  const r = await draftFromBrief(nebiusModel(c.nebiusKey, c.model), brief, { today: new Date().toISOString().slice(0, 10), allowedDomain: c.allowedDomain, buyerEmail: c.buyerEmail, clients: seed.clients }, usage);
  const retried = r.attempts.length > 1 ? `; server check rejected the model's first extraction (${r.attempts[0].issues.join('; ').slice(0, 120)})${r.ok ? ', model fixed it' : ''}` : '';
  await store.update((s) => audit(s, (r.ok ? `intake: draft for ${r.client.company} $${r.draft.amount_usd}` : `intake BLOCKED: ${r.issues.join('; ').slice(0, 200)}`) + retried + (r.ok && r.warnings.length ? `; warning: ${r.warnings.join('; ')}` : '')));
  if (!r.ok) return { ok: false as const, issues: r.issues, attempts: r.attempts, usage };
  // Warnings ride in the pending payload so the approval card shows them; they are part of the hashed payload, never executed.
  const pending = await createPending(store, 'send_invoices', { client_id: r.client.id, drafts: [r.draft], ...(r.warnings.length ? { warnings: r.warnings } : {}) });
  return { ok: true as const, client: { id: r.client.id, company: r.client.company }, draft: r.draft, warnings: r.warnings, attempts: r.attempts, pending, usage };
}

// Reminder plan: live tracked invoices (sendable via PayPal) + seeded unpaid invoices (simulated, plan only).
export async function reminderPlan() {
  const seed = loadSeed();
  const rows = clientRows(seed);
  const s = await store.read();
  const t = await today();
  const persona = (id?: string) => (id && id in { prompt: 1, slow: 1, haggler: 1, ghost: 1, disputer: 1 } ? id as Persona : 'slow');
  const live = Object.values(s.invoices).filter((i) => i.status !== 'CANCELLED').map((i) => {
    const cid = i.client_id ?? (s.negotiations[i.negotiation_id ?? ''] as { clientId?: string } | undefined)?.clientId;
    const row = rows.find((r) => r.id === cid);
    const plan = i.due_on ? nextReminder({ due_on: i.due_on, sent: (i.reminders ?? []).map((x) => x.sent_on), status: i.status }, persona(cid), row?.score ?? 60, t) : null;
    return { source: 'paypal', invoice_id: i.id, number: i.number, client: row?.company ?? '?', persona: persona(cid), score: row?.score ?? null, amount_usd: i.amount_usd, status: i.status, due_on: i.due_on ?? null, sent: (i.reminders ?? []).length, plan };
  });
  const seeded = seed.invoices.filter((i) => i.status !== 'PAID').map((i) => {
    const row = rows.find((r) => r.id === i.client_id)!;
    return { source: 'seeded', invoice_id: i.id, number: i.id, client: row.company, persona: i.client_id as Persona, score: row.score, amount_usd: i.amount_usd - i.paid_usd, status: i.status, due_on: i.due_on, sent: i.reminders.length,
      plan: nextReminder({ due_on: i.due_on, sent: i.reminders.map((x) => x.sent_on), status: i.status === 'UNPAID' ? 'SENT' : i.status }, i.client_id as Persona, row.score, t) };
  });
  return { today: t, clock_days: s.clock_days, rows: [...live, ...seeded] };
}

// Nemotron writes the words; schedule/tone are deterministic; sending goes through the approval gate.
export async function draftReminder(invoiceId: string) {
  const c = config();
  const row = (await reminderPlan()).rows.find((r) => r.source === 'paypal' && r.invoice_id === invoiceId);
  if (!row) throw new Error('not a tracked PayPal invoice');
  if (!row.plan?.due_now) throw new Error(row.plan ? `next reminder is scheduled for ${row.plan.next_on}` : 'no reminder due (paid, not overdue, or ladder finished)');
  const usage = { prompt: 0, completion: 0 };
  const text = await draftReminderText(nebiusModel(c.nebiusKey, c.model), { tone: row.plan.tone, persona: row.persona, company: row.client, number: row.number ?? invoiceId, amount_usd: row.amount_usd, days_overdue: row.plan.days_overdue }, usage);
  const payload = { invoice_id: invoiceId, subject: text.subject, note: text.note, tone: row.plan.tone, step: row.plan.step };
  const pending = await createPending(store, 'send_reminder', payload);
  const rejected = text.attempts.filter((a) => a.issues.length);
  await store.update((s) => audit(s, `reminder draft ${row.number ?? invoiceId} (${row.plan!.tone}): ${text.source}${rejected.length ? `; checker rejected ${rejected.length}: ${rejected.map((a) => a.issues.join(', ')).join(' | ').slice(0, 160)}` : '; passed the checker first time'}`));
  return { payload, source: text.source, attempts: text.attempts, pending, usage };
}

// Expected cash per week, net of PayPal's fee, from open invoices (tracked PayPal + seeded) and each client's history.
export async function cashForecast() {
  const plan = await reminderPlan();
  const rows = clientRows(loadSeed());
  const OPEN = new Set(['SENT', 'UNPAID', 'PARTIALLY_PAID', 'DISPUTED', 'SCHEDULED']);
  const input = plan.rows.filter((r) => OPEN.has(r.status) && r.due_on && r.amount_usd > 0).map((r) => {
    const c = rows.find((x) => x.company === r.client);
    return { client: r.client, amount_usd: r.amount_usd, due_on: r.due_on!, score: r.score, avg_days_late: c?.avg_days_late ?? 0 };
  });
  return { today: plan.today, ...forecast(input, plan.today, 6), invoices: input.length };
}

export async function disputes() {
  const c = config();
  return listDisputes(readOnlyToolkit(c.clientId, c.clientSecret).getTools() as any);
}

// Poll fallback = source of truth when no webhook arrives (local dev, or webhook down): re-fetch tracked invoices.
// The scheduled poller (instrumentation.ts) checks only unsettled ones; the Refresh button re-checks all.
export async function refreshInvoices(all = true) {
  const r = await refreshAll(store, getInvoice, { all });
  return { ...r, invoices: (await store.read()).invoices };
}
