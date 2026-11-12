// Negotiation loop: AR agent (LLM, injected as arTurn) vs the client's AP agent.
// The AP agent is either the deterministic policy (apRespond, default) or a second LLM (apTurn, lib/apAgent.ts)
// bounded by that same policy in code. The server — not either LLM — enforces both sides' limits. Deal is zod-validated.
import { z } from 'zod';
import { Deal, mandateViolations, reliabilityScore, type ApPolicy, type Mandate, type Offer, type Seed } from './schemas';
import { apPolicyViolations, checkApDecision, type ApCheck, type ApTurn } from './apAgent';

type OfferT = z.infer<typeof Offer>;
type ApT = z.infer<typeof ApPolicy>;
export type ApReply = { accept: boolean; message: string };
export type Round = { round: number; offer: OfferT | null; toolCalls: unknown[]; violations: string[]; ap: ApReply | null; apCheck?: ApCheck; raw?: string; apRaw?: string };
export type ArTurn = (ctx: { round: number; score: number; history: Round[]; apOpening: string }) => Promise<{ offer: OfferT | null; toolCalls: unknown[]; raw?: string }>;

// Rule-based AP agent (the default, and the reference the LLM AP agent is checked against).
export function apRespond(o: OfferT, p: ApT, round: number): ApReply {
  const asks = apPolicyViolations(o, p);
  if (!asks.length && round === 1 && p.always_counter_first_offer)
    return { accept: false, message: `Our policy is to counter first offers. Could you do ${p.opening_ask.deposit_pct}% now and the rest net-${p.opening_ask.balance_net_days}?` };
  return asks.length ? { accept: false, message: `We need: ${asks.join('; ')}.` } : { accept: true, message: 'Accepted. Please send the deposit and balance invoices.' };
}

export const apOpening = (p: ApT) =>
  `Hi, AP agent for this client. We'd like ${p.opening_ask.deposit_pct}% upfront and the balance net-${p.opening_ask.balance_net_days}.`;

// How often the server check fired, and how often the model fixed its offer on the next round.
// With an LLM AP agent, also: how often code overrode the client's agent (accept outside its policy, unsignable counter, no reply).
export function checkStats(rounds: Round[]) {
  const rejected = rounds.filter((r) => r.violations.length > 0);
  const fixed = rounds.filter((r, i) => i > 0 && r.violations.length === 0 && rounds[i - 1].violations.length > 0).length;
  const apChecked = rounds.filter((r) => r.apCheck);
  return { proposed: rounds.length, rejected: rejected.length, fixed, ap_replies: apChecked.length, ap_overridden: apChecked.filter((r) => r.apCheck!.override).length };
}

// Exhaustive search: is there ANY offer that satisfies both the mandate and the AP policy? (null = no deal is the right answer)
export function feasible(m: z.infer<typeof Mandate>, p: ApT, score: number): OfferT | null {
  const discounts = [0, ...Array.from({ length: Math.floor(m.early_pay_discount_pct_max * 2) }, (_, i) => (i + 1) / 2)];
  for (let deposit_pct = 0; deposit_pct <= 100; deposit_pct++)
    for (let balance_net_days = 0; balance_net_days <= 90; balance_net_days++)
      for (const early_pay_discount_pct of discounts) {
        const o = { deposit_pct, balance_net_days, early_pay_discount_pct, early_pay_window_days: 1, message: '' };
        if (!mandateViolations(o, m, score).length && apRespond(o, p, 2).accept) return o;
      }
  return null;
}

export async function negotiate(a: { seed: z.infer<typeof Seed>; clientId: string; totalUsd: number; arTurn: ArTurn; apTurn?: ApTurn }) {
  const { seed, clientId, totalUsd, arTurn, apTurn } = a;
  const policy = seed.ap_policies.find((p) => p.client_id === clientId)!;
  const score = reliabilityScore(seed.invoices.filter((i) => i.client_id === clientId), seed.as_of);
  const rounds: Round[] = [];
  for (let round = 1; round <= seed.mandate.max_rounds; round++) {
    const t = await arTurn({ round, score, history: rounds, apOpening: apOpening(policy) });
    const violations = t.offer ? mandateViolations(t.offer, seed.mandate, score) : ['no valid propose_terms call'];
    let ap: ApReply | null = null, apCheck: ApCheck | undefined, apRaw: string | undefined;
    if (!violations.length) {
      if (apTurn) {
        // Only offers the client actually saw (ones that passed our mandate), with their real round numbers.
        const history = rounds.flatMap((r) => (!r.violations.length && r.offer ? [{ round: r.round, offer: r.offer, reply: r.ap?.message ?? null }] : []));
        const d = await apTurn({ round, maxRounds: seed.mandate.max_rounds, offer: t.offer!, history });
        const c = checkApDecision(d.decision, t.offer!, policy);
        ap = { accept: c.accept, message: c.message }; apCheck = c.check; apRaw = d.raw;
      } else ap = apRespond(t.offer!, policy, round);
    }
    rounds.push({ round, offer: t.offer, toolCalls: t.toolCalls, violations, ap, apCheck, raw: t.raw, apRaw });
    // Both checks, again, on the exact terms being signed: ours (mandate) and theirs (client policy).
    if (ap?.accept && !mandateViolations(t.offer!, seed.mandate, score).length && !apPolicyViolations(t.offer!, policy).length) {
      const o = t.offer!;
      const deposit_usd = Math.round(totalUsd * o.deposit_pct) / 100;
      const deal = Deal.parse({
        client_id: clientId, currency: 'USD', total_usd: totalUsd, deposit_pct: o.deposit_pct, deposit_usd,
        balance_usd: Math.round((totalUsd - deposit_usd) * 100) / 100, balance_net_days: o.balance_net_days,
        early_pay_discount_pct: o.early_pay_discount_pct, early_pay_window_days: o.early_pay_window_days, rounds: round,
      });
      return { score, rounds, deal };
    }
  }
  return { score, rounds, deal: null };
}
