import { test } from 'node:test';
import assert from 'node:assert/strict';
import { negotiate, apRespond } from '../lib/negotiate';
import { dealToDrafts } from '../lib/deal';
import { draftSchema } from '../lib/draft';
import { loadSeed } from '../lib/seed';

const seed = loadSeed();
const ap = seed.ap_policies[0];
const base = { deposit_pct: 40, balance_net_days: 15, early_pay_discount_pct: 2, early_pay_window_days: 5, message: 'ok' };

test('AP policy counters the first offer and accepts a compliant later one', () => {
  assert.equal(apRespond(base, ap, 1).accept, false);
  assert.equal(apRespond(base, ap, 2).accept, true);
});

test('below-floor offers never reach the AP agent; loop stops at 3 rounds', async () => {
  const r = await negotiate({ seed, clientId: 'haggler', totalUsd: 3200, arTurn: async () => ({ offer: { ...base, deposit_pct: 10 }, toolCalls: [] }) });
  assert.equal(r.deal, null);
  assert.equal(r.rounds.length, 3);
  assert.ok(r.rounds.every((x) => x.violations.length > 0 && x.ap === null));
});

test('final terms become deposit + balance drafts that pass the draft schema', async () => {
  const r = await negotiate({ seed, clientId: 'haggler', totalUsd: 3200, arTurn: async () => ({ offer: base, toolCalls: [] }) });
  assert.ok(r.deal);
  const drafts = dealToDrafts(r.deal!, { recipient: 'sb-x@personal.example.com', project: 'Storefront redesign', today: '2026-10-21' });
  assert.equal(drafts.length, 2);
  const S = draftSchema('personal.example.com');
  for (const d of drafts) assert.ok(S.safeParse(d).success, JSON.stringify(S.safeParse(d).error?.issues));
  assert.deepEqual(drafts.map((d) => d.amount_usd), [1280, 1920]);
  assert.equal(drafts[1].due_date, '2026-11-05');
  assert.equal(drafts[1].discount_pct, 2);
  assert.equal(drafts[1].discount_until, '2026-10-26');
  assert.equal(drafts[0].due_date, '2026-10-21');
});

test('personas: the eval AP-agent personas are selectable, swap only the policy, and feasibility comes from exhaustive search', async () => {
  const { personas, withPersona } = await import('../lib/personas'); const PERSONAS = personas();
  const seed = loadSeed();
  assert.ok(PERSONAS.length >= 10);
  const p = PERSONAS.find((x) => /10% off/.test(x.label))!;
  const s2 = withPersona(seed, p.id);
  assert.equal(s2.ap_policies.length, seed.ap_policies.length);
  assert.equal(s2.ap_policies.find((x) => x.client_id === p.client_id)!.discount_pct_required_if_net_under_30, 10);
  assert.equal(p.feasible, false); // mandate caps the discount at 3%: no deal exists
  assert.equal(PERSONAS.find((x) => x.id === 'N02')!.feasible, true);
  assert.throws(() => withPersona(seed, 'nope'));
});
