# DuesPilot: changes based on the Meta hackathon winner analysis (11 Nov 2026, 21:00 IST)

Source: D:/hackathons/meta-ai-dev/winners/ANALYSIS.md
Deadline: Fri 13 Nov 01:30 IST (Thu 12 Nov 12:00 PT). Submit target: Thu 12 Nov 20:00 IST. About 23 h left.
Rubric (equal weights): Tech implementation (tiebreak), Design, Potential Impact, Innovation, Presentation (video).

## Keep (already matches the winners)
- Human approval gate with a hash, server-side mandate, allowlist, webhook verify + refetch. For money, a human in the loop is a feature (Meta judges praised it on Basement Ready, Punchwalk and Voluma).
- Hosted live app on Render, public repo, MIT, honest "real vs simulated" section.
- No pivot. No new no-prize sponsors.

## Gaps vs the winners, with fixes (priority order)

### P1. No measured result against a ground truth  (Tech, Impact, Presentation)
Winners all had a headline number checked against something outside their control. We have none.
Fix: `app/eval/`, a script that runs against the real Nemotron and writes `eval/RESULTS.md` + JSON:
- Brief intake: about 40 hand-labelled briefs (25 normal, 15 injection or bad-recipient). Report extraction accuracy (client, line items, total vs label), injections blocked x/15, and false blocks on legit briefs x/25.
- Negotiation sweep: the AR agent vs 10-12 AP policies (easy, pushy, the deposit-refuser, a 60-day demand, a "10% discount or no deal"). Report deals closed, rounds, mandate-breaking offers the model made, how many the server caught (must be all), and how many the model fixed on the next round.
- Reminder tone: every ladder step; the tone checker's pass rate before and after the retry.
- Cost and latency per run.
About 3 h. These numbers go in the README top, the Devpost "What it does"/"Accomplishments", and on screen in the video.

### P2. The verify-and-fix loop isn't visible  (Tech, Innovation, Presentation)
The code already feeds mandate violations back to the model (lib/llm.ts line 27), but the demo only shows a clean deal. Winners showed a failure being caught and fixed on camera (Formwright, oqed, Video2URDF).
Fix:
- Negotiate tab: show each round as offer, then the server check (green/red with the rule broken), then the revised offer. Use a pushy AP policy so the model really overreaches once.
- Reminder tone checker: the known bug is a "firm" reminder that opens with "This is a friendly reminder". Add a plain-code check (banned phrases per tone, required elements: amount, invoice number, due date, pay link). On failure, retry once with the reason, then fall back to the template. Show "checked" on the card.
- A "server rejected / model fixed" counter in the Activity log.
About 2 h, tests first as usual.

### P3. Video structure  (Presentation, 20% and the bit judges remember)
Winners opened on the wow, with real footage, and ended on a live URL. Ours opens on a title card.
New cut (about 2:15):
- 0:00-0:12 cold open: the AP agent demands 10% off and net-60; our agent's offer gets rejected by the server, it revises, deal done, 2 PayPal invoices waiting on one click.
- 0:12-0:30 the problem in his own words (real story, see P5) + the Bonsai 29%-late stat.
- 0:30-1:20 brief, approve, PayPal sends, buyer pays, PAID via the verified webhook; then the injection blocked.
- 1:20-1:45 reminder ladder + the tone checker catching a soft "firm" reminder.
- 1:45-2:05 eval numbers on one card.
- 2:05-2:15 live URL + "nothing moves money without your click".
Cut: the Disputes beat ("this account has none"), the standalone Activity-log beat (fold it into a 3 s overlay).
The pipeline is already automated (video/record_shots.mjs + assemble.py), so re-recording is about 1.5 h. His voice: one new voice note.

### P4. Sponsor prize: use the AG Grid stack properly  (sponsor prize + Design + Impact)
AG Grid's page judges "polish, custom widgets... not just AG Grid on its own". We use plain Community grids. AG Grid has 5 prize slots, the most of any sponsor.
Fix (also adds the cross-border depth the council asked for and we never built):
- AG Charts Community (MIT): an "Expected cash" chart showing USD landing per week over the next 6 weeks, weighted by each client's on-time probability from history, net of PayPal fees (fee % configurable, labelled as an estimate).
- Grid polish: custom cell renderers (status pills, a score bar, an aging bucket), a theme, and the aging buckets as a grouped view.
About 2.5 h. AG Studio trial: if started now it expires about 26 Dec, after judging ends on 15 Dec, so it's safe on dates, but integrating it is too risky for 1 day. Skip.
APIMatic: only claim it if we actually use the Context Plugin for today's build. If yes, write a 2-line note in the README.

### P5. First-person, real-user story  (Impact, Presentation)
Winners: "I grew up in a construction family", "I make games alone".
The current Inspiration says "I bill clients outside India". He must confirm that's true. A real, verifiable version already exists: the Bombay Restaurant site for a client in Marrakech (a cross-border freelance job). If he invoiced or chased that payment, open the video and Inspiration with it, client unnamed.
Optional: 2-3 freelancer friends paste one real (anonymised) brief each, then quote what happened in the README. A real user beats seeded data.

### P6 (only if P1-P4 are done by Thu 12:00). AP side as an LLM agent  (Innovation)
Today the client's AP agent is a rule-based policy. Make it Nemotron writing the AP counter-offers, bounded by its own policy in code, so both sides follow "model proposes, code checks". Disclosed either way. About 3 h. Risky, so it's the last thing.

## Not doing
- No new features outside the above, no Most-Viral chase, no AG Studio, no Render Workflows rewrite.
- Not loosening any guardrail to make the demo flashier.

## Schedule (IST)
- Wed 21:30-01:00: P1 eval harness + run; P2 checker + negotiate UI (tests first). Deploy.
- Thu 08:00-11:00: P4 chart + grid polish. Deploy. Recheck the live site.
- Thu 11:00: he records the voice note (new script); P3 video re-cut; YouTube upload.
- Thu 15:00-18:00: README + Devpost text with eval numbers; form filled in his Chrome.
- Thu 18:00-20:00: he reviews and submits. Hard close Fri 01:30.

## Only he can do
1. Confirm the true Inspiration story (Bombay client or other) and what can be said.
2. One voice note for the new script (about 2:15).
3. Optional: 2-3 real freelancer briefs.
4. YouTube publish click, then the Devpost Submit click.
