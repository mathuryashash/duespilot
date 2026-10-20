import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftSchema } from '../lib/draft';

const S = draftSchema('personal.example.com');
const ok = { recipient_email: 'sb-buyer@personal.example.com', currency: 'USD', item_name: 'Website build: deposit',
  amount_usd: 1280, invoice_date: '2026-10-21', due_date: '2026-11-05', discount_pct: 2, discount_until: '2026-10-28', note: 'Thanks!' };

test('accepts one valid draft', () => { assert.ok(S.safeParse(ok).success); });

const bad: [string, object][] = [
  ['non-USD', { currency: 'EUR' }],
  ['amount 0', { amount_usd: 0 }],
  ['amount negative', { amount_usd: -5 }],
  ['amount > 10000', { amount_usd: 10000.01 }],
  ['discount > 20', { discount_pct: 21 }],
  ['due > 90 d', { due_date: '2027-01-20' }],
  ['due before invoice date', { due_date: '2026-10-20' }],
  ['recipient off allowlist', { recipient_email: 'attacker@x.com' }],
  ['lookalike domain', { recipient_email: 'a@evilpersonal.example.com' }],
  ['note too long', { note: 'x'.repeat(601) }],
];
for (const [name, patch] of bad) test(`rejects ${name}`, () => { assert.equal(S.safeParse({ ...ok, ...patch }).success, false); });
