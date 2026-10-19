# DuesPilot — the AR agent that gets cross-border freelancers paid, on PayPal

> DRAFT skeleton (20 Oct 2026). Files under `app/…` don't exist yet; build starts 31 Oct. Replace `TBD` before 9 Nov.

**Live demo:** TBD (Render) · **Video:** TBD (YouTube) · **License:** MIT

Freelancers billing overseas clients spend time chasing money. Across 3 years of invoices from 100,000+ freelancers, Bonsai found that **29% of freelance invoices were paid at least a day late**. Most of those were paid within 14 days ([Bonsai, "How often do freelancers get paid late?"](https://www.hellobonsai.com/blog/late-freelance-payment), vendor data from its own users, checked 20 Oct 2026).

DuesPilot works in three steps:
1. Paste a client brief and DuesPilot drafts a PayPal invoice.
2. When the client's AP agent pushes back ("50% now, rest net-30?"), DuesPilot negotiates within **your mandate** and the client's **reliability score**, and agrees terms in at most 3 rounds.
3. One human click settles the deal as PayPal sandbox invoices. A verified webhook marks them Paid.

The demo uses **US business and US personal PayPal sandbox accounts, in USD**. It makes no claim to live India support.

## PayPal API → file → demo beat

| PayPal API / tool | File | Demo beat |
|---|---|---|
| Invoicing v2 `POST /v2/invoicing/invoices` (create draft) | `app/lib/paypal-write.ts` | 1 Chat to cash, 2 deposit + balance invoices |
| Invoicing v2 conditional rules (early-pay discount) | `app/lib/paypal-write.ts` | 1, 2 ("2% off within 7 days") |
| Invoicing v2 `…/{id}/send` | `app/lib/paypal-write.ts` | 1, 2 (after approval only) |
| Invoicing v2 `…/{id}/remind` | `app/lib/reminders.ts` | 3 reminder ladder |
| Invoicing v2 `GET …/{id}` (re-fetch on webhook) | `app/api/webhooks/paypal/route.ts` | 1 Paid flips live |
| Webhooks `verify-webhook-signature` + `INVOICING.INVOICE.PAID` | `app/api/webhooks/paypal/route.ts` | 1 |
| Invoicing v2 `…/{id}/payments` (record payment, admin fallback) | `app/api/admin/record-payment/route.ts` | 1 (backup path) |
| Agent Toolkit `@paypal/agent-toolkit` read-only: `list_invoices`, `get_invoice`, `search_invoicing`, `list_transactions` | `app/lib/toolkit.ts` | 3 "who pays late?" agent |
| AG Grid + AG Studio (agent framework) | `app/dashboard/*` | 3 who-owes-what, aging, expected landing |
| Nebius Token Factory (`nvidia/nemotron-3-super-120b-a12b`) via AI SDK v4 | `app/lib/llm.ts`, `app/lib/negotiate.ts` | 1 intake draft, 2 AR agent, 3 reminder tone |

## How a deal is made

```
brief ─► intake LLM (no tools) ─► zod draft ─► server checks ─► PendingAction{id, hash}
AP agent (policy JSON) ◄─► AR agent (mandate) — ≤3 rounds, each offer checked by server against the mandate
approve(id, hash) ─► deterministic PayPal calls: create → conditional rule → send
PayPal ─ webhook ─► verify signature → dedupe event.id → re-fetch invoice → DB → dashboard
```

## Guardrails and consent

- **The LLM can't move money or send anything.** It only ever sees read-only tools (`invoices list/get/search`, `disputes list/get`, `transactions list`). The toolkit is built from an explicit allowlist, and `ALL_TOOLS_ENABLED` is never used. A test fails if a tool name contains create, send, refund, accept, pay, cancel, delete or update.
- **Every write needs your click.** Create, send and remind run only through `POST /actions/:id/approve` with the stored payload hash. The server executes exactly the payload you approved. A hash mismatch returns 409, and a replay does nothing.
- **The mandate is enforced in code, not in the prompt.** The server checks each AR-agent offer against the deposit floor, max net days and max discount. Offers that break the mandate never reach the counterparty.
- **Untrusted text stays untrusted.** Briefs and AP-agent messages are wrapped in delimiters and treated as data. The server limits invoices to USD, amounts to more than $0 and at most $10k, discounts to 20%, and due dates to 90 days. Recipients must be on an allowlist (the sandbox buyer domain only).
- **Webhooks are verified.** Each one is signature-checked and deduped on `event.id`, and the invoice is re-fetched by ID so a tampered payload can't mark it Paid.
- **Secrets stay on the server.** They live only in Render env vars and are never `NEXT_PUBLIC_`. The app refuses to boot unless `PAYPAL_ENV=sandbox`. Logs never contain tokens, emails or prompts.
- **The demo can't be used as an open relay.** It sits behind a passcode, has a per-IP rate limit and a Nebius spend cap, and offers a Reset demo button.
- **What is seeded or simulated.** The five clients' 6-month payment history is **seeded demo data** (`seed/seed.json`), and the UI labels it. The "Advance clock" button simulates time for the reminder ladder. Invoices, payments and webhooks in the demo are real PayPal **sandbox** calls.

## Judge access

- Hosted URL: TBD (Render, paid instance; if it's cold, wait 60 s)
- Demo passcode: TBD (also in the Devpost testing instructions)
- Sandbox buyer login (to pay an invoice): TBD email / TBD password. **Sandbox only, no real money.** The REST app secret is never published.
- To run it yourself: `git clone … && cp .env.example .env` (bring your own sandbox REST app + Nebius key), then `npm i && npm run seed && npm run dev`. TBD: confirm this takes ≤10 min from a clean clone.
- Access stays free until judging ends (15 Dec 2026).

## Built with

PayPal Invoicing v2 + Webhooks + Agent Toolkit (Apache-2.0) · AG Grid / AG Studio · Render · APIMatic Context Plugin (dev-time, screenshot TBD) · Nebius Token Factory (NVIDIA Nemotron) · Next.js · Vercel AI SDK v4 · zod
