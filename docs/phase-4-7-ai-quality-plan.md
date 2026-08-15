# Phase 4.7 — AI answer quality

Hlib found the classic tell in production: **the longest option is the
correct one.** A student who notices scores well above chance without knowing
the subject, and trains the wrong reflex for the real paper. It is not a model
problem — every LLM writes the answer it believes more carefully than the
distractors — so the fix sits between the parse and the screen.

Scope decided in chat: lint everywhere now, model routing already agreed in
`phase-5-billing-tiers-plan.md`, blind verification later and only where the
cost of a wrong question is high. Everything on Sonnet was rejected: it costs
5-15× the quota, guts the Max tier's reason to exist, and does not fix length
bias anyway.

## Shipped

| Piece | Where |
|---|---|
| Lint layer (5 checks) | `src/lib/question-lint.ts` |
| Golden set, 20 recorded bad questions | `src/lib/question-lint.test.ts` |
| Answer-position plan injected into prompts | `mcqRulesBlock()` in every MCQ system prompt |
| Post-parse shuffle | `shuffleMcq()`, applied by `filterMcqBatch()` |
| Live prompt eval | `src/lib/ai-quality.eval.ts`, `npm run eval` |
| Visible drop count | Learn Drill/Prove, Speed Round summary, Exam Sim recap |
| Every failed JSON parse names itself | `reportParseFailure()` in `ai-brain.jsx` |
| One repair round-trip on malformed JSON | `brainCompleteJSON()` — every structured AI caller, including curriculum, enrichment, onboarding hours, Speaking, study guide, Quick Check |
| Weak teach-back fail-closed | `src/lib/weak-transcript.ts` — 5 golden transcripts, no model |
| Language lint on theory + flashcards | `mixedLanguage` / `filterFlashcards` |

### The five checks

| Reason | Rule | Why not stricter |
|---|---|---|
| `length-bias` | Correct is the longest AND ≥35% above the distractor mean AND ≥12 chars above it | A flat ±25% corridor rejects legitimate maths where "no real solutions" sits next to `$x=2$` |
| `catch-all-option` | "all/none of the above", "both A and B", plus uk/ru/fr/de forms | Free marks; no real paper uses them |
| `duplicate-option` | Two options equal after light normalization | Cannot reuse `normalizeQuestionText` — it strips signs, so `$x=2$` and `$x=-2$` collapse |
| `explanation-echo` | Levenshtein similarity ≥0.85 between explanation and correct option | Whole-string, not containment: a good explanation quotes the answer, a useless one *is* the answer |
| `language-mix` | Script share <50%, or uk-only vs ru-only letters in the wrong paper | Abstains under 8 letters and on unmodelled languages; LaTeX is stripped first |

### Position bias is handled twice

`planCorrectIndices(n, 4)` writes the target index for each question into the
prompt, so the model's own `"correct":0` habit is overridden **before**
generation. `shuffleMcq` permutes again after parsing, so a model that ignored
the plan still lands somewhere random. Hlib's point, implemented both ways.

### Nothing is dropped silently

Before this phase every generator ended in `.filter(...)`: a malformed batch
just rendered shorter and nobody knew. Now `filterMcqBatch` returns
`{ kept, rejected: [{ index, reasons }] }`, `reportRejections()` logs it, and
the student sees "N questions failed the quality check".

The same was true one level up. `parseJSON` returned its fallback on four
different failures without a word, and every generator called it directly, so
a model that wrapped its JSON in a sentence produced an empty lesson with no
trace. Now each failure is named, and the generators go through
`brainCompleteJSON`, which hands the model back its own broken output once and
asks for JSON only. The repair call only happens when something is already
wrong; a reply that parses costs exactly what it did before. A `PARSE_FAILED`
sentinel keeps a legitimate `null` in the model's JSON from looking like a
failed parse.

## Explicitly not done

| Item | Why |
|---|---|
| `franc.js` | New dependency for one function, and unreliable on strings as short as an option. 25 lines of script + alphabet-marker detection covers the actual uk/ru bug |
| `zod` | The silent drop is a *behaviour* bug, not a missing validator. Hand-written parsers already exist in `drill-exercises.ts`; rewriting them onto schemas buys the same result plus a dependency |
| Real Sentry | `window.Sentry` is an optional hook and nothing is installed. Installing it is its own decision (dependency + DSN + env). Until then the console is the sink and the visible count is the real signal |
| Golden set on live prompts in CI | Fixtures test the linter, not the prompt. Testing a prompt needs real calls: money, flake, and no key on fork PRs. That is `npm run eval`, run by hand |
| V4 blind second-pass | Blocked on the model router (slice **5c**) — see below |
| Human question bank | Content pipeline, not a code feature. Belongs with the content quality gates in the pricing addendum, not as a parallel track |

## V4 — deferred to after slice 5c, design fixed

Two things had to be corrected before this could be built, both against the
assumption that per-task model routing already exists:

- **There is no router.** `api/complete.js` hardcodes
  `claude-haiku-4-5-20251001`. `phase-5-billing-tiers-plan.md` says so itself
  under "Where we are", and the router is slice 5c, behind 5a entitlements,
  behind billing. Everything in the app runs on Haiku today, Prove and Exam Sim
  included. The `LearnMain.jsx` comment claiming "one Sonnet call" is stale.
- **Exam Sim is not on the agreed Sonnet list.** The locked list is Socratic,
  Fading hints, essay scoring, *Prove explanations*, theory `complexity >= 4`,
  Feynman — with "everything else stays Haiku, including flashcards, MCQ,
  novelty/dedup". Sonnet is also Max-only and capped at 40/day, so a Sonnet
  verifier is unavailable to Free and Pro by construction.

A same-model verifier catches ambiguous stems and a mistyped key, but not a
misconception the model holds confidently — it will be confidently wrong twice.
Hlib's call: wait for the router rather than ship the weaker version.

When it lands:

- Verification is **batched**, never per question. Exam Sim builds up to 40
  questions in 6-question chunks racing a 45 s timeout under a 60 s
  `maxDuration`; one blind call per chunk, issued in parallel with the others,
  costs ≈1.1× and adds no wall-clock. Per-question doubling blows both budgets.
- The verifier sees stems and options with no key, answers by index, and the
  answers are compared against the stored key.
- On mismatch the question is **dropped**, generation over-asks to cover it,
  and the count is shown to the student — the same path lint rejections take.
  Not flipping the key: a verifier confident enough to overrule the generator
  is confident enough to be wrong.

## Decision Log

Numbering continues after `phase-5-billing-tiers-plan.md`, which reaches #86.

| # | Decision | Why |
|---|---|---|
| 87 | Lint between parse and render, not a better prompt | A prompt rule is a request; a lint is a guarantee. Both ship, only one is enforceable |
| 88 | Answer position planned in the prompt *and* shuffled after | The prompt kills the model's positional habit at the source; the shuffle covers the model ignoring it |
| 89 | Own 25-line language check instead of `franc.js` | Repo rule against a dependency per utility, and franc is weak on option-length strings |
| 90 | Harden existing parsers instead of adopting `zod` | The bug was swallowing rejects, not failing to detect them |
| 91 | Golden set is fixtures; prompts get a separate manual eval | A CI gate that costs money and flakes gets disabled within a month |
| 92 | Over-generate and drop rather than regenerate | Prove asks for 4 to keep 3. A retry costs a second 30 s race and another quota hit for one bad question |
| 93 | Dropped questions are shown to the student | A short drill with no explanation reads as a bug in the app, which it was |
| 94 | Exactly one repair round-trip, not a retry loop | A model that fails twice will fail a third time, and the caller is holding a 30-45 s race |
| 95 | Generators call `brainCompleteJSON` instead of parsing by hand | Repair and reporting live in one place; five copies of the fenceless-slice pattern cannot each grow a retry |
| 96 | Official syllabus / hours / topic-name calls set `includeContext: false` | Learner mastery must not rewrite an exam board's topic list |
| 97 | Weak teach-backs fail locally, before the grader | The model praises "idk". A prompt rule is a request; `isWeakTeachBack` is the guarantee CI can enforce without a key |
| 98 | Explicit `pass: false` wins over score >= 6 | `parseExplainGrade` used to OR them, so a fail with score 6 still passed |
| 99 | Remaining `claude.complete` sites converted, not left as a fallback | A `brainComplete` fallback to `claude.complete` still skipped repair; the last StudyHub / Burnout / Recap / curriculum / enrichment / onboarding callers were that pattern |

## What could break silently

| Risk | Signal | Guard |
|---|---|---|
| Lint too strict, most questions rejected | Drills consistently shorter than asked | Visible count; `npm run eval` prints the clean rate |
| A paper language outside the modelled set | Language mix ships unnoticed | `languageMismatch` abstains rather than guessing; the golden set pins uk/ru/pl behaviour |
| Prompt edited, `mcqRulesBlock` dropped from it | Bias creeps back, fixtures still pass | `npm run eval` is the only real detector — run it after touching an MCQ prompt |
| Model starts honouring the index plan literally in every batch | Answers cluster where the plan put them | The post-parse shuffle makes the plan irrelevant to the final layout |
| `explanation-echo` firing on legitimately short answers | Good questions vanish | Whole-string similarity + the 0.85 floor; the "24 cm²" fixture pins it |
| Repair round-trip pushes a generation past its client race | Feature fails with "Took too long" instead of bad JSON | Only fires on an already-broken reply, so the alternative was failing anyway; watch for a rise in timeout errors after deploy |
| `window.Sentry` never gets installed | Parse failures pile up in a console nobody reads | The student-visible drop count is the fallback signal; installing Sentry is its own call |

## Reversibility

Delete the `filterMcqBatch` call at any site and it returns to the previous
behaviour. Remove `mcqRulesBlock(...)` from a prompt and only the pre-generation
half of the position fix is gone. `npm run eval` is standalone — it shares no
config with `npm test` and cannot break the gate.
