# DuesPilot — AR agent that negotiates payment terms and settles them as PayPal invoices

PayPal AI Hackathon entry (work in progress). **PayPal sandbox only** (US business + US personal sandbox accounts, USD). Client payment history is **seeded demo data** (`seed/seed.json`).

What runs today (`app/`):
1. Client table (AG Grid Community): reliability score from seeded history, plus live sandbox invoice list + Transaction Search count.
2. Negotiation: the AR agent (Nemotron 3 Super on Nebius Token Factory, AI SDK v4) haggles with a client AP-agent policy in up to 3 rounds. Every offer is checked **in server code** against the freelancer's mandate. Offers that break it never reach the counterparty.
3. Approval gate: the agreed deal becomes a pending action `{id, sha256 hash}`. Nothing is created or sent in PayPal until you click Approve. A wrong hash gets 409, and a replay is a no-op.
4. On approval: a deposit invoice and a balance invoice (net-N with early-pay terms) are created and sent through Invoicing v2 to the sandbox buyer.
5. Paid tracking: `POST /api/webhooks/paypal` verifies via `verify-webhook-signature`, dedupes on `event.id`, and re-fetches the invoice instead of trusting the payload. There is also a "Refresh from PayPal" polling fallback for local dev without a public URL.

## Run locally
```
cp .env.example .env      # fill in your own sandbox app + Nebius key
cd app && npm ci
npm test                  # node:test + tsx
npm run dev               # http://localhost:3000
```
Local webhooks: PayPal can't reach localhost, so use "Refresh from PayPal" (polling), or run with `DEMO_ALLOW_SIM=1` and POST a simulated event with header `x-duespilot-sim: 1`. Invoice state is still re-fetched from PayPal, so a simulated event can't fake PAID.

## Guardrails
- The LLM's only tool is `propose_terms`, which has no `execute`. Any PayPal toolkit use is built from a read-only allowlist (`list/get/search` invoices, disputes `list/get`, `list_transactions`), and a test fails if a write-like tool appears.
- Server-side draft limits: USD only, 0 < amount ≤ $10k, discount ≤ 20%, due ≤ 90 days, recipient on the allowlist domain. They are re-checked at execution time.
- The app refuses to boot unless `PAYPAL_ENV=sandbox` and the API base is `api-m.sandbox.paypal.com`. No `NEXT_PUBLIC_` secrets.
- Known sandbox issue: `POST /v2/invoicing/invoices/{id}/conditional-rules` returned 500 for every body we tried (20 Oct 2026). The early-pay discount is therefore also written into the invoice terms, and the grid shows `early_pay_rule: failed`.

## Credits
`@paypal/agent-toolkit` is Apache-2.0. The PayPal REST client follows patterns from paypaldev/hackathon-paypal-ag-grid-boilerplate (re-typed, not copied). AG Grid Community is MIT.

MIT licensed. See `LICENSE`.
