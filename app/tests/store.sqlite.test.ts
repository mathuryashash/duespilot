import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sqliteStore, SCHEMA_VERSION } from '../lib/store';

const tmp = () => path.join(mkdtempSync(path.join(tmpdir(), 'duespilot-')), 'test.db');

test('state persists across reopen (temp DB file)', async () => {
  const f = tmp();
  const a = sqliteStore(f);
  await a.update((s) => { s.invoices['INV2-A'] = { id: 'INV2-A', status: 'SENT', amount_usd: 10, role: 'invoice' }; s.clock_days = 7; s.audit.push({ at: 'now', what: 'x' }); });
  a.close();
  const b = sqliteStore(f);
  const s = await b.read();
  assert.equal(s.invoices['INV2-A'].status, 'SENT');
  assert.equal(s.clock_days, 7);
  assert.deepEqual(s.audit, [{ at: 'now', what: 'x' }]);
  assert.equal(b.schemaVersion(), SCHEMA_VERSION);
  b.close();
});

test('deleted keys are removed; unchanged rows survive', async () => {
  const st = sqliteStore(':memory:');
  await st.update((s) => { s.events.e1 = 't'; s.events.e2 = 't'; });
  await st.update((s) => { delete s.events.e1; });
  assert.deepEqual(Object.keys((await st.read()).events), ['e2']);
});

test('concurrent updates are serialized (no lost update)', async () => {
  const st = sqliteStore(':memory:');
  await Promise.all(Array.from({ length: 20 }, (_, i) => st.update((s) => { s.events[`e${i}`] = 'x'; s.clock_days += 1; })));
  const s = await st.read();
  assert.equal(s.clock_days, 20);
  assert.equal(Object.keys(s.events).length, 20);
});

test('a throwing update rolls back and does not wedge the queue', async () => {
  const st = sqliteStore(':memory:');
  await assert.rejects(st.update((s) => { s.clock_days = 99; throw new Error('boom'); }));
  await st.update((s) => { s.events.ok = 'y'; });
  const s = await st.read();
  assert.equal(s.clock_days, 0);
  assert.equal(s.events.ok, 'y');
});

test('empty DB imports a legacy data/state.json once', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'duespilot-'));
  const legacy = path.join(dir, 'state.json');
  writeFileSync(legacy, JSON.stringify({ invoices: { 'INV2-L': { id: 'INV2-L', status: 'SENT', amount_usd: 5, role: 'invoice' } }, clock_days: 3 }));
  const f = path.join(dir, 'x.db');
  const a = sqliteStore(f, legacy);
  assert.equal((await a.read()).invoices['INV2-L'].amount_usd, 5);
  await a.update((s) => { s.clock_days = 0; });
  a.close();
  const b = sqliteStore(f, legacy); // not re-imported over newer data
  assert.equal((await b.read()).clock_days, 0);
  b.close();
});
