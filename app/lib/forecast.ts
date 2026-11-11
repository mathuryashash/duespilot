// Expected-cash forecast: what USD is likely to land each week, net of PayPal's fee, weighted by each client's history.
// Pure and deterministic. The weights are an estimate from seeded/tracked history, and the UI labels them that way.

// PayPal India, receiving an international commercial payment: 4.4% + USD 0.30 fixed (paypal.com/in fee page, 28 Mar 2024).
// FX markup and GST on the fee are not included; the UI says so.
export const FEE_PCT = 4.4;
export const FEE_FIXED_USD = 0.3;
const r2 = (n: number) => Math.round(n * 100) / 100;
export const paypalFee = (amount: number) => (amount > 0 ? r2(amount * FEE_PCT / 100 + FEE_FIXED_USD) : 0);

export type ForecastRow = { client: string; amount_usd: number; due_on: string; score: number | null; avg_days_late: number };
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const diff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function forecast(rows: ForecastRow[], today: string, nWeeks = 6) {
  const weeks = Array.from({ length: nWeeks }, (_, i) => ({ start: addDays(today, 7 * i), expected_net: 0, byClient: {} as Record<string, number> }));
  let later_net = 0, at_risk_usd = 0, gross = 0, fees = 0;
  for (const r of rows) {
    let w = Math.min(0.98, Math.max(0.05, (r.score ?? 60) / 100));
    let expected = addDays(r.due_on, Math.round(r.avg_days_late));
    const past = diff(expected, today); // days later than this client usually pays
    if (past > 0) { w *= 0.5 ** (past / 30); expected = addDays(today, 7); } // off-pattern: next reminder cycle at best, and less likely
    const idx = Math.max(0, Math.floor(diff(today, expected) / 7));
    const net = w * (r.amount_usd - paypalFee(r.amount_usd));
    gross += r.amount_usd; fees += paypalFee(r.amount_usd); at_risk_usd += r.amount_usd * (1 - w);
    if (idx < nWeeks) { weeks[idx].expected_net += net; weeks[idx].byClient[r.client] = (weeks[idx].byClient[r.client] ?? 0) + net; }
    else later_net += net;
  }
  return {
    weeks: weeks.map((w) => ({ ...w, expected_net: r2(w.expected_net), byClient: Object.fromEntries(Object.entries(w.byClient).map(([k, v]) => [k, r2(v)])) })),
    later_net: r2(later_net), at_risk_usd: r2(at_risk_usd), gross_usd: r2(gross), fees_usd: r2(fees),
  };
}
