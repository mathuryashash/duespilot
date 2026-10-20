import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladder } from '../lib/reminders';

const now = '2026-11-10T09:00:00Z';

test('not overdue -> no reminder', () => { assert.equal(ladder(0, 90, null, now), null); });

test('pure: same inputs, same output', () => { assert.deepEqual(ladder(5, 62, null, now), ladder(5, 62, null, now)); });

test('never sends twice on the same day', () => {
  assert.equal(ladder(10, 62, '2026-11-10T01:00:00Z', now), null);
  assert.notEqual(ladder(10, 62, '2026-11-09T23:00:00Z', now), null);
});

test('tone moves friendly -> firm -> final as score drops', () => {
  const order = ['friendly', 'firm', 'final'];
  const tones = [95, 62, 30].map((s) => ladder(10, s, null, now)!.tone);
  assert.deepEqual(tones, ['friendly', 'firm', 'final']);
  for (let s = 100; s > 0; s -= 5) assert.ok(order.indexOf(ladder(10, s - 5, null, now)!.tone) >= order.indexOf(ladder(10, s, null, now)!.tone));
});
