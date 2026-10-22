// Human approval gate (BLOCKER 2c): writes run only via approve(id, hash) and execute exactly the stored payload.
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { audit, type Store } from './store';

const canon = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as any)[k])}`).join(',')}}`
  : JSON.stringify(v);
export const hashPayload = (kind: string, p: unknown) => createHash('sha256').update(kind + '\n' + canon(p)).digest('hex');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function createPending(store: Store, kind: string, payload: unknown) {
  const id = randomUUID();
  const hash = hashPayload(kind, payload);
  await store.update((s) => {
    s.pending[id] = { id, kind, payload, hash, status: 'pending', created_at: new Date().toISOString() };
    audit(s, `pending ${kind} ${id.slice(0, 8)} created`);
  });
  return { id, hash };
}

export type Executor = (payload: any) => Promise<unknown>;
export type ApproveResult = { status: number; replay?: boolean; result?: unknown; error?: string };

// ponytail: in-process lock only; fine for one Node process.
const running = new Set<string>();

export async function approve(store: Store, id: string, hash: string, exec: Executor): Promise<ApproveResult> {
  const p = (await store.read()).pending[id];
  if (!p) return { status: 404, error: 'no such pending action' };
  if (typeof hash !== 'string' || !same(hash, p.hash) || !same(hashPayload(p.kind, p.payload), p.hash)) return { status: 409, error: 'hash mismatch' };
  if (p.status !== 'pending' || running.has(id)) return { status: 200, replay: true, result: p.result };
  running.add(id);
  try {
    const result = await exec(structuredClone(p.payload));
    await store.update((s) => { Object.assign(s.pending[id], { status: 'done', result }); audit(s, `approved ${p.kind} ${id.slice(0, 8)} executed`); });
    return { status: 200, result };
  } catch (e) {
    await store.update((s) => { Object.assign(s.pending[id], { status: 'failed', result: { error: String((e as Error).message).slice(0, 300) } }); audit(s, `approved ${p.kind} ${id.slice(0, 8)} FAILED`); });
    return { status: 502, error: (e as Error).message };
  } finally { running.delete(id); }
}
