# AI Exam Coach

A Vite + React app plus two Vercel serverless functions.

## Local development

```bash
npm install
npm run dev
```

Serves on <http://localhost:5173> with HMR. `/api/*` is proxied to `scripts/dev-api.mjs`, which runs the real `api/*.js` handlers — start it in a second terminal:

```bash
npm run dev:api
```

Put `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in a `.env.local` at the repo root (gitignored) if you want AI calls to succeed locally; without them the auth gate still works and returns clear errors.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` then `vite build` → `dist/` |
| `npm run preview` | Serves the production build |
| `npm run typecheck` | TypeScript only |

## Source layout

`src/main.tsx` is the entry point. **Its import order is load-bearing** — it reproduces the order of the `<script>` tags this app used before the Vite migration, and `ARCHITECTURE_AUDIT.md` §4.3 documents seven ordering dependencies between modules, six of which fail silently when violated. Read the comment at the top of that file before touching it.

Most modules under `src/` are still pre-migration `.jsx` files that communicate through `window` globals rather than imports. That is deliberate and temporary; they are being converted to typed ES modules one at a time. `src/lib/legacy.ts` marks every remaining boundary.

## Deploy

Vercel builds with `npm run build` and serves `dist/` (see `vercel.json`).

1. Go to vercel.com → **Add New Project** → import this repo.
2. **Supabase → SQL editor**: run `supabase/07_ai_usage.sql` (per-user AI quota tables + the service-role functions the API gate calls), then `supabase/08_curriculum_trust.sql` (locks down the community write path — **run this before enabling anonymous sign-ins in step 3**, otherwise demo visitors can write to the shared catalog).
3. **Supabase → Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**. This is what makes the landing page's "Try the demo" button work — a demo visitor becomes a real anonymous Supabase user with its own (smaller) AI budget. Leave it off and the demo still opens, but every AI call returns 401.
4. **Vercel → Project Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY` = your own Anthropic API key
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Settings → API → `service_role` (**secret** — never put this in a `.jsx` file)
   - `ALLOWED_ORIGINS` *(optional)* = comma-separated origins allowed to call the API. Defaults to the production URL, `ai-exam-coach*.vercel.app` previews, and localhost.
5. Redeploy (env vars only take effect on a new deployment).

Without step 4, AI features (AI Coach chat, the Study tab's flashcard/quiz generation, the background "AI plan summary" on new exams, and syllabus URL import) show an error instead of silently pretending to work.

## API access control

`/api/complete` and `/api/fetch-url` are **not open endpoints**. Every request goes through `api/_guard.js`:

1. **Origin allowlist** — enforced when the browser sends an `Origin` header.
2. **Supabase JWT** — `Authorization: Bearer <access token>`, verified against Supabase's own `/auth/v1/user` (60 s cache). No token, expired token, or forged token → `401`.
3. **Per-user daily quota** — `public.ai_quota_consume()` spends one request slot per call and, for `/api/complete`, records the actual tokens Anthropic billed. Over budget → `429`.

Limits live in the `public.ai_limits` table, not in code — tune them with one `UPDATE`, no redeploy:

```sql
update public.ai_limits set daily_requests = 800 where key = 'complete:user';
```

Quota resets at 00:00 **UTC**.

## Catalog trust model

The exam catalog merges three sources: the bundled `CURRICULUM_SEED` (in `curriculum-data.jsx`), the Supabase `curriculum` table, and the visitor's own local AI cache. Which one wins a lookup is decided by a single trust tier in `curriculum-store.jsx`:

| Tier | What it is |
|---|---|
| **curated** | DB row with `source='official'`, or a contribution an admin set to `moderation_status='approved'` |
| **bundled** | `CURRICULUM_SEED` — ships with the app |
| **own (confirmed)** | this browser's cache, after the user accepted it in the verify UI |
| **own (generated)** | this browser's cache, not confirmed yet |
| **contributed** | someone else's unmoderated row |

A contribution can **fill a gap but never displace curated content**, carries no `aliases`, and is excluded entirely from section-based courses (SAT/ACT/IELTS), where topics are unioned rather than ranked. Rows marked `rejected` are dropped. `supabase/08_curriculum_trust.sql` enforces the same rules server-side and blocks anonymous (demo) accounts from writing at all.

Review the queue and moderate:

```sql
select * from public.curriculum_pending;
```

Regression tests for all of the above:

```bash
node scripts/curriculum-trust-tests.mjs
```

## Catalog reachability

Row count in the `curriculum` table is not the same as "how many subjects can a student get" — the picker offers native-language names and per-board rows the matcher can silently fail to resolve. Check what's actually reachable:

```bash
node scripts/catalog-gaps.mjs
```

`supabase/09_catalog_fill.sql` (run after 07/08) fixes what the report found: GCSE rows wrongly tagged to one exam board (invisible to the other three), 15 native-language picker presets with no matching alias, GCSE Computer Science content (new, from the AQA 8525 spec), and Abitur Mathematik's missing Stochastik Leitidee. Preview what a migration would change before running it:

```bash
node scripts/catalog-gaps.mjs --sql supabase/09_catalog_fill.sql
```

## What's in here

- `index.html` + `src/` — the app itself (React 18, bundled by Vite).
- `src/lib/_ds_bundle.js`, `src/styles/` — the design system the app's components are built on.
- `api/complete.js` — proxies AI requests to Anthropic using the env var above.
- `api/fetch-url.js` — server-side fetch of a syllabus page for the URL-import panel (works around browser CORS; SSRF-guarded).
- `api/_guard.js` — shared auth/quota gate. Files under `api/` starting with `_` are not routed by Vercel.
- `supabase/*.sql` — schema and seed for the exam catalog, qualifications, and AI quota.

## Data

App data (exams, schedule, profile, mistakes) lives in the visitor's own browser `localStorage`. Supabase holds auth, the shared exam/curriculum catalog, and AI usage counters — nothing personal is shared between visitors.
