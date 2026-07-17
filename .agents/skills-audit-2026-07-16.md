# AI Exam Coach — Full Skills Audit

*2026-07-16. Three parallel audits (Design/UX, Marketing/Growth, AI-Architecture) run via installed Claude Code skills, cross-examined with `devils-advocate`. The four highest-leverage technical claims (aiTyping keyframe, model name, duplicate context injection, dead memory fields) were independently verified against the actual source before being included below — see verification notes inline.*

---

## Devil's-Advocate pass — verdicts

### Design / UX

**1. `aiTyping` keyframe undefined (verified: `grep` confirms `index.html` defines `fadeUp`, `pulse`, `loadDot`, `revealUp` — never `aiTyping`, which is referenced live at 5+ call sites in `AIChat.jsx`).**
Steel-man: clearly a copy-paste-and-rename slip from `loadDot` — a one-line fix, not a design failure.
Challenge: severity labeled "Critical" doesn't meet the skill's own bar (data loss/security/outage). Real consequence is "the AI-thinking indicator looks frozen instead of pulsing" — a genuine quality bug, visible on every single AI wait in the app's core loop, but not catastrophic.
**Verdict: Ship with changes — fix immediately (trivial), but re-label severity High, not Critical.**

**2. Quiz feedback has no color transition.**
Steel-man: real, and it's the app's core "did I get it right" moment.
Challenge: "so what" test — ignoring this causes a slightly abrupt visual, not a broken feature. Inflated at "Critical."
**Verdict: Ship with changes — cheap one-line fix, correct to do, but this is Medium, not Critical.**

**3. Zero translucent materials (backdrop-filter).**
Steel-man: real gap vs. Apple's own fluid-interface language.
Challenge: this is a stylistic preference, not a defect — plenty of well-regarded products (Notion, Linear, most Android apps) ship flat opaque surfaces with zero complaints. Treating "no glassmorphism" as a High-severity finding conflates one design philosophy's taste with an objective bug.
**Verdict: Ship with changes, optional — nice-to-have polish, downgrade to Low/Medium, do it opportunistically, not urgently.**

**4. Touch targets under 44×44px.**
Steel-man and challenge both hold: this is a well-established, testable guideline (Apple HIG, WCAG 2.5.5), directly relevant since this app is headed to mobile/App Store, and the fix is mechanical (bump padding/minHeight).
**Verdict: Ship with changes — agree as-is, correctly High, fix before any mobile packaging work starts.**

**5. `StudySession.jsx` missing the i18n prop entirely.**
Steel-man/challenge: legitimate, verifiable (sibling screen `TodaysMission.jsx` receives and uses `t`/`L()`; `StudySession` doesn't). Real impact on the stated 5-language audience, but confined to the study-session screen, not universal.
**Verdict: Ship with changes — agree, correctly scoped as Medium.**

### Marketing / Growth

**6. Zero analytics.**
Steel-man: true, and honestly self-flagged by the audit itself ("every claim in this audit is inference").
Challenge: doesn't cause an outage, so "Critical" per strict definition is a stretch — but it *is* the one finding that gates whether any of the other CRO/onboarding recommendations can ever be validated. Recommend treating it as a process-blocking prerequisite rather than a shippable "fix," and sequence it before spending more effort re-optimizing a funnel nobody's measuring yet.
**Verdict: Ship with changes — add baseline event tracking (signup start/complete, demo-vs-signup, onboarding step completion) before iterating further on copy/CRO.**

**7. Landing copy doesn't mention the "readiness" differentiator.**
Steel-man: real gap between the drafted positioning doc and the shipped copy.
Challenge — **this is the one finding in the whole batch with a genuine process problem**: `.agents/product-marketing.md` was drafted today as a V1 auto-draft and is explicitly awaiting your corrections (you haven't confirmed it yet). Rewriting `Landing.jsx` to match an unconfirmed positioning doc would be building on a foundation that might change. This should be *sequenced after* you confirm/correct the product-marketing doc, not acted on in parallel.
**Verdict: Ship with changes, but only after product-marketing.md is confirmed — do not rewrite Landing.jsx copy yet.**

**8. Pricing plan exposes "which LLM" as the customer-facing value metric.**
Steel-man: sharp, correct product-thinking catch.
Challenge: there is no pricing UI built yet — this is a heads-up about a plan, not a live defect. Labeling it "Critical/blocking" overstates urgency; nothing is currently broken because nothing is shipped.
**Verdict: Ship with changes — valid input for whenever the pricing UI gets designed (per your own memory note, that's planned for end-of-project); not urgent today. Downgrade to Medium-until-relevant.**

**9. "Free · Open Source · No ads" footer — bait-and-switch risk.**
Steel-man: real tension with planned paid tiers.
Challenge, and this is where the audit under-reached: the more urgent question isn't the *future* pricing conflict, it's whether **"Open Source" is even true right now**. Memory records this as `pakhomchik2008/ai-exam-coach-v2` on GitHub — worth confirming that repo is actually public before this claim sits on a live landing page. If it's a private repo, "Open Source" is a false claim today, independent of any future monetization plan.
**Verdict: Ship with changes — verify the "Open Source" claim's accuracy now (separate, more urgent issue); revisit the "Free forever" framing once pricing tiers are closer to shipping.**

**10. Web-only today, no decision on native/wrapped-webview/PWA for App Store.**
Steel-man: correctly identified as the single most consequential open question in the whole audit — it cascades into ASO strategy, App Review risk (Guideline 4.2), and the sync/localStorage question (#11 below).
Challenge: none — if anything this is under-weighted relative to cosmetic findings elsewhere in the same audit.
**Verdict: Rethink/resolve this first — this is the next real decision, ahead of any further design or copy polish.**

**11. Country→exam-type gaps (no French Bac, no Russian-locale exam type).**
Steel-man/challenge: legitimate, narrow, correctly scoped as Medium — a content gap, not an architectural one.
**Verdict: Ship with changes — agree as-is.**

### AI / Context Engineering

**12. Duplicate learner-context injection in ChatMode (VERIFIED by reading `AIChat.jsx` lines ~2421–2513 and `ai-brain.jsx` lines 140–146).**
Confirmed exactly as described: `ChatMode` builds a `brainCtx` string from a `useMemo(..., [])` snapshot (computed once, at mount, never refreshed) and passes it as part of `system` into `complete()` — which resolves to `window.brainComplete`. `brainComplete` (`ai-brain.jsx:140-146`) *also* calls `buildLearnerContext()` fresh and concatenates `[aiLangDirective(), ctx, system]`. So the final prompt sent to the model genuinely contains both a stale, one-time exam/readiness summary and a fresh one, back to back, with no reconciliation.
Steel-man: this likely happened because `brainComplete` was added/hardened after `ChatMode`'s manual `brainCtx` was already written, and nobody went back to remove the now-redundant manual block.
Challenge: could this actually confuse answers, or is it harmless duplication? If a student's readiness changes mid-conversation (they complete a review while chatting), the stale block and fresh block will disagree in the same prompt — a real, not hypothetical, failure mode for a long-lived chat session.
**Verdict: Ship with changes — agree, correctly Critical-adjacent; fix is a deletion (remove the manual `brainCtx` construction in `ChatMode`), not a redesign.**

**13. Zero prompt caching.**
Steel-man: real, and the highest ROI-per-effort item in the whole audit — `cache_control` blocks are a few lines in `api/complete.js`, and the static learner-context/voice-instruction blocks are large and byte-repetitive across every call.
Challenge: none of substance — this is squarely a cost/latency win with no real downside once implemented correctly (need to keep the cached prefix byte-stable, which the audit itself flagged as a risk given scattered inline template reconstruction — finding #10 in the original list).
**Verdict: Ship with changes — agree, high priority, genuinely underrated relative to some of the cosmetic findings above.**

**14. Unbounded chat history.**
Steel-man/challenge: real risk for a screen explicitly designed for open-ended conversation; no counter-evidence found. Correctly scoped High, not Critical, since it degrades gradually (cost, then eventually context-window pressure) rather than breaking immediately.
**Verdict: Ship with changes — agree, add a sliding-window or summarization trigger.**

**15. "Durable memory" fields (`learningStyle`, `preferredExplanations`, `notes`) are permanently empty (VERIFIED: `grep` confirms no call site anywhere writes `learningStyle` or `preferredExplanations` via `updateMemory`, and `rememberNote` — the only writer of `notes` — has zero callers anywhere in the codebase. Only `weaknesses`/`strengths` are actually written, via `commitCoachSession` in `ai-brain.jsx:199-209`).**
Steel-man: the read path and prompt-injection code for these fields (`ai-brain.jsx:39-45`) is fully built and correct — this isn't a broken feature, it's a half-built one where only the write path was never finished.
Challenge: is this actually the product's "biggest gap," or just an unshipped feature? Fair pushback — an empty field the model is told to check ("Preferred learning style: ...") when there's nothing there doesn't actively hurt (the `if (mem.learningStyle)` guards mean an empty field is simply omitted from the prompt, not sent as "unknown"). So this isn't actively misleading the model — it's inert, not broken. That said, it does mean the product's implied memory promise is currently thinner than the code's own comments claim.
**Verdict: Ship with changes — accurate finding, correctly High (not because it's actively harmful today, but because it's the cheapest, highest-narrative-value fix available: wire `rememberNote`/`updateMemory({learningStyle...})` to somewhere in the coaching-session commit flow).**

**16. Model discrepancy: code calls `claude-haiku-4-5-20251001`, prior memory says `claude-sonnet-4-5` (VERIFIED: `grep` confirms `api/complete.js:42` hardcodes the Haiku model id).**
This is a factual mismatch between what's actually deployed and what was recorded in an earlier session's memory — not a code defect, just something to confirm with you directly rather than assume either source is wrong.
**Verdict: Needs your confirmation — see flag below.**

---

## Overall verdict on this audit batch

**Ship with changes.** Two findings (aiTyping severity, quiz-feedback severity) were inflated relative to the skill's own Critical/High/Medium definitions and are re-labeled above. One finding (#7, landing copy) has a real sequencing dependency — don't act on it until you've confirmed the product-marketing draft — that the original audit didn't flag. One finding (#9) actually understates the more urgent question (is "Open Source" true right now, not just "will it conflict later"). Everything else holds up under challenge. The four most consequential, verified-accurate findings, in priority order:

1. **#10 — Resolve web vs. native/wrapped/PWA before any further ASO or launch planning.** Everything downstream depends on this.
2. **#12 — Delete the duplicate stale `brainCtx` in `ChatMode`.** One deletion, removes a real self-contradiction risk.
3. **#13 — Add prompt caching in `api/complete.js`.** Highest ROI-per-line-changed item in the batch.
4. **#15 — Wire up the dead memory fields, or stop claiming the app remembers learning style/preferences until it does.**

## Needs your input directly (not something to just fix)

- **Is `pakhomchik2008/ai-exam-coach-v2` actually a public GitHub repo?** The landing page says "Open Source" — if the repo is private, that line is inaccurate today, independent of the later pricing-tier question.
- **Model confirmation:** `api/complete.js` calls `claude-haiku-4-5-20251001`. An earlier session's memory recorded the model as `claude-sonnet-4-5`. Which is correct / intended?
- **Product-marketing.md is still an unconfirmed V1 draft** (from earlier this session) — findings #7-9 above assume its positioning is correct; hold off acting on copy changes until you've corrected it.

---

## Full findings (as produced by the three audit agents, before the devil's-advocate pass)

### Design/UX Audit
See agent output for the complete list of 17 findings (3 Critical, 4 High, 6 Medium, 3 Low... — re-graded above where the devil's-advocate pass disagreed). Full detail available on request; summary above covers the top 5 by impact.

### Marketing/Growth Audit
See agent output for the complete list of 25 findings across cro, copywriting, signup, onboarding, aso, pricing, and launch. Full detail available on request; summary above covers the top 6 by impact plus the three cross-skill conflicts the audit itself flagged (pricing vs. positioning, copywriting vs. pricing timing, launch vs. product reality).

### AI/Context-Engineering Audit
See agent output for the complete list of 14 findings across context-fundamentals, context-optimization, tool-design, memory-systems, and context-compression. Full detail available on request; summary above covers the top 5 by impact.
