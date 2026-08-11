# Phase 1 Plan — Vite + TypeScript migration

## Strategy: strangler-fig, not rewrite

The naive reading of Phase 1 ("migrate every `*.jsx` to `*.tsx`, convert `window.X` to ES modules") means rewriting 18,762 LOC across 43 files in one step, with no test suite to catch regressions. That is the highest-risk possible sequencing: every bug introduced is invisible until a user hits it, and the app has zero automated coverage today.

Instead, Phase 1 is split, and the split is the whole point:

**1a — build system swap, behavior frozen.** Vite bundles the existing files unchanged. No `.jsx` file content is rewritten. Verified by clicking the app.
**1b — types and tooling on top of a green build.** TS strict on the store layer, lint, tests, CI.

### Why the existing files need almost no edits

Each file today ends with `Object.assign(window, {...})`, and cross-file references are either `window.X` or a **bare identifier** `X`. Under `<script type="text/babel">` both work because every file shares global scope.

Under ES modules they *still* both work: a bare identifier that misses module scope falls through to the global object, so `getProfile()` inside a module resolves to `window.getProfile` exactly as before — provided the defining module has already executed. Import order in `main.tsx` reproduces the `<script>` tag order verbatim, so it has.

This means the migration preserves all seven load-bearing order dependencies (`ARCHITECTURE_AUDIT.md` §4.3) by construction, rather than by hoping a refactor got them right.

## What changes

| File | Change |
|---|---|
| 43 `.jsx` files | **Moved** into `src/`, content untouched |
| `index.html` | CDN `<script>` tags + 43 babel tags deleted; single `<script type="module" src="/src/main.tsx">` |
| inline `<script>` in `index.html` | Extracted to `src/app/App.jsx` + `src/app/tweaks.js` + `src/app/ErrorBoundary.jsx` |
| new `src/lib/globals.ts` | Publishes `React`, `ReactDOM`, `supabase`, `JSZip`, `window.claude` onto `window` **before** any app module runs |
| new `src/lib/ds-bundle.ts` | Imports `_ds_bundle.js`, then **deletes the 25 stale component globals** (audit finding #13) |
| new `src/main.tsx` | Ordered side-effect imports, then mount |
| `vercel.json` | Build output `dist/`, SPA rewrite, plus the security headers Phase 6 needs a home for |

## Migrations / reversibility

No data migration in this phase. `localStorage` keys and shapes are untouched — that is deliberate, so a rollback is `git revert` with zero user-data consequence. The Supabase migration is Phase 2 and gets its own reversibility plan.

## Decision log (autonomous calls, per §0.2)

1. **React stays 18.3.1 this phase**, not 19. The stack table says React 19, but upgrading a framework major *inside* a build-system migration means two independent failure sources in one diff with no tests to separate them. React 19 lands as its own PR in Phase 2, after Vitest exists. CDN was already pinned to 18.3.1, so this is also the true behavior-preserving choice.
2. **`.jsx` files keep the `.jsx` extension in 1a.** `allowJs: true`, `checkJs: false`. Renaming 43 files to `.tsx` under `strict` produces thousands of errors at once, none of which can be triaged against a working baseline.
3. **CDN globals become bundled npm deps** at the exact pinned versions (`@supabase/supabase-js@2.45.4`, `jszip@3.10.1`) — the SRI-hash pinning in `index.html` was protecting against CDN compromise; bundling removes the third-party runtime dependency entirely, which is strictly stronger.
4. **Sentry stays on its CDN loader tag for now.** It is deliberately first in `<head>` to catch errors from everything below; moving it into the bundle means it can no longer catch bundle-load failures. Revisit with `@sentry/react` in 1b.

## What could break silently — and the detector for each

| # | Silent failure | How it's detected |
|---|---|---|
| 1 | A file used a bare helper from another file that is **never published to `window`** (e.g. a local `function fmt()`). Module scoping now isolates it → `ReferenceError` at render, possibly on a rarely-visited screen. | ESLint `no-undef` with an explicit `globals` allowlist of the 254 published names. Anything not on that list and not locally bound is a build-time error, not a runtime surprise. |
| 2 | Import order in `main.tsx` drifts from the old `<script>` order → one of the 7 load-bearing edges breaks, six of which fail *silently* (audit §4.3). | Boot assertion in `main.tsx`: assert every expected global is present, and assert the specific ordering invariants (`window.logMistake` is the brain-wrapped version, `EXAM_TYPES` contains the DB-only entries). Throws loudly at boot instead of degrading. |
| 3 | `_ds_bundle.js` stale globals win because deletion runs at the wrong time. | The deletion module is imported first; the assertion in #2 re-checks that `window.Dashboard` is the app's, not the bundle's, after all imports resolve. |
| 4 | `window.supabase` not yet set when `auth-store.jsx:12` destructures `createClient` at module-init → auth dead, silently falls back to localStorage-only. | `globals.ts` is the first import; boot assertion checks `window._supabase` is non-null. |
| 5 | Asset paths: `styles.css` / tokens were loaded via `../../` (audit finding #24). Vite rewrites and hashes assets; a missed reference 404s and the app renders unstyled but *functional*, which is easy to miss in a quick smoke test. | Explicit visual smoke test on the dev server + check `read_console_messages` for 404s. |
| 6 | Cache-busting `?v=` query strings disappear (they were manual, audit finding #23). If Vercel serves a stale `index.html`, hashed asset names save us — but only if `index.html` itself is served `no-cache`. | Explicit `Cache-Control` header for `/index.html` in `vercel.json`. |
| 7 | `api/*.js` serverless functions are Vercel-routed from the repo root; moving app files into `src/` could confuse the build's function detection. | `api/` stays exactly where it is. Verified by a deploy preview before merge. |

## Test gate for this phase

- `npm run build` succeeds, and initial-route JS is measured and reported (target < 500 KB gzip).
- `npm run dev` serves and the app boots with zero console errors.
- Manual smoke: landing renders → demo/login → dashboard → each of the 9 tabs opens without a crash.
- Boot assertions pass (they throw if not).
