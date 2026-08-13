# Phase 3.7g — IELTS Speaking (Whisper)

Branch: `phase-3.7g/speaking`, cut from `main` after #21–#23.

Hlib put `OPENAI_API_KEY` on Vercel. Decision Log #39 is lifted for
Whisper only. No new npm vendor SDK — `fetch` to OpenAI from the
existing serverless proxy, same guard as `/api/complete`.

## MVP

- `/api/transcribe` — audio base64 → Whisper `whisper-1` → text
- Coach Learn card «Speaking» on IELTS / TOEFL
- Learn tree: Speaking unit on IELTS (and TOEFL)
- Mic → Whisper → Sonnet band scores (fluency / lexical / grammar /
  pronunciation-from-transcript / overall)
- Cue card is Part 2. Examiner prompt uses browser SpeechSynthesis
  (already in-repo). Not OpenAI TTS.

## Deferred

| Item | Why |
|---|---|
| OpenAI TTS | Extra spend. Browser speech is enough for the cue. |
| 3.7h video Teach | ffmpeg still will not run on Vercel Hobby |
| Acoustic pronunciation | Whisper returns text, not phones. UI says so. |
| Stripe / Playwright | Separate slices |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 59 | Whisper via `/api/transcribe`, never from the browser | Key stays on Vercel. Same auth + daily quota as complete. |
| 60 | No OpenAI TTS in this PR | Cue playback already works with SpeechSynthesis. |
| 61 | Pronunciation band is inferred | Honest label. Real pronunciation needs a different model. |

## Reversibility

- New route + dialog. Missing `OPENAI_API_KEY` → 500, UI shows the
  same "sign in / try again" path. Speaking topics stay visible.

## What could break silently

| Risk | Guard |
|---|---|
| Recording > Vercel 4.5 MB body | Cap ~90s, reject oversized base64 |
| Quota counts Whisper as a request | Same `ai_quota_consume` slot as other AI |
| Safari needs `audio/mp4` | Prefer webm, fall back to mp4 |
| dropIeltsSpeakingTopics hid Practice | Pass-through now; tests updated |
