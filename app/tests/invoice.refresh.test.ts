// Poll fallback: PayPal GET is the source of truth when no webhook arrives.
// invoice-sent.EBS2.json is a recorded sandbox GET (21 Oct, emails redacted). The PARTIALLY_PAID / PAID bodies are that
// recording with `status`, `payments.paid_amount` and `due_amount` set per the Invoicing v2 response schema.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { memoryStore } from '../lib/store';
import { view } from '../lib/paypal';
import { applyInvoice, refreshAll } from '../lib/refresh';

const ID = 'INV2-EBS2-CQKH-Q5SG-ZAQK';
const sent = JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', 'invoice-sent.EBS2.json'), 'utf8'));
const usd = (v: number) => ({ currency_code: 'USD', value: v.toFixed(2) });
const paidBy = (status: string, paid: number) => ({ ...sent, status,
  payments: { paid_amount: usd(paid), transactions: [{ payment_id: 'PAY-1', type: 'PAYPAL', amount: usd(paid) }] }, due_amount: usd(1280 - paid) });
const GET = { SENT: sent, PARTIALLY_PAID: paidBy('PARTIALLY_PAID', 500), PAID: paidBy('PAID', 1280) } as const;

async function tracked() {
  const store = memoryStore();
  await store.update((s) => { s.invoices[ID] = { id: ID, status: 'SENT', amount_usd: 1280, role: 'deposit', reminders: [] }; });
  return store;
}

test('view() reads paid/due amounts from a recorded GET', () => {
  assert.deepEqual([view(sent).status, view(sent).paid_usd, view(sent).due_usd], ['SENT', 0, 1280]);
  assert.deepEqual([view(GET.PARTIALLY_PAID).paid_usd, view(GET.PARTIALLY_PAID).due_usd], [500, 780]);
});

test('SENT -> PARTIALLY_PAID -> PAID via polling; repeats are no-ops', async () => {
  const store = await tracked();
  let body: any = GET.SENT;
  const get = async (id: string) => { assert.equal(id, ID); return view(body); };
  assert.deepEqual(await refreshAll(store, get), { checked: 1, changed: [] });
  body = GET.PARTIALLY_PAID;
  assert.deepEqual((await refreshAll(store, get)).changed, [`${ID}: SENT -> PARTIALLY_PAID`]);
  assert.equal((await store.read()).invoices[ID].paid_usd, 500);
  body = GET.PAID;
  assert.deepEqual((await refreshAll(store, get)).changed, [`${ID}: PARTIALLY_PAID -> PAID`]);
  const auditLen = (await store.read()).audit.length;
  await refreshAll(store, get, { all: true });
  await refreshAll(store, get, { all: true });
  const s = await store.read();
  assert.equal(s.invoices[ID].status, 'PAID');
  assert.equal(s.invoices[ID].due_usd, 0);
  assert.equal(s.audit.length, auditLen, 'idempotent: no new audit lines when nothing changed');
});

test('a stale read never moves a payment state backwards', async () => {
  const store = await tracked();
  await store.update((s) => applyInvoice(s, view(GET.PAID), 'webhook'));
  await store.update((s) => applyInvoice(s, view(GET.PARTIALLY_PAID), 'poll'));
  await store.update((s) => applyInvoice(s, view(GET.SENT), 'poll'));
  assert.equal((await store.read()).invoices[ID].status, 'PAID');
});

test('refunds/cancellations from PayPal are still accepted', async () => {
  const store = await tracked();
  await store.update((s) => applyInvoice(s, view(GET.PAID), 'poll'));
  await store.update((s) => applyInvoice(s, view({ ...GET.PAID, status: 'REFUNDED' }), 'poll'));
  assert.equal((await store.read()).invoices[ID].status, 'REFUNDED');
});

test('scheduled refresh skips settled invoices; one failing GET does not stop the rest', async () => {
  const store = await tracked();
  await store.update((s) => {
    s.invoices['INV2-DONE'] = { id: 'INV2-DONE', status: 'PAID', amount_usd: 1, role: 'invoice' };
    s.invoices['INV2-BADX'] = { id: 'INV2-BADX', status: 'SENT', amount_usd: 1, role: 'invoice' };
  });
  const asked: string[] = [];
  const r = await refreshAll(store, async (id) => { asked.push(id); if (id === 'INV2-BADX') throw new Error('PayPal 503'); return view(GET.PAID); });
  assert.deepEqual(asked.sort(), ['INV2-BADX', ID].sort());
  assert.equal(r.checked, 2);
  assert.deepEqual(r.errors, ['INV2-BADX: PayPal 503']);
  assert.equal((await store.read()).invoices[ID].status, 'PAID');
});

test('refresh does not clobber state written while a GET was in flight', async () => {
  const store = await tracked();
  await refreshAll(store, async () => { await store.update((s) => { s.events['WH-concurrent'] = 'x'; }); return view(GET.PAID); });
  const s = await store.read();
  assert.equal(s.events['WH-concurrent'], 'x');
  assert.equal(s.invoices[ID].status, 'PAID');
});
