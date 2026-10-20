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
