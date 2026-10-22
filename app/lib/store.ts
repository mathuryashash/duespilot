// Repository: the app sees only Store { read, update }. update(fn) is one atomic read-modify-write; fn is sync so a
// transaction never spans an await (do network calls before/after, never inside). Async so a Postgres Store with the
// same `docs` table (jsonb) can be swapped in for Render Postgres without touching callers.
// ponytail: every update reloads the whole (small) demo state and writes only changed rows; per-table queries if it grows.
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { WriteLog } from './paypal';

export type Pending = { id: string; kind: string; payload: unknown; hash: string; status: 'pending' | 'done' | 'failed'; created_at: string; result?: unknown };
export type TrackedInvoice = { id: string; status: string; amount_usd: number; role: string; number?: string; pay_link?: string; negotiation_id?: string; updated_at?: string; early_pay_rule?: string;
  due_on?: string; client_id?: string; paid_usd?: number; due_usd?: number; reminders?: { sent_on: string; tone: string }[] };
export type State = {
  pending: Record<string, Pending>;
  invoices: Record<string, TrackedInvoice>;
  events: Record<string, string>;
  negotiations: Record<string, unknown>;
  audit: { at: string; what: string }[];
  paypal_log: WriteLog[];
  clock_days: number; // simulated clock offset (Advance clock button), labelled in the UI
};
export type Store = { read(): Promise<State>; update<T>(fn: (s: State) => T): Promise<T> };

export const empty = (): State => ({ pending: {}, invoices: {}, events: {}, negotiations: {}, audit: [], paypal_log: [], clock_days: 0 });

export function memoryStore(): Store {
  let s = empty();
  return {
    read: async () => structuredClone(s),
    update: async (fn) => { const n = structuredClone(s); const r = fn(n); s = n; return r; },
  };
}

// State <-> rows: maps are one row per key, lists one row per item (zero-padded index), clock_days under 'meta'.
const MAPS = ['pending', 'invoices', 'events', 'negotiations'] as const;
const LISTS: readonly string[] = ['audit', 'paypal_log'];
type Row = { coll: string; id: string; json: string };
const key = (r: Row) => `${r.coll}\0${r.id}`;
function toRows(s: State): Row[] {
  const out: Row[] = [];
  for (const c of MAPS) for (const [id, v] of Object.entries(s[c])) out.push({ coll: c, id, json: JSON.stringify(v) });
  for (const c of LISTS) (s[c as 'audit'] as unknown[]).forEach((v, i) => out.push({ coll: c, id: String(i).padStart(9, '0'), json: JSON.stringify(v) }));
  out.push({ coll: 'meta', id: 'clock_days', json: JSON.stringify(s.clock_days) });
  return out;
}
function fromRows(rows: Row[]): State {
  const s = empty() as any;
  for (const r of rows) {
    const v = JSON.parse(r.json);
    if (r.coll === 'meta') s[r.id] = v; else if (LISTS.includes(r.coll)) s[r.coll].push(v); else s[r.coll][r.id] = v;
  }
  return s;
}

// Migrations in code; PRAGMA user_version = how many have run.
const MIGRATIONS = [
  `CREATE TABLE docs (coll TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (coll, id))`,
];
export const SCHEMA_VERSION = MIGRATIONS.length;

export function sqliteStore(file: string, legacyJson?: string): Store & { close(): void; schemaVersion(): number } {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = () => Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  for (let v = version(); v < MIGRATIONS.length; v++) { db.exec('BEGIN'); db.exec(MIGRATIONS[v]); db.exec(`PRAGMA user_version = ${v + 1}`); db.exec('COMMIT'); }

  const all = db.prepare('SELECT coll, id, json FROM docs ORDER BY coll, id');
  const upsert = db.prepare('INSERT INTO docs (coll, id, json) VALUES (?, ?, ?) ON CONFLICT (coll, id) DO UPDATE SET json = excluded.json');
  const del = db.prepare('DELETE FROM docs WHERE coll = ? AND id = ?');
  const rows = () => all.all() as Row[];
  const tx = <T>(fn: () => T): T => {
    db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  };
  const write = (before: Row[], s: State) => {
    const prev = new Map(before.map((r) => [key(r), r.json]));
    const next = toRows(s);
    const keep = new Set(next.map(key));
    for (const r of next) if (prev.get(key(r)) !== r.json) upsert.run(r.coll, r.id, r.json);
    for (const r of before) if (!keep.has(key(r))) del.run(r.coll, r.id);
  };

  // One-time import of the slice-1/2 JSON file store, so the live sandbox invoices stay tracked.
  if (legacyJson && existsSync(legacyJson) && rows().length === 0)
    tx(() => write([], { ...empty(), ...JSON.parse(readFileSync(legacyJson, 'utf8')) }));

  return {
    read: async () => fromRows(rows()),
    update: async (fn) => tx(() => { const before = rows(); const s = fromRows(before); const out = fn(s); write(before, s); return out; }),
    close: () => db.close(),
    schemaVersion: version,
  };
}

export function audit(s: State, what: string) { s.audit.push({ at: new Date().toISOString(), what }); }
