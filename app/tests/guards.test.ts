// Demo passcode gate, per-IP token-bucket rate limit, scheduled poller, demo reset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateDecision, sessionToken, safeEqual } from '../lib/gate';
import { tokenBucket, clientIp } from '../lib/ratelimit';
import { startPoller } from '../lib/poller';
import { memoryStore } from '../lib/store';
import { resetDemo } from '../lib/reset';

const PASS = 'correct horse';

test('safeEqual: equal strings only, any length', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', 'x'), false);
});

test('gate: valid cookie passes; missing/forged cookie -> login page or 401 for APIs', async () => {
  const good = await sessionToken(PASS);
  assert.notEqual(good, PASS, 'cookie never holds the raw passcode');
  const d = (pathname: string, cookie?: string) => gateDecision({ pathname, cookie, passcode: PASS, production: true });
  assert.equal(await d('/', good), 'allow');
  assert.equal(await d('/api/state', good), 'allow');
  assert.equal(await d('/'), 'login');
  assert.equal(await d('/api/negotiate'), 'deny');
  assert.equal(await d('/api/actions/x/approve', await sessionToken('wrong')), 'deny');
});

test('gate: webhook, health, login and static assets are exempt', async () => {
  for (const p of ['/api/webhooks/paypal', '/api/health', '/login', '/api/login', '/_next/static/x.js', '/favicon.ico'])
    assert.equal(await gateDecision({ pathname: p, passcode: PASS, production: true }), 'allow', p);
  assert.equal(await gateDecision({ pathname: '/api/webhooks/paypal/../../state', passcode: PASS, production: true }), 'deny');
});

test('gate: no passcode configured -> fail closed in production, open in local dev', async () => {
  assert.equal(await gateDecision({ pathname: '/api/state', passcode: '', production: true }), 'misconfigured');
  assert.equal(await gateDecision({ pathname: '/api/state', passcode: '', production: false }), 'allow');
});

test('token bucket: burst then refill per key', () => {
  let now = 0;
  const b = tokenBucket({ capacity: 2, refillPerMin: 1 }, () => now);
  assert.deepEqual([b.take('1.1.1.1'), b.take('1.1.1.1'), b.take('1.1.1.1')], [true, true, false]);
  assert.equal(b.take('2.2.2.2'), true, 'separate bucket per IP');
  now = 60_000;
  assert.equal(b.take('1.1.1.1'), true);
  assert.equal(b.take('1.1.1.1'), false);
});

test('clientIp: first x-forwarded-for hop, else x-real-ip, else "local"', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })), '9.9.9.9');
  assert.equal(clientIp(new Headers({ 'x-real-ip': '8.8.8.8' })), '8.8.8.8');
  assert.equal(clientIp(new Headers()), 'local');
});

test('poller runs on an interval, never overlaps, and stops', async () => {
  let runs = 0; let active = 0; let maxActive = 0;
  const stop = startPoller(async () => { runs++; active++; maxActive = Math.max(maxActive, active); await new Promise((r) => setTimeout(r, 25)); active--; }, 5);
  await new Promise((r) => setTimeout(r, 80));
  stop();
  const after = runs;
  await new Promise((r) => setTimeout(r, 40));
  assert.ok(runs >= 2, `ran ${runs}x`);
  assert.equal(maxActive, 1);
  assert.equal(runs, after, 'no runs after stop');
});

test('poller: a throwing run is logged, not fatal', async () => {
  let runs = 0;
  const stop = startPoller(async () => { runs++; throw new Error('PayPal down'); }, 5, () => {});
  await new Promise((r) => setTimeout(r, 30));
  stop();
  assert.ok(runs >= 2);
});

test('resetDemo clears demo activity but keeps tracked PayPal invoices (unless all)', async () => {
  const st = memoryStore();
  await st.update((s) => {
    s.invoices['INV2-K'] = { id: 'INV2-K', status: 'SENT', amount_usd: 1, role: 'invoice', reminders: [{ sent_on: 'x', tone: 'firm' }] };
    s.pending.p = { id: 'p', kind: 'k', payload: {}, hash: 'h', status: 'pending', created_at: 'x' };
    s.negotiations.n = {}; s.events.e = 'x'; s.clock_days = 9; s.audit.push({ at: 'x', what: 'y' });
  });
  await resetDemo(st);
  const s = await st.read();
  assert.deepEqual([Object.keys(s.pending), Object.keys(s.negotiations), s.clock_days], [[], [], 0]);
  assert.equal(s.invoices['INV2-K'].status, 'SENT');
  assert.equal(s.events.e, 'x', 'webhook dedupe ids survive a reset');
  assert.match(s.audit.at(-1)!.what, /demo reset/);
  await resetDemo(st, { all: true });
  assert.deepEqual(Object.keys((await st.read()).invoices), []);
});
