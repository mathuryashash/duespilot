import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleWebhook } from '../lib/webhook';
import { memoryStore } from '../lib/store';

const event = (id: string, amount = '1.00') => JSON.stringify({ id, event_type: 'INVOICING.INVOICE.PAID',
  resource: { invoice: { id: 'INV2-AAAA', status: 'PAID', amount: { value: amount, currency_code: 'USD' } } } });

async function deps(verified: boolean) {
  const store = memoryStore();
  await store.update((s) => { s.invoices['INV2-AAAA'] = { id: 'INV2-AAAA', status: 'SENT', amount_usd: 1280, role: 'deposit' }; });
  let fetches = 0;
  return { store, get fetches() { return fetches; }, d: { store, verify: async () => verified,
    getInvoice: async (id: string) => { fetches++; return { id, status: 'SENT', amount_usd: 1280 }; } } };
}

test('bad signature -> 401, state untouched', async () => {
  const x = await deps(false);
  const r = await handleWebhook({ headers: {}, rawBody: event('WH-1') }, x.d);
  assert.equal(r.status, 401);
  assert.equal(x.fetches, 0);
  assert.equal((await x.store.read()).invoices['INV2-AAAA'].status, 'SENT');
});

test('tampered amount/status in payload is ignored: state comes from the re-fetch', async () => {
  const x = await deps(true);
  const r = await handleWebhook({ headers: {}, rawBody: event('WH-2', '1.00') }, x.d);
  assert.equal(r.status, 200);
  assert.equal(x.fetches, 1);
  const inv = (await x.store.read()).invoices['INV2-AAAA'];
  assert.equal(inv.status, 'SENT');
  assert.equal(inv.amount_usd, 1280);
});

test('duplicate event.id -> 200 no-op', async () => {
  const x = await deps(true);
  await handleWebhook({ headers: {}, rawBody: event('WH-3') }, x.d);
  const r = await handleWebhook({ headers: {}, rawBody: event('WH-3') }, x.d);
  assert.equal(r.status, 200);
  assert.equal(r.body.duplicate, true);
  assert.equal(x.fetches, 1);
});

test('malformed body -> 400', async () => {
  const x = await deps(true);
  assert.equal((await handleWebhook({ headers: {}, rawBody: '{nope' }, x.d)).status, 400);
});
