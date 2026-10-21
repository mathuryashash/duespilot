import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pp, setWriteLogger, type WriteLog } from '../lib/paypal';
import { listDisputes } from '../lib/disputes';

Object.assign(process.env, { PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID ?? 'id', PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET ?? 's', NEBIUS_API_KEY: process.env.NEBIUS_API_KEY ?? 'k' });

test('every PayPal write carries a PayPal-Request-Id and is logged with it + the debug id; reads are not logged', async () => {
  const sent: { url: string; headers: any }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    sent.push({ url, headers: init.headers });
    if (url.endsWith('/v1/oauth2/token')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }));
    return new Response(url.includes('/remind') ? null : '{"id":"X"}', { status: url.includes('/remind') ? 204 : 200, headers: { 'paypal-debug-id': 'dbg123' } });
  }) as any;
  const logs: WriteLog[] = [];
  setWriteLogger((l) => logs.push(l));
  try {
    await pp('POST', '/v2/invoicing/invoices/INV2-X/remind', { note: 'n' });
    await pp('GET', '/v2/invoicing/invoices/INV2-X');
  } finally { globalThis.fetch = real; setWriteLogger(undefined); }
  const w = sent.find((s) => s.url.includes('/remind'))!;
  assert.match(w.headers['PayPal-Request-Id'], /^[0-9a-f-]{36}$/);
  assert.equal(logs.length, 1);
  assert.deepEqual({ ...logs[0], at: undefined }, { at: undefined, method: 'POST', path: '/v2/invoicing/invoices/INV2-X/remind', status: 204, request_id: w.headers['PayPal-Request-Id'], debug_id: 'dbg123' });
  assert.equal(sent.find((s) => s.url.endsWith('/INV2-X'))!.headers['PayPal-Request-Id'], undefined);
});

test('disputes view goes through the read-only toolkit tool list_disputes and summarises rows; empty is fine', async () => {
  let args: any;
  const tools = { list_disputes: { execute: async (a: any) => { args = a; return JSON.stringify({ items: [{ dispute_id: 'PP-D-1', reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED', status: 'OPEN', dispute_amount: { value: '10.00', currency_code: 'USD' }, create_time: 't', dispute_life_cycle_stage: 'INQUIRY' }] }); } } };
  const rows = await listDisputes(tools);
  assert.deepEqual(rows, [{ id: 'PP-D-1', reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED', status: 'OPEN', stage: 'INQUIRY', amount_usd: 10, created: 't' }]);
  assert.equal(args.page_size, 10);
  assert.deepEqual(await listDisputes({ list_disputes: { execute: async () => '{}' } }), []);
  await assert.rejects(listDisputes({ list_disputes: { execute: async () => JSON.stringify({ error: { message: 'NOT_AUTHORIZED' } }) } }), /NOT_AUTHORIZED/);
});
