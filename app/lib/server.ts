// Wiring used by route handlers and the smoke script (server only).
import 'server-only';
import { config } from './config';
import { fileStore, audit } from './store';
import { loadSeed, clientRows } from './seed';
import { negotiate } from './negotiate';
import { makeArTurn, nebiusModel } from './llm';
import { dealToDrafts } from './deal';
import { draftSchema, issuesOf } from './draft';
import { createPending, approve } from './actions';
import { createAndSend, getInvoice } from './paypal';

export const store = fileStore();

export async function runNegotiation(clientId: string, totalUsd: number, project: string) {
  const c = config();
  const seed = loadSeed();
  if (!seed.ap_policies.some((p) => p.client_id === clientId)) throw new Error('client has no AP agent');
  const row = clientRows(seed).find((r) => r.id === clientId)!;
  const usage = { prompt: 0, completion: 0 };
  const arTurn = makeArTurn(nebiusModel(c.nebiusKey, c.model), { m: seed.mandate, totalUsd, clientId,
    history: `${row.invoices} invoices, avg ${row.avg_days_late} days late (seeded)`, usage });
  const r = await negotiate({ seed, clientId, totalUsd, arTurn });
  const today = new Date().toISOString().slice(0, 10);
  const drafts = r.deal ? dealToDrafts(r.deal, { recipient: c.buyerEmail, project, today }) : [];
  const S = draftSchema(c.allowedDomain);
  const bad = drafts.flatMap((d) => { const p = S.safeParse(d); return p.success ? [] : issuesOf(p.error); });
  if (bad.length) throw new Error('deal failed draft schema: ' + bad.join('; '));
  const pending = drafts.length ? createPending(store, 'send_invoices', { negotiation: { clientId, totalUsd, project }, drafts }) : null;
  const s = store.read();
  const nid = pending?.id ?? crypto.randomUUID();
  s.negotiations[nid] = { clientId, totalUsd, project, score: r.score, deal: r.deal, rounds: r.rounds.map(({ raw, ...x }) => x), usage, model: c.model, at: new Date().toISOString() };
  audit(s, `negotiation ${clientId} $${totalUsd}: ${r.deal ? `deal in ${r.deal.rounds} rounds` : 'no deal'}`);
  store.write(s);
  return { score: r.score, rounds: r.rounds, deal: r.deal, drafts, pending, usage };
}

export async function approveSend(id: string, hash: string) {
  const c = config();
  return approve(store, id, hash, async (payload: { drafts: unknown[] }) => {
    const S = draftSchema(c.allowedDomain);
    const drafts = payload.drafts.map((d) => S.parse(d)); // re-validate at execution time
    const out = [];
    for (const [i, d] of drafts.entries()) {
      const v = await createAndSend(d);
      const s = store.read();
      s.invoices[v.id] = { ...v, role: i === 0 ? 'deposit' : 'balance', negotiation_id: id, updated_at: new Date().toISOString() };
      audit(s, `invoice ${v.id} (${i === 0 ? 'deposit' : 'balance'} $${v.amount_usd}) created+sent -> ${v.status}`);
      store.write(s);
      out.push(v);
    }
    return { invoices: out };
  });
}

// Polling fallback for when no public webhook URL exists (local dev): re-fetch every tracked invoice.
export async function refreshInvoices() {
  const s = store.read();
  for (const id of Object.keys(s.invoices)) {
    const v = await getInvoice(id);
    if (v.status !== s.invoices[id].status) audit(s, `poll ${id}: ${s.invoices[id].status} -> ${v.status}`);
    Object.assign(s.invoices[id], { status: v.status, amount_usd: v.amount_usd, pay_link: v.pay_link ?? s.invoices[id].pay_link, updated_at: new Date().toISOString() });
  }
  store.write(s);
  return s.invoices;
}
