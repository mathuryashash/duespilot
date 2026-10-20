import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAndSend } from '../lib/paypal';

const d = { recipient_email: 'b@personal.example.com', currency: 'USD' as const, item_name: 'balance', amount_usd: 1920,
  invoice_date: '2026-10-21', due_date: '2026-11-05', discount_pct: 2, discount_until: '2026-10-28', note: 'n' };

test('conditional-rule failure (sandbox 500) does not block send; terms text still states the discount', async () => {
  const calls: [string, string, any][] = [];
  const call = async (m: string, p: string, b?: any) => {
    calls.push([m, p, b]);
    if (p.endsWith('/conditional-rules')) throw new Error('PayPal 500');
    if (m === 'POST' && p === '/v2/invoicing/invoices') return { href: 'https://x/v2/invoicing/invoices/INV2-T' };
    if (m === 'GET') return { id: 'INV2-T', status: 'SENT', amount: { value: '1920.00' } };
    return {};
  };
  const v = await createAndSend(d, call);
  assert.equal(v.status, 'SENT');
  assert.equal(v.early_pay_rule, 'failed');
  assert.ok(calls.some(([m, p]) => m === 'POST' && p.endsWith('/send')));
  assert.match(calls[0][2].detail.terms_and_conditions, /2% off if paid by 2026-10-28/);
});

test('no discount -> no conditional-rules call', async () => {
  const paths: string[] = [];
  const call = async (m: string, p: string) => { paths.push(p); return m === 'GET' ? { id: 'INV2-T', status: 'SENT', amount: { value: '1' } } : { href: '/INV2-T' }; };
  const v = await createAndSend({ ...d, discount_pct: 0, discount_until: null }, call);
  assert.equal(v.early_pay_rule, 'none');
  assert.ok(!paths.some((p) => p.endsWith('/conditional-rules')));
});
