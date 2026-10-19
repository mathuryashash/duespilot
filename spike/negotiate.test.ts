import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Seed, type Offer } from './schemas.ts';
import type { z } from 'zod';
import { negotiate, apRespond } from './negotiate.ts';

const seed = Seed.parse(JSON.parse(readFileSync(new URL('../seed/seed.json', import.meta.url), 'utf8')));
const ap = seed.ap_policies[0];
const base = { deposit_pct: 40, balance_net_days: 15, early_pay_discount_pct: 2, early_pay_window_days: 5, message: 'ok' };

test('AP policy always counters the first offer, accepts a compliant later one', () => {
  assert.equal(apRespond(base, ap, 1).accept, false);
  assert.equal(apRespond(base, ap, 2).accept, true);
  assert.equal(apRespond({ ...base, deposit_pct: 50 }, ap, 2).accept, false);
});

test('below-floor offers are rejected server-side and never reach the AP agent; stops at 3 rounds', async () => {
  const offers: z.infer<typeof Offer>[] = [{ ...base, deposit_pct: 10 }, { ...base, deposit_pct: 10 }, { ...base, deposit_pct: 10 }, base];
  let i = 0;
  const r = await negotiate({ seed, clientId: 'haggler', totalUsd: 3200, arTurn: async () => ({ offer: offers[i++], toolCalls: [] }) });
  assert.equal(r.deal, null);
  assert.equal(r.rounds.length, 3);
  assert.ok(r.rounds.every((x) => x.violations.length > 0 && x.ap === null));
});

test('compliant offers settle into a zod-valid deal', async () => {
  const r = await negotiate({ seed, clientId: 'haggler', totalUsd: 3200, arTurn: async () => ({ offer: base, toolCalls: [] }) });
  assert.equal(r.rounds.length, 2);
  assert.deepEqual(r.deal && [r.deal.deposit_usd, r.deal.balance_usd, r.deal.rounds], [1280, 1920, 2]);
});
