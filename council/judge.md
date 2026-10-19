APPROVE

# Judge / Product Council Review: PayPal AI Hackathon shortlist

**Verdict:** go with DuesPilot (A), with one change: make it **two-sided, agent-to-agent receivables**. The freelancer's AR agent negotiates payment terms with the client's AP agent, and the deal settles on PayPal. As written, A is the safest build. Without this change it is also the easiest to forget among what I expect to be dozens of "AI invoice generator" entries.

## Independent ranking (win probability = grand prize/HM + one sponsor prize)

| # | Idea | Rough P(any prize) | Why |
|---|---|---|---|
| 1 | **A′ DuesPilot + AP-agent negotiation** | ~15–20% | Uses the invoicing tools in depth (Tech is the tiebreak criterion), has a real audience, and goes for AG Grid (5 slots). The negotiation beat makes it eligible for the *Agentic Commerce* and *PayPal + AI* HMs. |
| 2 | A as written | ~10–12% | Strong on Tech and Design, but Innovation is about 3/5 in a crowded field. AG Grid is crowded too, because PayPal publishes the boilerplate. |
| 3 | B HaggleNet | ~8–10% | Best Innovation and Presentation scores, but it is the generic "agents haggle" demo the resources page itself suggests, so expect copies. Channel3 has 1 slot, and the real-retailer vs sandbox-merchant mismatch hurts Impact. |
| 4 | C CrewPay | ~6–8% | Bryntum's 3 slots are a less crowded pool. But it is effort L for a solo builder, Payouts sandbox behaviour is unverified, and vision verification looks gimmicky. |
| 5 | D GiftGenie | ~2–4% | Low novelty. Gift-card-only MCP checkout makes it look like a toy. |

## Findings

1. **SHOULD: change the pitch from "AI invoicing" to "your AR agent gets paid by their AP agent."**
   - Add a minimal client-side AP agent: a policy JSON (budget cycle, max upfront %, preferred terms) plus an LLM.
   - It replies to an invoice with something like "can we do 50% now, rest net-30?"
   - DuesPilot checks the freelancer's **mandate** (floor terms, minimum deposit) and the client's **reliability score**, then makes a counter-offer.
   - The agreed deal settles as a PayPal deposit (Orders v2, or an invoice with partial payment allowed) plus a balance invoice that carries the early-pay conditional rule.
   - The transcript is bounded to ≤3 rounds and needs one human consent click.
   - This takes B's novelty, attaches it to A's real problem, and gives a credible *Best Use of Agentic Commerce* story: B2B agent-to-agent settlement, which is still commerce. Pay for it by cutting **Disputes**. Dispute seeding is unverified, it is the weakest beat, and few people will remember it.
2. **SHOULD: AG Grid trial timing could break judging.**
   - The trial lasts 45 days. Starting it on 22 Oct means it expires around 6 Dec, but judging runs **1–15 Dec** and the rules require the demo to stay testable.
   - Start the trial no earlier than about 31 Oct, or get written confirmation in Discord that a hackathon or extended key exists.
   - Also check what AG Studio does when no licence is present (watermark vs hard failure).
3. **SHOULD: prove Nebius tool calling on day 1 of prep, not day 3.**
   - The Agent Toolkit exposes about 20 invoice tools. Open models often call the wrong tool or mangle schemas when they see that many.
   - Give each agent a curated subset of 4–6 tools, and keep an OpenAI-compatible fallback model behind an env var.
   - If Nemotron is unreliable, record the demo on whichever model works and mention Nebius in the README only where it was actually used.
4. **SHOULD: fit the storyboard to 3 minutes.** The current storyboard has 7 beats in 2:45, which won't fit. Judges remember three things, so build the video around the three moments below and skip a long intro.
5. **SHOULD: make the cross-border angle concrete, not just a label.**
   - Show an **"expected landing" card**: amount, date and estimated net after PayPal fees/FX, driven by each client's payment history.
   - For Indian users, the invoice can carry export-of-services details (an LUT/zero-rated GST note and an invoice number for the purpose code). PayPal India's purpose-code requirement is **[unverified for 2026]** and needs checking.
   - This is a few hours of work and makes "for Indian freelancers" read as domain expertise. Keep it as one beat, because the judges are probably US-based.
6. **SHOULD: what to say about the prize stack.**
   - The cap allows 1 HM + 1 sponsor prize. The realistic stack is an **Agentic Commerce or PayPal+AI HM plus AG Grid**.
   - Render credits only count if AG Grid doesn't win, and APIMatic is a dev-time hedge.
   - Don't dilute the build chasing Render Workflows. A cron worker on Render is enough, so call it "Render" and not "Workflows" unless you actually use Workflows.
7. **SHOULD: aim at automated AI judging.** The README should open with a table: *PayPal API/tool → file → what it does in the demo*. It should also include a short consent/guardrail section, i.e. no money-moving or sending call without approval, with an audit log.
8. **NIT:** the "30+ days" stat is unverified. Replace it with a sourced figure (e.g. the Payoneer freelancer income survey or the FICCI/NITI freelancer report), or remove it.
9. **NIT:** "DuesPilot" is fine. Consider "AR Agent" wording in the tagline so judges file it under agentic, not under forms.
10. **NIT:** pre-seed 5 clients with distinct payment personalities (prompt, slow, haggler, ghost, disputes). Each demo beat then has a client designed to produce it.

## The 3 demo moments judges should remember

1. **"Chat to cash" in 20 seconds.**
   - Paste a WhatsApp-style brief, and a real PayPal sandbox invoice appears with line items, an early-pay discount rule and a QR code.
   - Then switch to the sandbox buyer, pay, and watch the webhook flip the dashboard to Paid live with no refresh.
   - This proves it's real PayPal and works end to end (Tech gate).
2. **Two agents agree terms on screen.**
   - The client's AP agent asks for 50% now and the rest net-30.
   - DuesPilot checks the mandate and the client's reliability score of 62, and counters with a 40% deposit, the balance at net-15, and 2% off if paid within 5 days.
   - The human approves with one click, and PayPal creates the deposit order and the balance invoice.
   - This covers Innovation and Agentic Commerce, and nobody else's invoice bot will have it.
3. **Ask the money question, get a live AG Studio widget.**
   - Type "who will pay me late this month, in INR after fees?" and an aging and landing-forecast widget builds itself.
   - Cut straight to the simulated-clock reminder ladder, where the tone shifts from friendly to firm based on client score.
   - This covers Design and AG Grid's Agent Framework criterion.

**Never cut:** brief → invoice → pay → webhook → negotiation → dashboard. **Cut first:** disputes, then recurring series, then the forecast's FX detail.
