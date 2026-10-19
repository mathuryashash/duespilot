# PayPal AI Hackathon — Phase 0 Research Brief

*Compiled 19 Oct 2026 (IST). Sources are numbered [n] and listed at the bottom. Anything marked **[unverified]** is my own knowledge or inference and was not confirmed on a fetched page.*

---

## 0. TL;DR

- **India can enter.** The exclusion list names Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea and OFAC-sanctioned countries. India isn't on it. [1][3]
- **The deadline is earlier than the email said:** **Thu 12 Nov 2026, 12:00 PM PT**, not 2 PM. The site shows "3:00pm EST" [1][2]. US DST ends 1 Nov, so this is **Fri 13 Nov, 01:30 IST**. Plan to submit by **12 Nov, 20:00 IST**.
- **Five equally weighted criteria:** Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation (the video). Before that there is a pass/fail gate on theme fit and on whether you actually use the PayPal APIs. [1]
- **Only 5 of the 10 sponsors have a prize:** AG Grid, APIMatic, Bryntum, Channel3, Render. **Elastic, Postman, Zapier, KERNEL and Astropods have no prize line** in §8 [1], so using them earns nothing extra.
- **Prize cap:** one project can win at most 1 Grand Prize + 1 Sponsor Prize, or 1 Honorable Mention + 1 Sponsor Prize. [1][3]
- **Competition:** about 16,441 registered participants [2b].
- **Recommendation:** Idea A, **"DuesPilot"**: an agentic receivables and cash-flow copilot for cross-border freelancers. It uses the PayPal Agent Toolkit plus an AG Studio dashboard, is hosted on Render, and is built with the APIMatic Context Plugin.

---

## 1. Rules extract

### 1.1 Dates [1]
| Item | PT | IST |
|---|---|---|
| Submission opens | Thu 1 Oct 2026, 9:15 AM | 1 Oct, 21:45 |
| **Submission closes** | **Thu 12 Nov 2026, 12:00 PM** | **Fri 13 Nov, 01:30** |
| Judging | 1 Dec 2:00 PM → 15 Dec 8:00 AM | — |
| Winners | ~Mon 21 Dec 2026, 2:00 PM | — |

You can't edit a submission after the deadline, but drafts can be saved before it. [1]

### 1.2 Eligibility [1][3]
- Who can enter: individuals at or above the age of majority, teams, or organizations. There is no team-size cap, and solo entries are fine. [3]
- Who can't: residents of Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea and OFAC-sanctioned countries; sponsor/Devpost staff and their families; judges. **India is eligible.**
- **Opening a PayPal account is separate from eligibility.** If you can't sign up from your country, ask in the PayPal Discord. [3]
- The project must not have had financial or preferential support from PayPal or Devpost. [1]

### 1.3 Project requirements [1][2]
- Build a new app, or significantly update an existing one, that integrates the **PayPal developer platform (sandbox)** plus **any AI tool, model or platform**. "PayPal integration [must be] central."
- Other PayPal services count too: Venmo, Braintree, Xoom, Honey, Zettle, Paidy, Hyperwallet and others. [1]
- Pre-existing code: allowed only if it was significantly updated after 1 Oct, and you must explain what changed. Sponsor and Devpost decide what counts as significant. [1] *We are starting from scratch, so this doesn't apply.*
- Open-source components are allowed if you comply with their licenses and "build upon" them. [1]
- It must install and run consistently, and work the way the video and text show. [1]

### 1.4 Submission checklist [1][2]
- [ ] Text description of features and functionality
- [ ] **Functional demo**: either full setup/run instructions in the repo, or a **hosted URL**. "A design mockup, static prototype, or non-functional demo does not meet this requirement."
- [ ] **Public repo** on GitHub, Bitbucket or GitLab with all source, assets and instructions, plus an **OSS license file that shows in the About section** (e.g. MIT or Apache-2.0)
- [ ] **Demo video under 3:00**, public on **YouTube**, showing the app running on its target device, with no unlicensed music or third-party trademarks. (The rules say YouTube only. The email mentioned Vimeo; use YouTube to be safe.)
- [ ] Testing access: include any test credentials, sandbox logins and API-key instructions judges need. The project must stay free to test until judging ends (15 Dec). [1]
- [ ] English
- [ ] Judges may score on the text, images and video alone [1], so **the video and README carry most of the weight.**

### 1.5 Judging [1]
- **Stage 1 (pass/fail):** does it fit the theme, and does it "reasonably appl[y] the required APIs/SDKs"?
- **Stage 2 (equal weights):**
  1. **Technological Implementation**: how thoroughly and skillfully it uses PayPal and the AI tools, and whether it is non-trivial and working.
  2. **Design**: a complete, coherent product, not a proof of concept.
  3. **Potential Impact**: a credible, specific problem and audience, backed by what the demo shows.
  4. **Innovation/Idea**: how novel it is compared with existing concepts.
  5. **Presentation**: does the video show it working end to end, and is the problem/audience/why clear?
- Ties are broken by criterion order, so Tech Implementation counts first. [1]
- Judging "may utilize… automated AI-driven analysis." [1] That makes a clean README and an explicit list of PayPal APIs used worth the effort.

### 1.6 IP and publicity [1]
- You keep the IP. Sponsor gets a non-exclusive license for judging, plus promotional use of the project, your name and your likeness for 3 years.
- The work must be original and solely owned by you. Hiring third-party technical help is allowed if the ideas and creativity are yours.

### 1.7 Prizes ($69,750 total) [1]
| Prize | Amount | Qty | Requirement |
|---|---|---|---|
| Grand 1st / 2nd / 3rd | $12k / $8k / $5k | 1 each | all eligible |
| HM: Most Creative, Most Impactful, Best Demo Delivery, **Best Use of PayPal + AI**, **Best Use of Agentic Commerce** | $5k each | 1 each | all eligible |
| **AG Grid** 1st / 2nd / 3rd | $5k / $2k / $1k | 1 / 1 / **3** | "use any AG Grid tools" |
| **APIMatic** | $1k + 6 months Business plan | **3** | "use any APIMatic tools" |
| **Bryntum** | $1k | **3** | "use any Bryntum tools" |
| **Channel3** | $1.5k | 1 | "use any Channel3 tools" |
| **Render** 1st / 2nd / 3rd | $1000 / $750 / $500 **credits** (not cash) | 1 each | "use any Render tools" |

What each sponsor page says beyond the rules:

- **AG Grid** [4]: judged on polish (custom widgets, theming, layout tools, "not just AG Grid or AG Charts on their own") and on use of the **Studio Agent Framework** ("a custom agent talking to Studio's built-in agents, or a swapped-in harness"). There is a free 45-day trial and a **PayPal + AG Studio boilerplate**: `github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate`. *This is the richest sponsor pool: 5 cash slots, $10k total.*
- **APIMatic** [5]: the "Context Plugin for PayPal" feeds PayPal API context to AI coding agents such as Claude Code. No extra credentials needed. Anyone who uses it gets 1 free month of the Basic plan via a form, and winners get 6 months of Business. *It costs almost nothing to use because it's a dev-time tool, but you have to show and explain that you used it.*
- **Bryntum** [6]: Gantt, Scheduler and Calendar. The prize goes to the best use of these, including "an agent that drives the schedule itself." 45-day trial on npm.
- **Channel3** [7]: an API or MCP server over 100M+ products. It must be "a meaningful part of the product experience… Projects that only reference Channel3 without calling it will not meet this requirement." You get 20k free credits with promo code `PAYPAL-HACKATHON-2026`. Only 1 winner.
- **Render** [8]: $50 of credits. Deploy on Render; they specifically push **Render Workflows** for orchestrating agents and background jobs.
- **No prize:** Elastic (14-day trial, after which the project is deleted, or run it locally) [9], Postman, Zapier MCP (14-day Pro trial), KERNEL ($50 credits), Astropods. [9]

---

## 2. PayPal AI tooling and sandbox

### 2.1 Tools listed on the resources page [2b]
- **PayPal Agent Toolkit**, `@paypal/agent-toolkit` [10][12]
  - Supports TypeScript (Vercel AI SDK, LangChain, OpenAI Agents SDK, Bedrock) and Python. Latest release is v1.11.0 (Sep 2026). Apache-2.0.
  - Sandbox is set with `configuration.context.sandbox = true`.
  - Tools by area:
    - **Invoices:** about 20 tools — create, send, remind, QR code, search, update, record payment/refund, conditional rules such as early-pay discounts or auto-cancel, recurring series.
    - **Orders:** create, get, pay (capture).
    - **Refunds:** create, get.
    - **Disputes:** list, get, accept.
    - **Shipment tracking.**
    - **Catalog products.**
    - **Subscriptions:** plans and subscriptions, create/list/update/cancel.
    - **Reporting:** `list_transactions`, `get_merchant_insights` (sales/orders by interval).
- **PayPal MCP server** [11]
  - Local: `npx @paypal/mcp --tools=all` with `PAYPAL_ACCESS_TOKEN` and `PAYPAL_ENVIRONMENT=SANDBOX`.
  - Remote: `https://mcp.sandbox.paypal.com/sse` or `/http`, using an OAuth login or a Bearer token.
  - The remote server adds `search_product`, `create_cart` and `checkout_cart`, but these work "for gift cards only for now." [12]
- **PayPal AI-Toolkit plugin** for Claude Code, Codex and Cursor: skills, commands and the MCP server for building with PayPal. Updated 16 Oct 2026. [13] *A good dev-time companion to APIMatic.*
- **Agentic Commerce Services** [14][15]
  - **Agent Ready** connects PayPal/Braintree merchants to ChatGPT (ACP, via Braintree delegated tokens) and to Google AI Mode/Gemini (UCP, via Google Pay through Braintree or Orders v2).
  - **Store Sync** is for **physical goods, US buyers, USD only**, requires an existing merchant, and needs **an access request form** sent to the PayPal AI team.
  - **Verdict:** none of these are realistic to obtain in 3 weeks. Instead, *simulate* the agentic-commerce pattern (agent → cart → explicit user consent → Orders v2 → capture) using the Agent Toolkit and JS SDK. The Store Sync cart-flow diagram is a good model to copy in the architecture slide. [15]

### 2.2 Sandbox: what works and what to watch
- The sandbox "has the same PayPal API feature set as the live environment." The exceptions are things like account closing, monthly statements and Shops. [16]
- On sign-up you automatically get one business and one personal sandbox account. You can create more and **choose each one's country**. [17] → **Create US business and US personal sandbox accounts and use USD.** That avoids India-specific restrictions on domestic INR transactions.
  - *PayPal India doesn't support domestic INR payments* **[unverified]**.
  - Your own developer login still needs a real PayPal account. Indian PayPal accounts exist; if sign-up fails, use the Discord route in §1.2 [3].
- **Payouts:** live use needs access approval, but "you can set up and test your integration in your sandbox accounts." [18] Venmo payouts are US/USD only. [18]
- **Tokens:** sandbox OAuth tokens last 3–8 hours, so implement refresh. [10] Prefer client-ID/secret auth with the Agent Toolkit over hard-coded tokens.
- **Invoices:** sandbox invoice emails don't reach real inboxes. Pay them by logging in as the sandbox buyer on `sandbox.paypal.com` **[unverified]**. Script this in the demo.
- **Disputes:** the sandbox can create disputes after a buyer pays, via the buyer's Resolution Center **[unverified]**. Seed one before recording.
- **Webhooks:** available [2b]. Sandbox delivery to a Render URL needs a public HTTPS endpoint, which Render provides.
- The resources page also links JS SDK v6, Pay Later, Subscriptions, Invoicing, Payouts, Disputes, Donations and Webhooks. [2b]

### 2.3 AI model
- Any model is allowed. [1]
- **Nebius Token Factory** is OpenAI-compatible, so it plugs into the Vercel AI SDK through `@ai-sdk/openai-compatible`. Pick a model with reliable tool calling (Qwen3 / Llama-3.3-70B / DeepSeek class) **[unverified: which Nebius models support tools]**.
- Keep a fallback model behind an env var.

---

## 3. Idea shortlist (ranked)

Scoring weights are equal across the five criteria. Sponsor prize EV = number of slots × the likely size of the field.

### A. DuesPilot — an agentic receivables copilot for cross-border freelancers ★ RECOMMENDED

**Pitch.**
- **Who it's for:** Indian and other non-US freelancers billing US/EU clients. They lose days chasing payments and have no idea which invoices will actually land.
- **Getting started:** you paste a message, an email thread or a work log ("3 days of UI work for Acme, $40/h, net-15, 2% if paid within 5 days"). The agent drafts a PayPal invoice with line items, **conditional early-pay discount rules**, a QR code and the due date, and sends it once you approve.
- **Daily:** a background agent on Render Workflows checks every invoice and learns each client's payment behaviour from `list_transactions`. It sends **tone-calibrated reminders**: friendly first, firmer later, matching the AG Grid "nudge-bot" idea [4]. It records payments and flags disputes with an AI-drafted response summary.
- **Dashboard:** an **AG Studio** cash-flow dashboard ("who owes what", aging buckets, a 30-day cash forecast, per-client reliability score). Its **custom agent talks to Studio's built-in agents**, so "show me overdue invoices from US clients by week" generates a live widget.

**PayPal APIs:**
- Agent Toolkit Invoicing (create/send/remind/conditional rules/QR/record payment/search/recurring series)
- Transactions/Reporting (`list_transactions`, `get_merchant_insights`)
- Disputes (list/get)
- Webhooks (`INVOICING.INVOICE.PAID`)
- Optional: Orders v2 for an instant "pay a deposit now" checkout with JS SDK v6

**Sponsor prizes targeted:**
- **AG Grid** (primary): 5 slots, $1k–$5k
- **APIMatic** as a free add-on: use the Context Plugin during the build, document it, file the form
- Render credits are a bonus

A project can only win one sponsor prize, so AG Grid is the target and the rest are hedges.

**Demo flow (2:50):**
1. Problem hook (15 s).
2. Paste a WhatsApp-style brief, then the agent proposes an invoice and you approve it.
3. The invoice appears in the sandbox, and the buyer (sandbox persona) pays it.
4. The webhook fires and the dashboard updates live.
5. Fast-forward a simulated clock: a reminder agent sends a gentle nudge, then a firmer one.
6. Ask the NL dashboard "Which clients are slow payers?" and a widget is built.
7. A dispute arrives, and the agent summarises it and drafts a response.
8. Architecture plus "built with" slide.

**Risks:**
- Invoicing agents are a common idea, so novelty depends on the reliability-scoring, forecasting and tone-calibrated reminder angle.
- The AG Studio trial and Agent Framework learning curve, mitigated by the boilerplate [4].
- Sandbox invoice-payment UX.

**Effort:** M (about 60–70 h). Highest fit with the toolkit's strongest area (invoicing has about 20 tools [10]).

**Scores (1–5):** Tech 5 · Design 4 · Impact 4 · Innovation 3 · Presentation 4.

---

### B. HaggleNet — agent-to-agent negotiation and settlement marketplace

**Pitch.**
- A buyer agent with a user-set mandate (budget, must-haves, deadline) negotiates with seller agents that each run a small merchant's pricing policy.
- Products come from **Channel3** search [7]. The two agents haggle over a visible transcript, the buyer agent asks the human for consent once, and the deal settles through a PayPal **Orders v2** order. The seller agent then adds shipment tracking and handles refunds or returns.
- This is directly on the resources page's "two agents negotiating and settling a payment" prompt [2b] and goes after **Best Use of Agentic Commerce**.

**PayPal APIs:** Orders v2 (create/capture via Agent Toolkit + JS SDK v6 approval), Refunds, Shipment Tracking, Catalog Products.

**Sponsor:** **Channel3** (only 1 slot, $1.5k). Render.

**Demo:** set a mandate → watch the negotiation → approve the PayPal popup → sandbox capture → the seller agent ships → the buyer triggers a partial refund.

**Risks:**
- Channel3 items are real retailers' products while the PayPal merchant is a sandbox business. Frame it honestly as "a marketplace of independent sellers whose catalogs are enriched via Channel3".
- LLM negotiation can loop, so cap the number of rounds.
- Only 1 sponsor slot.

**Effort:** M.

**Scores:** Tech 4 · Design 4 · Impact 3 · Innovation 5 · Presentation 5.

---

### C. CrewPay — an agentic scheduler that pays gig crews when jobs are verified

**Pitch.**
- For small service businesses (event staffing, cleaning, tutoring).
- A **Bryntum Scheduler** shows crew rows and job blocks. An agent books jobs from chat, collects the customer deposit (Orders v2), checks completion evidence (photo plus checklist via a vision LLM), then releases the crew's pay through a **sandbox Payouts** batch and invoices the remainder.
- If a payment fails, the agent automatically reschedules or flags the job, matching Bryntum's own "agent-driven rescheduler" idea [6].

**PayPal APIs:** Orders v2, Payouts (sandbox), Invoicing, Webhooks.

**Sponsor:** **Bryntum** (3 slots, $1k). Render.

**Risks:**
- Payouts sandbox behaviour.
- Bryntum learning curve.
- Vision verification can look gimmicky.

**Effort:** M–L.

**Scores:** Tech 4 · Design 4 · Impact 4 · Innovation 4 · Presentation 4.

---

### D. GiftGenie Guardrails — a spend-mandate shopping agent for families

**Pitch.**
- A parent sets a mandate ("₹-equivalent $40 birthday gift, no electronics, approve anything over $25").
- The agent finds gifts with **Channel3** and builds a cart, and anything over the mandate goes to the parent for one-tap approval. Checkout runs through PayPal Orders v2 with an audit trail, or through **remote-MCP gift-card checkout** (gift cards only [12]).
- It's a consumer/"niche audience" play [2b].

**APIs:** Orders v2, Refunds, remote MCP `search_product`/`create_cart`/`checkout_cart`.

**Sponsor:** Channel3.

**Risks:** close to many "AI shopper" entries (low novelty), and remote MCP auth friction.

**Effort:** S–M.

**Scores:** Tech 3 · Design 4 · Impact 3 · Innovation 2 · Presentation 4.

---

**Ranking:**
1. **A** — best sponsor EV (AG Grid 5 slots / $10k), deepest PayPal usage, clear real audience including the user's own Indian-freelancer story.
2. **B** — highest innovation and HM upside, but a thin sponsor pool.
3. **C**.
4. **D**.

**Hedge:** borrow B's "explicit consent + mandate" pattern inside A. The agent never sends money-moving actions without approval, and an audit log is shown. That strengthens the *Best Use of PayPal + AI* HM case.

---

## 4. Build plan — Idea A (DuesPilot)

**Stack:**
- **Frontend:** Next.js (App Router), React, AG Studio (from the paypaldev boilerplate [4]), PayPal JS SDK v6.
- **Agents:** Vercel AI SDK + `@paypal/agent-toolkit/ai-sdk` (sandbox) + Nebius Token Factory LLM. A Render Workflow (or cron worker) runs the reminder and forecast agent.
- **Data:** Postgres on Render.
- **Repo:** MIT license.

### Light prep, 20–30 Oct (about 30–45 min/day, around the other hackathon)
- [ ] 20 Oct: create the PayPal developer account (manually — **I will not create accounts**). Create **US business and US personal** sandbox accounts and a sandbox REST app, and keep the creds in `.env`.
- [ ] 21 Oct: join the PayPal Discord. Ask: (a) can AG Studio Agent Framework features be used on the trial, (b) do sandbox invoice payment and dispute creation work.
- [ ] 22–24 Oct: clone the AG Grid boilerplate and run it locally. Run the Agent Toolkit `examples/` against the sandbox with one Nebius model and confirm tool calling works.
- [ ] 25–27 Oct: install the APIMatic Context Plugin and the PayPal AI-Toolkit plugin in Claude Code. Claim Render $50 credits. Register on Render. Watch the AG Studio and APIMatic webinars.
- [ ] 28–30 Oct: write a 1-page spec, data model and 5 seed clients with realistic invoice histories. Draft the README skeleton.
- **Don't start the Elastic trial** (no prize, and the 14-day deletion).

### Sprint, 31 Oct – 12 Nov
| Day | Goal | Done when |
|---|---|---|
| Fri 31 Oct | Scaffold: Next.js + boilerplate merged, Render deploy pipeline, Postgres, env management, token refresh | Hello-world live on a Render URL |
| Sat 1 Nov | **Intake agent**: brief → structured invoice JSON (zod) → approval UI → `create_invoice` + `send_invoice` + conditional rules + QR | Real sandbox invoice created from free text |
| Sun 2 Nov | Payment loop: buyer pays in sandbox → **webhook** `INVOICING.INVOICE.PAID` → DB → UI | Paid status flips without a refresh |
| Mon 3 Nov | Sync job: `list_transactions` / `search_invoicing` → per-client payment history and reliability score | Scores visible for seed clients |
| Tue 4 Nov | **Reminder agent** (Render Workflow/cron): escalation ladder, LLM-written tone-calibrated nudges, `send_invoice_reminder`, audit log, "simulate clock" control | Demo-able reminder sequence |
| Wed 5 Nov | **AG Studio dashboard**: aging buckets, who-owes-what scoreboard (custom widget), 30-day cash forecast, theming | Polished dashboard on live data |
| Thu 6 Nov | **Studio Agent Framework**: custom DuesPilot agent ↔ Studio built-in agents for NL widget creation | "Show slow payers by week" builds a widget |
| Fri 7 Nov | Disputes: list/get → AI summary + suggested response. Optional deposit checkout via JS SDK v6 Orders | Seeded dispute handled in the UI |
| Sat 8 Nov | Design pass: onboarding, empty states, error handling, mobile check, guardrails (approval before any money-moving or sending call) | Fresh user finishes the flow unaided |
| Sun 9 Nov | **Feature freeze.** README (problem, architecture diagram, PayPal APIs table, sponsor tools, how APIMatic was used, setup, judge sandbox creds), LICENSE, seed script | A clean clone runs in ≤10 min |
| Mon 10 Nov | Record video (script below), edit, upload to YouTube (public) | Video under 2:55 |
| Tue 11 Nov | Devpost write-up and screenshots, APIMatic form, buffer for bugs, check Render isn't sleeping (warm it / paid instance via credits) | Draft saved on Devpost |
| Wed 12 Nov | **Submit by 20:00 IST** (hard deadline 13 Nov 01:30 IST) | Submitted ✓ |

**Cut list** (drop in this order if behind): deposit checkout → disputes → forecast widget → recurring series. **Never cut:** intake → invoice → pay → webhook → dashboard → reminder agent.

### Demo video storyboard (target 2:45)
| t | Shot | VO |
|---|---|---|
| 0:00–0:15 | Face/text card: "Freelancers in India wait 30+ days for overseas clients" **[unverified stat — replace with a sourced one or drop]** | Problem, who it's for |
| 0:15–0:25 | Product title + one-line value | "DuesPilot: an AI agent that gets you paid, on PayPal." |
| 0:25–0:55 | Paste a client brief → agent shows a draft invoice with an early-pay discount → click Approve → PayPal invoice in sandbox | Agent → PayPal Invoicing via Agent Toolkit |
| 0:55–1:15 | Switch to the sandbox buyer, pay → back in the app, the webhook flips it to Paid and the dashboard ticks | Real sandbox money movement |
| 1:15–1:45 | Simulated clock +7 days: reminder agent's escalating nudges, tone tuned by client score, audit log | Autonomous but consent-gated |
| 1:45–2:15 | AG Studio: type "overdue invoices by client, US only" → widget appears; cash forecast | AG Studio Agent Framework |
| 2:15–2:30 | Dispute arrives → AI summary + suggested reply | Breadth of PayPal usage |
| 2:30–2:45 | Architecture diagram + "Built with PayPal Agent Toolkit, AG Studio, Render, APIMatic, Nebius" + repo/URL | Wrap-up |

Use royalty-free or no music and blur any personal data. [1]

---

## 5. Open questions (ask in Discord)
1. AG Grid trial: is the Studio Agent Framework included in the 45-day trial license?
2. Do sandbox invoices and webhooks fire reliably, and how do you trigger a sandbox dispute on an invoice payment?
3. Can a judge use a shared sandbox buyer login (put it in the README)?
4. Do Render credits cover a non-sleeping instance until 15 Dec, so judges can test?

---

## Sources
1. Official Rules — https://paypalaihackathon.devpost.com/rules
2. Overview — https://paypalaihackathon.devpost.com/
   - 2b. Resources (participant count, AI tooling, inspiration) — https://paypalaihackathon.devpost.com/resources
3. FAQs — https://paypalaihackathon.devpost.com/details/faqs
4. AG Grid sponsor page — https://paypalaihackathon.devpost.com/details/aggrid
5. APIMatic sponsor page — https://paypalaihackathon.devpost.com/details/apimatic
6. Bryntum sponsor page — https://paypalaihackathon.devpost.com/details/bryntum
7. Channel3 sponsor page — https://paypalaihackathon.devpost.com/details/channel3
8. Render sponsor page — https://paypalaihackathon.devpost.com/details/render
9. Elastic / Postman / Zapier / KERNEL / Astropods pages — https://paypalaihackathon.devpost.com/details/elastic , …/postman , …/zapier , …/kernel , …/astropods
10. PayPal Agent Toolkit repo — https://github.com/paypal/agent-toolkit
11. PayPal MCP server quickstart — https://developer.paypal.com/tools/mcp-server/
12. Agent tools reference — https://developer.paypal.com/ai-tools/agent-tools/
13. PayPal AI-Toolkit (coding-agent plugin) — https://github.com/paypal/AI-Toolkit
14. Agent Ready overview — https://docs.paypal.ai/growth/agentic-commerce/agent-ready/overview
15. Store Sync overview / integrate — https://developer.paypal.com/store-sync/overview.md , https://developer.paypal.com/store-sync/integrate.md
16. Sandbox testing guide — https://developer.paypal.com/tools/sandbox/
17. Sandbox accounts — https://developer.paypal.com/tools/sandbox/accounts/
18. Payouts overview — https://developer.paypal.com/docs/payouts/standard/
19. Starter repo — https://github.com/paypaldev/getting-started-with-paypal-sandbox
