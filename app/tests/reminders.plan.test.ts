import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV1 } from 'ai/test';
import { nextReminder, CADENCE, cleanReminderText, draftReminderText } from '../lib/reminders';

test('not yet overdue -> null; paid -> null', () => {
  assert.equal(nextReminder({ due_on: '2026-10-25', sent: [], status: 'SENT' }, 'slow', 60, '2026-10-21'), null);
  assert.equal(nextReminder({ due_on: '2026-10-01', sent: [], status: 'PAID' }, 'slow', 60, '2026-10-21'), null);
});

test('deterministic schedule per persona: next date = due + cadence[step]', () => {
  const inv = { due_on: '2026-10-01', sent: [] as string[], status: 'SENT' };
  for (const p of Object.keys(CADENCE) as (keyof typeof CADENCE)[]) {
    const r = nextReminder(inv, p, 90, '2026-12-31')!;
    assert.equal(r.step, 0);
    assert.equal(r.next_on, new Date(Date.parse('2026-10-01') + CADENCE[p][0] * 86_400_000).toISOString().slice(0, 10));
    assert.equal(r.due_now, true);
  }
  assert.deepEqual(nextReminder(inv, 'ghost', 30, '2026-10-21'), nextReminder(inv, 'ghost', 30, '2026-10-21'));
});

test('ghost is chased sooner and more often than prompt', () => {
  assert.ok(CADENCE.ghost.length > CADENCE.prompt.length);
  assert.ok(CADENCE.ghost[1] < CADENCE.slow[1]);
});

test('step advances with each sent reminder; not due again before the next slot; never twice in one day', () => {
  const r = nextReminder({ due_on: '2026-10-01', sent: ['2026-10-04'], status: 'SENT' }, 'slow', 60, '2026-10-05')!;
  assert.equal(r.step, 1);
  assert.equal(r.next_on, '2026-10-11');
  assert.equal(r.due_now, false);
  const same = nextReminder({ due_on: '2026-10-01', sent: ['2026-10-21'], status: 'SENT' }, 'ghost', 10, '2026-10-21')!;
  assert.equal(same.due_now, false);
});

test('tone escalates with step and with low score; cadence exhausted -> null', () => {
  const t = (sent: string[], score: number) => nextReminder({ due_on: '2026-01-01', sent, status: 'SENT' }, 'slow', score, '2026-06-01')?.tone;
  assert.equal(t([], 95), 'friendly');
  assert.equal(t(['2026-01-04'], 95), 'firm');
  assert.equal(t([], 30), 'final');
  assert.equal(nextReminder({ due_on: '2026-01-01', sent: CADENCE.slow.map(() => '2026-01-02'), status: 'SENT' }, 'slow', 60, '2026-06-01'), null);
});

test('reminder text is plain, <=600 chars, no markup, no emails or links', () => {
  const c = cleanReminderText({ subject: '<b>Hi</b>', note: 'Pay at http://evil.example or x@evil.com <script>' + 'y'.repeat(900) });
  assert.ok(c.note.length <= 600 && c.subject.length <= 100);
  assert.doesNotMatch(c.note + c.subject, /[<>]|http|@/);
});

test('LLM drafts the text with zero tools; failure falls back to a deterministic template', async () => {
  const calls: any[] = [];
  const ok = new MockLanguageModelV1({ defaultObjectGenerationMode: 'json', doGenerate: async (o: any) => { calls.push(o);
    return { rawCall: { rawPrompt: null, rawSettings: {} }, finishReason: 'stop', usage: { promptTokens: 1, completionTokens: 1 }, text: JSON.stringify({ subject: 'Invoice 0008', note: 'Friendly nudge.' }) }; } });
  const ctx = { tone: 'firm' as const, persona: 'slow', company: 'Northfield Media', number: '0008', amount_usd: 1280, days_overdue: 4 };
  const a = await draftReminderText(ok, ctx);
  assert.equal(a.note, 'Friendly nudge.');
  assert.equal(calls[0].mode.tools, undefined);
  const bad = new MockLanguageModelV1({ doGenerate: async () => { throw new Error('down'); } });
  const b = await draftReminderText(bad, ctx);
  assert.equal(b.source, 'template');
  assert.match(b.note, /1280/);
});
