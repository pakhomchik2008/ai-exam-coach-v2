# AI Exam Coach — deploy package

This folder is self-contained and ready to deploy to Vercel: a no-build React app (loaded via CDN script tags) plus one serverless function for AI features.

## Deploy

1. Go to vercel.com → **Add New Project** → drag-and-drop this whole folder (or `vercel deploy` via the CLI from inside it).
2. After the first deploy, go to **Project Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your own Anthropic API key
3. Redeploy (env vars only take effect on a new deployment).

Without step 2, the app works fully **except** AI features (AI Coach chat, the Study tab's flashcard/quiz generation, and the background "AI plan summary" on new exams) — those will show an error instead of silently pretending to work.

## What's in here

- `index.html` + all `.jsx` files — the app itself (plain React 18, no build step, Babel transforms JSX in the browser).
- `_ds_bundle.js`, `styles.css`, `tokens/` — the design system the app's components are built on.
- `api/complete.js` — a Vercel serverless function that proxies AI requests to Anthropic using the env var above. Replaces the local development proxy (`localhost:8745`), which only existed on this machine.

## Data

All app data (exams, schedule, profile, auth accounts, mistakes) lives in the visitor's own browser `localStorage` — there's no database. Each person who opens the deployed link gets their own empty slate; nothing is shared between visitors or synced anywhere.
