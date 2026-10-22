import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPending, approve } from '../lib/actions';
import { memoryStore } from '../lib/store';
import { makeExecutors } from '../lib/executors';

const ID = 'INV2-EBS2-CQKH-Q5SG-ZAQK';
async function setup(status = 'SENT') {
  const store = memoryStore();
  await store.update((s) => { s.invoices[ID] = { id: ID, status, amount_usd: 1280, role: 'deposit' }; });
  const calls: [string, string, any][] = [];
  const call = async (m: string, p: string, b?: any) => { calls.push([m, p, b]); return {}; };
  return { store, calls, ex: makeExecutors({ store, call, allowedDomain: 'personal.example.com', today: () => '2026-10-21' }) };
}
const reminder = { invoice_id: ID, subject: 'Invoice 0008 is overdue', note: 'Please pay.', tone: 'firm', step: 0 };

test('approved reminder calls POST /v2/invoicing/invoices/{id}/remind to the recipient only, and is recorded', async () => {
  const x = await setup();
  const { id, hash } = await createPending(x.store, 'send_reminder', reminder);
  const r = await approve(x.store, id, hash, x.ex.send_reminder);
  assert.equal(r.status, 200, r.error);
  assert.deepEqual(x.calls, [['POST', `/v2/invoicing/invoices/${ID}/remind`, { subject: reminder.subject, note: reminder.note, send_to_invoicer: false, send_to_recipient: true }]]);
  assert.deepEqual((await x.store.read()).invoices[ID].reminders, [{ sent_on: '2026-10-21', tone: 'firm' }]);
});

test('reminder for an untracked invoice, a paid invoice, or with markup is refused before any PayPal call', async () => {
  for (const [status, p] of [['SENT', { ...reminder, invoice_id: 'INV2-AAAA-BBBB-CCCC-DDDD' }], ['PAID', reminder], ['SENT', { ...reminder, note: '<a href=x>pay</a>' }]] as const) {
    const x = await setup(status);
    const { id, hash } = await createPending(x.store, 'send_reminder', p);
    const r = await approve(x.store, id, hash, x.ex.send_reminder);
    assert.equal(r.status, 502);
    assert.equal(x.calls.length, 0);
  }
});

test('send_invoices executor re-validates drafts and sends line items', async () => {
  const x = await setup();
  const call = async (m: string, p: string, b?: any) => { x.calls.push([m, p, b]); return m === 'GET' ? { id: 'INV2-NEW', status: 'SENT', amount: { value: '2400.00' } } : { href: '/INV2-NEW' }; };
  const ex = makeExecutors({ store: x.store, call, allowedDomain: 'personal.example.com', today: () => '2026-10-21' });
  const d = { recipient_email: 'b@personal.example.com', currency: 'USD', item_name: 'Landing page', amount_usd: 2400, invoice_date: '2026-10-21', due_date: '2026-11-05',
    discount_pct: 0, discount_until: null, note: '', items: [{ name: 'Build', amount_usd: 2000 }, { name: 'Revisions', amount_usd: 400 }] };
  const { id, hash } = await createPending(x.store, 'send_invoices', { drafts: [d], client_id: 'haggler' });
  const r = await approve(x.store, id, hash, ex.send_invoices);
  assert.equal(r.status, 200, r.error);
  assert.deepEqual(x.calls[0][2].items.map((i: any) => i.unit_amount.value), ['2000.00', '400.00']);
  assert.equal((await x.store.read()).invoices['INV2-NEW'].client_id, 'haggler');
  const bad = await createPending(x.store, 'send_invoices', { drafts: [{ ...d, recipient_email: 'x@evil.com' }] });
  const n = x.calls.length;
  assert.equal((await approve(x.store, bad.id, bad.hash, ex.send_invoices)).status, 502);
  assert.equal(x.calls.length, n);
});
