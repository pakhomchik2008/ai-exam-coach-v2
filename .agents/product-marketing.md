# Product Marketing Context

*Last updated: 2026-07-16 (V1 draft — auto-generated from codebase, needs review)*

## Product Overview
**One-liner:** An AI study coach that builds a day-by-day, adapting revision plan and tells you whether you're on track for your target grade.
**What it does:** Students add their exams (subject + board/exam type + current and target grade), and the app generates and continuously re-paces a personalized study schedule. A single "readiness" score, derived from confidence ratings and spaced review, drives predicted grade, risk, and daily recommendations across every screen — plus an AI coach for lessons, quizzes, and flashcards generated from uploaded material.
**Product category:** AI-powered study planner / exam revision coach (adjacent to spaced-repetition and tutoring apps).
**Product type:** Web app today (no-build React, deployed to Vercel), aimed at an App Store (mobile) launch.
**Business model:** Currently free, no ads (per landing page). Subscription tiers are planned but not yet built — see below.

## Target Audience
**Target companies:** N/A — B2C, individual learners.
**Decision-makers:** The student themselves (self-serve signup); for younger students (GCSE) a parent may be involved in discovery/payment but not day-to-day use.
**Primary use case:** "Tell me what to study today and whether I'm actually going to hit my target grade."
**Jobs to be done:**
- Turn an exam date + current ability into a realistic, adapting daily study plan
- Know, at a glance, whether current effort is enough to hit the target grade
- Get an AI tutor that reviews weak topics, not a generic chatbot
**Use cases:**
- GCSE / A-Level students (UK) revising for board exams (AQA referenced)
- SAT / ACT / AP students (US)
- IB students
- University students (GPA-based, plus a "1st/2:1/2:2/3rd" UK degree-classification option and German/French grading scales)
- App is localized into English, Ukrainian, Russian, French, and German — suggests an international, not just UK/US, learner base

## Personas
Single persona (B2C) — not applicable in the multi-stakeholder B2B sense. If parents-as-payers turns out to matter for GCSE-age users, worth splitting out later.

## Problems & Pain Points
**Core problem:** Students don't know what to study next or whether they're actually on pace — revision is usually unstructured (re-reading notes, generic flashcard decks) with no feedback loop tied to a real exam date and target grade.
**Why alternatives fall short:**
- Static calendar/planner apps don't adapt to how well the student actually knows each topic
- Flashcard apps (Anki, Quizlet) track repetition, not exam-readiness or grade probability
- Generic AI chatbots (ChatGPT) have no memory of the student's syllabus, past mistakes, or progress
**What it costs them:** Wasted revision time on topics already mastered, under-revising weak spots, exam-day surprises, avoidable anxiety.
**Emotional tension:** Anxiety about not knowing if they're "on track"; guilt/overwhelm from an unstructured to-do list of "everything I should study."

## Competitive Landscape
**Direct:** AI tutoring/study-planner apps (e.g. Khanmigo, various "AI study planner" apps) — mostly chat-first, not readiness/grade-driven.
**Secondary:** Spaced-repetition and flashcard tools (Anki, Quizlet) — solve retention, not planning or grade prediction.
**Indirect:** Manual planning (spreadsheets, paper planners, private tutors) — flexible but no adaptive feedback and time-intensive to maintain.

*(Draft — I haven't independently researched competitors; treat this section as placeholder until you or the `competitor-profiling` skill validates it.)*

## Differentiation
**Key differentiators:**
- One real "brain" (single source of truth) drives readiness → predicted grade → risk → daily pace on every screen — no two screens can disagree, unlike apps that recompute progress per-view
- Confidence-based pacing: the plan reacts to how sure the student says they felt about a topic, not just whether they reviewed it
- AI coach is wired into the student's actual syllabus/mistakes/progress, not a bolted-on generic chat
**How we do it differently:** Central adaptive scheduling engine + per-topic mastery/retention model, exposed consistently across dashboard, plan, sessions, and chat.
**Why that's better:** Less wasted revision time, clearer "am I on track" signal, feels personalized rather than generic.
**Why customers choose us:** Concrete, trustworthy answer to "will I hit my target grade if I keep going like this" — something neither flashcard apps nor generic AI chat give.

## Objections
| Objection | Response |
|-----------|----------|
| "Another study app I'll abandon in a week" | Draft response — needs real answer once you have retention data or a hook (e.g. daily plan takes <2 min to review). |
| "Will it actually know my exam board's syllabus?" | Curriculum data currently covers GCSE/A-Level (AQA), SAT, ACT, IB, AP, and university grading — needs a clear answer on syllabus depth/accuracy. |
| "Is my data safe / where's it stored?" | Currently: all data lives in the browser's localStorage, nothing synced or shared — a genuine privacy plus, but also means no cross-device sync yet (may itself be an objection). |

**Anti-persona:** Students who want a passive video-course experience rather than active daily planning/practice; students without a fixed exam date (nothing to plan against).

## Switching Dynamics
**Push:** Frustration with unstructured revision, uncertainty about exam readiness, wasted time on already-known material.
**Pull:** A single trustworthy number ("readiness") plus a plan that removes the "what do I study today" decision.
**Habit:** Familiarity with flashcard apps (Quizlet/Anki) or just "re-reading notes" as the default revision method.
**Anxiety:** Trusting an AI's read on their exam-readiness when the stakes (grades, university admission) are high; giving up an existing (even if messy) planning habit.

## Customer Language
**How they describe the problem:** *(not yet captured — needs real user quotes)*
**How they describe us:** *(not yet captured)*
**Words to use:** "on track," "readiness," "target grade," "study plan," "confidence."
**Words to avoid:** Generic AI-hype language ("revolutionary," "supercharge") — current landing copy is plain and calm ("Study smarter, not longer"); keep that register.
**Glossary:**
| Term | Meaning |
|------|---------|
| Readiness | The 0–100 score derived from mastery + retention that drives predicted grade, risk, and pace |
| Brain | Internal name for the single source of truth store (`brain-store.jsx`) computing readiness/grade/pace |
| Confidence rating | Student's self-rated understanding of a topic after a session, feeds pacing |

## Brand Voice
**Tone:** Calm, encouraging, plain-spoken — not hype-y or gamified-loud.
**Style:** Direct, short sentences, benefit-first ("Add a course, set your exam date, and start revising").
**Personality:** Supportive, precise, trustworthy, unshowy.

## Proof Points
**Metrics:** None yet — pre-launch.
**Customers:** None yet.
**Testimonials:** None yet.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Adaptive, not static | `brain-store.jsx` readiness → grade → pace chain (architecture note, not user-facing proof yet) |
| Privacy-friendly | All data stored locally in-browser, nothing synced (until backend/sync is added) |

## Goals
**Business goal:** Ship AI Exam Coach to the App Store (per longer-term plan); currently free/no ads, with paid tiers designed but not yet built (Free = Haiku-generated sections, Paid = Sonnet + lazy-loaded sections, to be implemented at end of project).
**Conversion action:** Sign up (or "Try demo — no account needed" for low-friction trial) → complete onboarding (add first exam) → first study session.
**Current metrics:** None yet — pre-launch, no analytics in place.
