// Negotiation loop: AR agent (LLM, injected as arTurn) vs haggler AP policy (deterministic).
// The server — not the LLM — enforces the mandate. Deal is zod-validated.
import { z } from 'zod';
import { Deal, mandateViolations, reliabilityScore, type ApPolicy, type Offer, type Seed } from './schemas.ts';

type OfferT = z.infer<typeof Offer>;
type ApT = z.infer<typeof ApPolicy>;
export type ApReply = { accept: boolean; message: string };
export type Round = { round: number; offer: OfferT | null; toolCalls: unknown[]; violations: string[]; ap: ApReply | null; raw?: string };
export type ArTurn = (ctx: { round: number; score: number; history: Round[]; apOpening: string }) => Promise<{ offer: OfferT | null; toolCalls: unknown[]; raw?: string }>;

// ponytail: rule-based AP agent; swap in an LLM voice on 4 Nov if the demo needs prose.
export function apRespond(o: OfferT, p: ApT, round: number): ApReply {
  const asks: string[] = [];
  if (o.deposit_pct > p.deposit_pct_max) asks.push(`deposit at most ${p.deposit_pct_max}%`);
  if (o.balance_net_days < p.balance_net_days_min) asks.push(`balance at net-${p.balance_net_days_min} or longer`);
  if (o.balance_net_days < 30 && o.early_pay_discount_pct < p.discount_pct_required_if_net_under_30)
    asks.push(`${p.discount_pct_required_if_net_under_30}% early-pay discount since net is under 30`);
  if (!asks.length && round === 1 && p.always_counter_first_offer)
    return { accept: false, message: `Our policy is to counter first offers. Could you do ${p.opening_ask.deposit_pct}% now and the rest net-${p.opening_ask.balance_net_days}?` };
  return asks.length ? { accept: false, message: `We need: ${asks.join('; ')}.` } : { accept: true, message: 'Accepted. Please send the deposit and balance invoices.' };
}

export const apOpening = (p: ApT) =>
  `Hi, AP agent for this client. We'd like ${p.opening_ask.deposit_pct}% upfront and the balance net-${p.opening_ask.balance_net_days}.`;

export async function negotiate(a: { seed: z.infer<typeof Seed>; clientId: string; totalUsd: number; arTurn: ArTurn }) {
  const { seed, clientId, totalUsd, arTurn } = a;
  const policy = seed.ap_policies.find((p) => p.client_id === clientId)!;
  const score = reliabilityScore(seed.invoices.filter((i) => i.client_id === clientId), seed.as_of);
  const rounds: Round[] = [];
  for (let round = 1; round <= seed.mandate.max_rounds; round++) {
    const t = await arTurn({ round, score, history: rounds, apOpening: apOpening(policy) });
    const violations = t.offer ? mandateViolations(t.offer, seed.mandate, score) : ['no valid propose_terms call'];
    const ap = violations.length ? null : apRespond(t.offer!, policy, round);
    rounds.push({ round, offer: t.offer, toolCalls: t.toolCalls, violations, ap, raw: t.raw });
    if (ap?.accept) {
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
