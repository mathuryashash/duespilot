import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Seed, reliabilityScore } from './schemas';

export const loadSeed = () => Seed.parse(JSON.parse(readFileSync(process.env.SEED_PATH ?? path.resolve(process.cwd(), '..', 'seed', 'seed.json'), 'utf8')));

// Seeded history -> per-client risk row (labelled SEEDED in the UI).
export function clientRows(seed = loadSeed()) {
  const d = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  return seed.clients.map((c) => {
    const inv = seed.invoices.filter((i) => i.client_id === c.id);
    const paid = inv.filter((i) => i.paid_on);
    return {
      id: c.id, name: c.name, company: c.company, personality: c.personality,
      score: reliabilityScore(inv, seed.as_of),
      avg_days_late: paid.length ? Math.round(paid.reduce((s, i) => s + Math.max(0, d(i.due_on, i.paid_on!)), 0) / paid.length * 10) / 10 : 0,
      invoices: inv.length,
      outstanding_usd: inv.reduce((s, i) => s + i.amount_usd - i.paid_usd, 0),
      has_ap_agent: seed.ap_policies.some((p) => p.client_id === c.id),
    };
  });
}
