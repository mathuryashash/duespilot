// Client AP-agent personas from the eval (eval/negotiation.json), selectable in the Negotiate tab so a judge can try the
// hard ones live ("10% off or no deal", "net-60 or nothing"). Only the counterparty's policy changes: the freelancer's
// mandate and the client's score stay as seeded. Whether ANY deal exists is decided by exhaustive search, not by the model.
// Lazy: importing this (via lib/server) must not read files, so `next build` and the lazy-DB test stay side-effect free.
import data from '../eval/negotiation.json';
import { ApPolicy, type Seed } from './schemas';
import { feasible } from './negotiate';
import { loadSeed, clientRows } from './seed';
import type { z } from 'zod';

type S = z.infer<typeof Seed>;
type Persona = { id: string; client_id: string; label: string; policy: z.infer<typeof ApPolicy>; feasible: boolean };
let cache: Persona[] | null = null;

export function personas(): Persona[] {
  if (cache) return cache;
  const seed0 = loadSeed();
  const rows = clientRows(seed0);
  return (cache = data.scenarios.map((s) => {
    const policy = ApPolicy.parse({ client_id: s.client_id, budget_cycle: 'persona', ...s.policy });
    const score = rows.find((r) => r.id === s.client_id)?.score ?? 0;
    return { id: s.id, client_id: s.client_id, label: s.label, policy, feasible: !!feasible(seed0.mandate, policy, score) };
  }));
}

export function withPersona(seed: S, personaId: string): S {
  const p = personas().find((x) => x.id === personaId);
  if (!p) throw new Error('unknown persona');
  return { ...seed, ap_policies: [...seed.ap_policies.filter((x) => x.client_id !== p.client_id), p.policy] };
}
