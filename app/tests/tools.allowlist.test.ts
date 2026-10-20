import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readOnlyToolkit, ALLOWED_TOOL_NAMES } from '../lib/toolkit';
import { AR_TOOLS } from '../lib/llm';

const WRITE = /refund|accept|pay_|cancel|delete|update|create|send|record/;

test('toolkit exposes only the 6 read-only tools', () => {
  const names = Object.keys(readOnlyToolkit('dummy', 'dummy').getTools());
  assert.ok(names.length > 0);
  for (const n of names) {
    assert.ok(ALLOWED_TOOL_NAMES.includes(n), `not allowlisted: ${n}`);
    assert.doesNotMatch(n, WRITE);
  }
});

test('the AR negotiation agent gets exactly one tool, with no execute (server validates)', () => {
  assert.deepEqual(Object.keys(AR_TOOLS), ['propose_terms']);
  assert.equal((AR_TOOLS.propose_terms as { execute?: unknown }).execute, undefined);
});
