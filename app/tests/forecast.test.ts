import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forecast, paypalFee } from '../lib/forecast';

test('PayPal India receiving fee: 4.4% + $0.30 per payment', () => {
  assert.equal(paypalFee(1000), 44.3);
  assert.equal(paypalFee(0), 0);
});

const rows = [
  { client: 'A', amount_usd: 1000, due_on: '2026-11-12', score: 100, avg_days_late: 0 },
  { client: 'B', amount_usd: 2000, due_on: '2026-11-01', score: 40, avg_days_late: 15 },  // expected 11-16
  { client: 'C', amount_usd: 500, due_on: '2026-10-01', score: 0, avg_days_late: 21 },   // long overdue -> week 1, tiny weight
];

test('forecast: weekly buckets, expected = amount x on-time weight, net of fee', () => {
  const f = forecast(rows, '2026-11-11', 6);
  assert.equal(f.weeks.length, 6);
  assert.equal(f.weeks[0].start, '2026-11-11');
  const w0 = f.weeks[0];
  // A lands in week 0 (due 11-12, 0 days late), weight 0.98 cap
  assert.ok(w0.byClient.A > 0);
  // B expected 11-16 -> week 0 (11-11..11-17)
  assert.ok(w0.byClient.B > 0 && w0.byClient.B < 2000);
  const total = f.weeks.reduce((s, w) => s + w.expected_net, 0) + f.at_risk_usd;
  assert.ok(total < 3500, 'fees + risk are taken out');
  assert.ok(f.at_risk_usd > 0);
});

test('forecast: weights clamp to [0.05, 0.98] and fee is per invoice', () => {
  const f = forecast([{ ...rows[2], due_on: '2026-10-21' }], '2026-11-11', 6); // score 0, still inside its 21-day pattern
  const exp = 0.05 * (500 - (500 * 0.044 + 0.30)); // 23.885
  assert.ok(Math.abs(f.weeks[0].expected_net - exp) < 0.01, String(f.weeks[0].expected_net));
});

test('forecast: payments expected after the horizon go to "later", not dropped', () => {
  const f = forecast([{ client: 'D', amount_usd: 800, due_on: '2027-03-01', score: 100, avg_days_late: 0 }], '2026-11-11', 6);
  assert.equal(f.weeks.reduce((s, w) => s + w.expected_net, 0), 0);
  assert.ok(f.later_net > 0);
});

test('an invoice already later than the client usually pays moves to next week, and its weight halves per 30 days past the pattern', () => {
  // Brightline: score 100 (w 0.98), usually on time; due 30 days ago -> 30 days past pattern -> w 0.49, lands in week 1.
  const f = forecast([{ client: 'B', amount_usd: 1000, due_on: '2026-10-12', score: 100, avg_days_late: 0 }], '2026-11-11');
  const net = 1000 - (44 + 0.3);
  assert.equal(f.weeks[0].expected_net, 0);
  assert.ok(Math.abs(f.weeks[1].expected_net - 0.49 * net) < 0.01, String(f.weeks[1].expected_net));
  assert.ok(Math.abs(f.at_risk_usd - 510) < 0.01, String(f.at_risk_usd));
});

test('an invoice still inside the client\'s usual lateness keeps its expected date and full weight', () => {
  // Northfield: 15 days late on average; due 5 days ago -> expected in 10 days (week 1), w 0.40.
  const f = forecast([{ client: 'N', amount_usd: 1000, due_on: '2026-11-06', score: 40, avg_days_late: 15 }], '2026-11-11');
  assert.ok(Math.abs(f.weeks[1].expected_net - 0.4 * (1000 - 44.3)) < 0.01);
});
