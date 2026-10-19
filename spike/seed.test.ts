import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Seed, PERSONALITIES, reliabilityScore, mandateViolations } from './schemas.ts';

const raw = JSON.parse(readFileSync(new URL('../seed/seed.json', import.meta.url), 'utf8'));

test('seed.json matches the schema', () => {
  const r = Seed.safeParse(raw);
  assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues.slice(0, 5), null, 1));
});

test('5 personalities, each with >=4 invoices spanning ~6 months', () => {
  const s = Seed.parse(raw);
  assert.deepEqual(s.clients.map((c) => c.id).sort(), [...PERSONALITIES].sort());
  for (const p of PERSONALITIES) assert.ok(s.invoices.filter((i) => i.client_id === p).length >= 4, p);
  const dates = s.invoices.map((i) => i.issued_on).sort();
  const months = (Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / 86_400_000 / 30;
  assert.ok(months >= 5 && months <= 6.5, `span ${months.toFixed(1)} months`);
  assert.equal(new Set(s.invoices.map((i) => i.id)).size, s.invoices.length, 'unique invoice ids');
});

test('personalities produce the intended scores (haggler = 62 for demo moment 2)', () => {
  const s = Seed.parse(raw);
  const score = (p: string) => reliabilityScore(s.invoices.filter((i) => i.client_id === p), s.as_of);
  assert.ok(score('prompt') >= 95, `prompt ${score('prompt')}`);
  assert.equal(score('haggler'), 62);
  assert.ok(score('slow') < score('haggler'), `slow ${score('slow')}`);
  assert.ok(score('ghost') < 50, `ghost ${score('ghost')}`);
  assert.ok(s.invoices.some((i) => i.client_id === 'disputer' && i.status === 'DISPUTED'));
});

test('a deal exists inside both the mandate and the haggler policy', () => {
  const s = Seed.parse(raw);
  const ap = s.ap_policies.find((p) => p.client_id === 'haggler')!;
  const offer = { deposit_pct: ap.deposit_pct_max, balance_net_days: ap.balance_net_days_min, early_pay_discount_pct: ap.discount_pct_required_if_net_under_30, early_pay_window_days: 5, message: '' };
  assert.deepEqual(mandateViolations(offer, s.mandate, 62), []);
  assert.ok(mandateViolations({ ...offer, deposit_pct: 20 }, s.mandate, 62).length > 0, 'floor enforced');
});
