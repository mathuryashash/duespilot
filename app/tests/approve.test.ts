import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPending, approve } from '../lib/actions';
import { memoryStore } from '../lib/store';

const drafts = [{ recipient_email: 'b@personal.example.com', currency: 'USD', item_name: 'deposit', amount_usd: 10,
  invoice_date: '2026-10-21', due_date: '2026-10-21', discount_pct: 0, discount_until: null, note: '' }];

test('execution needs id + matching hash; wrong hash 409; replay is a no-op; executed payload == approved', async () => {
  const store = memoryStore();
  const { id, hash } = createPending(store, 'send_invoices', { drafts });
  const executed: unknown[] = [];
  const exec = async (p: unknown) => { executed.push(structuredClone(p)); return { invoice_ids: ['INV2-X'] }; };

  assert.equal((await approve(store, 'nope', hash, exec)).status, 404);
  assert.equal((await approve(store, id, 'f'.repeat(64), exec)).status, 409);
  assert.equal(executed.length, 0);

  const ok = await approve(store, id, hash, exec);
  assert.equal(ok.status, 200);
  assert.deepEqual(executed, [{ drafts }]);

  const again = await approve(store, id, hash, exec);
  assert.equal(again.status, 200);
  assert.equal(again.replay, true);
  assert.equal(executed.length, 1);
});

test('payload tampered in the store after creation fails the hash check', async () => {
  const store = memoryStore();
  const { id, hash } = createPending(store, 'send_invoices', { drafts });
  const s = store.read();
  (s.pending[id].payload as any).drafts[0].amount_usd = 9999;
  store.write(s);
  let ran = false;
  const r = await approve(store, id, hash, async () => { ran = true; return {}; });
  assert.equal(r.status, 409);
  assert.equal(ran, false);
});
