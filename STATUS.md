# STATUS — 20 Oct 2026

- **Plan and deadline:** we're building DuesPilot A′ (see `PLAN.md`). Submit by **12 Nov, 20:00 IST**. The hard deadline is 13 Nov, 01:30 IST.
- **Done today:** studied PayPal's AG Grid starter project. Notes are in `ref/NOTES.md`. It uses plain REST calls to PayPal, with no toolkit. It has **no license file**, so we copy its patterns and don't paste its code. AG trial not started.
- **Done today:** demo data in `seed/seed.json`: 5 clients and 26 invoices from April to October. The haggler client scores 62, which matches demo moment 2. 7 tests pass (`cd spike && npm test`), and the typecheck is clean.
- **Done today:** live negotiation test with Nemotron Super and fake PayPal tools. It settled in 2 of 3 rounds: 40% deposit, the rest due in 15 days, 2% off if paid within 7 days. It kept to the freelancer's limits and filled in the tool fields correctly every round. Cost was about 2.4k tokens. The full transcript is in `spike/negotiation_transcript.json`.
- **Watch out:** Nemotron skipped the optional step of checking past invoices. In the real app, the server should look those up itself rather than wait for the model to ask.
- **Done today:** README draft in `app-readme-draft.md`. Its late-payment stat is sourced: Bonsai found 29% of freelance invoices were paid late. Also set up git with `.env*`, `node_modules` and the starter project's code excluded.
- **Next (22 Oct, needs PayPal credentials):** run `spike.ts` with `RUN_LLM=1` to check that `list_invoices` really works 3 times out of 3.
- **Blocked on you:** a PayPal developer account, a **US business** and a **US personal** sandbox account, and a sandbox REST app. Put the keys in `D:/hackathons/paypal-ai/.env`.
- **Ask in the PayPal Discord:** the AG trial (does it last through 15 Dec, and can the key be public?), whether sandbox webhooks work reliably, whether judges can share a buyer login, whether Render can stay awake through 15 Dec, and **whether we may copy code from the starter project**, since it has no license.
- **Don't start the AG Grid trial before 31 Oct.**
