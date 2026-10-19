# Boilerplate notes — paypaldev/hackathon-paypal-ag-grid-boilerplate

Cloned 20 Oct 2026, commit `5de114e` (12 Oct 2026). Read only. No AG trial started.
Path: `ref/hackathon-paypal-ag-grid-boilerplate/` (ref/ is gitignored).

## Stack
- Next.js **16.3.6** (App Router; its AGENTS.md warns APIs differ from older Next, read `node_modules/next/dist/docs/`), React 19.2.8, Tailwind 4, TS 5.
- `ag-grid-community` / `ag-grid-react` **36.2.0** (free, endpoint pages), `ag-studio` / `ag-studio-react` **3.0.0** (dashboard, licence key via `AG_STUDIO` env).
- No PayPal SDK and no agent toolkit: plain `fetch` in `lib/paypal.ts`. No DB. Reports saved in browser localStorage.
- **No LICENSE file** (GitHub API `license: null`). Treat as all-rights-reserved: copy patterns, re-type code, credit it in README; ask in Discord whether copying is OK.

## How PayPal is wired
- `lib/paypal.ts`: sandbox base URL hard-coded (`api-m.sandbox.paypal.com`), client-credentials OAuth cached until 60 s before expiry, `get()` retries 401 once (re-mint) and 429/5xx with backoff, `listAll()` follows `page/total_pages`.
- Env names: `PAYPAL_CLIENT_ID`, **`PAYPAL_SECRET`** (not `_CLIENT_SECRET` like our spike — pick one).
- Read calls only: products, plans, `GET /v2/invoicing/invoices` (+ per-id detail because list omits items/payments), `/v1/reporting/transactions` (≤31 days per call, up to 3 h lag), `/v1/reporting/balances`.
- Hand-written `Invoice` type with all 12 statuses — reuse as-is for our webhook re-fetch.
- Every page is a server component with `await connection()` → per-request live data; secrets never reach the client.

## How AG Grid / AG Studio is wired
- `app/(endpoints)/data-grid.tsx`: one client `DataGrid` with module-registered features, PayPal-token theme (`themeQuartz.withParams`), `type: 'money'` column type, quick filter. Server pages pass plain-data `ColDef`s.
- `lib/dashboard-data.ts`: flattens PayPal responses into tables (customers keyed by lower-cased email, invoices with `outstanding`, `daysOverdue`, `agingBucket`, `daysToPay`, payments, items…).
- `app/dashboard/studio/data.ts`: AG Studio data sources + many-to-one relations + calendar + ratio measures. `initial-report.ts` = default report. `theme.ts` = PayPal theme.
- AI: `studio/ai.ts` → `createAiHarness` with an `openaiAdapter` (client-side, from AG docs) that POSTs to `/api/ai/responses`; route adds the server key, whitelists models, caps output tokens, streams SSE back. Uses the **OpenAI Responses API** shape. Route has **no auth/rate limit** (README says so).

## What we reuse (31 Oct)
1. `lib/paypal.ts` token + retry + paging pattern → our REST client; add POST (create/send/remind/conditional rules) behind the approve endpoint.
2. `Invoice` types + `dashboard-data.ts` aging/days-to-pay logic → our who-owes-what grid; add `reliabilityScore`, `expectedLanding` columns from seed + webhook data.
3. `DataGrid` + theme for the negotiation transcript and audit-log grids.
4. Studio data-source/relations setup → feed it our Postgres rows instead of live list calls.
5. `/api/ai/responses` proxy → add passcode + rate limit. Open question: point it at Nebius instead of OpenAI. Token Factory answers `POST /v1/responses` with 401 (not 404), so a Responses endpoint may exist — **unverified**, test once with key on 31 Oct; fallback is the documented custom agent emitting widget config.

## Skip
Products/plans/balances pages, multi-currency handling (we're USD only), reports-store localStorage UX beyond the default report.
