// ponytail: one JSON file (data/state.json), sync IO, single process. Postgres when we deploy to Render.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { WriteLog } from './paypal';

export type Pending = { id: string; kind: string; payload: unknown; hash: string; status: 'pending' | 'done' | 'failed'; created_at: string; result?: unknown };
export type TrackedInvoice = { id: string; status: string; amount_usd: number; role: string; number?: string; pay_link?: string; negotiation_id?: string; updated_at?: string; early_pay_rule?: string;
  due_on?: string; client_id?: string; reminders?: { sent_on: string; tone: string }[] };
export type State = {
  pending: Record<string, Pending>;
  invoices: Record<string, TrackedInvoice>;
  events: Record<string, string>;
  negotiations: Record<string, unknown>;
  audit: { at: string; what: string }[];
  paypal_log: WriteLog[];
  clock_days: number; // simulated clock offset (Advance clock button), labelled in the UI
};
export type Store = { read(): State; write(s: State): void };

const empty = (): State => ({ pending: {}, invoices: {}, events: {}, negotiations: {}, audit: [], paypal_log: [], clock_days: 0 });

export function memoryStore(): Store {
  let s = empty();
  return { read: () => structuredClone(s), write: (n) => { s = structuredClone(n); } };
}

export function fileStore(file = path.resolve(process.cwd(), 'data', 'state.json')): Store {
  return {
    read: () => (existsSync(file) ? { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) } : empty()),
    write: (s) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(s, null, 1)); },
  };
}

export function audit(s: State, what: string) { s.audit.push({ at: new Date().toISOString(), what }); }
