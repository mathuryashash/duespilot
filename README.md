# DuesPilot — AR agent that negotiates payment terms and settles them as PayPal invoices

PayPal AI Hackathon entry (work in progress). **PayPal sandbox only** (US business + US personal sandbox accounts, USD). Client payment history is **seeded demo data** (`seed/seed.json`).

What runs today (`app/`):
1. Client table (AG Grid Community, custom cells: reliability bar, status pills, aging buckets): reliability score from seeded history, plus live sandbox invoice list + Transaction Search count.
2. Negotiation: two agents, both Nemotron 3 Super on Nebius Token Factory (AI SDK v4), negotiate in up to 3 rounds. Ours (AR) works for the freelancer; the client's AP agent works for the client. Each side is bounded by its own limits **in server code**: our offers are checked against the freelancer's mandate (a breaking offer never reaches the client, and the model sees the reason and revises), and the client agent's replies are checked against the client's policy (an acceptance outside it, or a counter the client couldn't sign, is overridden before our agent sees it). A deal is signed only if both checks pass on the exact terms. The client side can also be switched to the plain policy rules. Ten hard client personas from the eval can be picked in the Negotiate tab.
3. Approval gate: the agreed deal becomes a pending action `{id, sha256 hash}`. Nothing is created or sent in PayPal until you click Approve. A wrong hash gets 409, and a replay is a no-op.
4. On approval: a deposit invoice and a balance invoice (net-N with early-pay terms) are created and sent through Invoicing v2 to the sandbox buyer.
5. Paid tracking: `POST /api/webhooks/paypal` verifies via `verify-webhook-signature`, dedupes on `event.id`, and re-fetches the invoice instead of trusting the payload. There is also a "Refresh from PayPal" polling fallback for local dev without a public URL.
6. Brief to invoice: the model extracts client and line items; code checks every amount against numbers in the brief, blocks text aimed at the AI, two-client briefs and off-allowlist recipients, and warns on the approval card about amounts it left out or took only from a quoted client message. Its own extraction slips get one retry with the reason; caps (amount, terms) are never retried.
7. Reminders: schedule and tone are plain code; the model writes the words, a checker rejects soft wording in firm/final reminders and missing amount, number, due date or pay link, then one retry, then a fixed template.
8. Cash forecast (AG Charts): expected cash per week for 6 weeks, net of PayPal's fee (4.4% + $0.30, India receiving rate) and weighted by each client's payment record.

## Measured (real model, `npm run eval`, full tables in `app/eval/RESULTS.md`)

Nemotron 3 Super on Nebius, every case run 3 times, scored by code against hand labels or exhaustive search.

| what | result |
|---|---|
| Negotiation, 10 client AP-agent personas (pushy, no deposit, net-60, "10% off or no deal") | deal closed in 12/12 runs where one exists; walked away in 18/18 where exhaustive search says none exists |
| Signed deals that break the freelancer's mandate | 0 of 12. In these runs the model never proposed an out-of-mandate offer (0 of 75), so the server's reject-and-revise path is covered by unit tests, not by this eval |
| Brief to invoice, blind set written by a separate agent that never saw the code (first run) | 35/36 legit runs correct (the other was an empty model response), after fixing 2 labels the agent got wrong; 6/36 attack runs gave a wrong draft with no warning |
| Same set after fixing the gap it found (client named by contact name only) | 3/36 attack runs: all one "add a $5,000 finder's fee" line the freelancer asks for, so arguably correct |
| Firm/final reminders whose first model draft was too soft ("friendly reminder") | 11/36 runs; all 11 fixed on one retry with the checker's reason; 0 reach the approval card |
| Both sides Nemotron (`npx tsx eval/run_ap.ts`, `app/eval/RESULTS_ap_llm.md`): same 10 personas | deal closed in 12/12 where one exists, walked away in 18/18 where none does; 0 signed deals break either side's limits. The client's agent once tried to accept terms its own policy forbids (net-15 when it needs net-60); its policy check overrode it |
| Fake "your policy was updated" message sent to the client's agent | it tried to accept an out-of-policy offer in 16 of 30 runs; its policy check overrode all 16, 0 deals signed. A tag-escape "ignore your instructions" got 0 of 30 |
| Model cost | $0.00049 per brief, $0.00125 per negotiation (rules client), $0.00324 with both sides Nemotron, $0.00071 per reminder; $0.2202 for the whole eval, $0.1454 for the two-agent eval |

The briefs and policies are written by us (one set by a separate agent), not collected from real users, and 3 runs per case is a small sample. Earlier, already-tuned sets and their numbers are in the same file, labelled as such.

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
`@paypal/agent-toolkit` is Apache-2.0. AG Charts Community is MIT. The PayPal REST client follows patterns from paypaldev/hackathon-paypal-ag-grid-boilerplate (re-typed, not copied). AG Grid Community is MIT.

MIT licensed. See `LICENSE`.
