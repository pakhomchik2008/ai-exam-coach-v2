import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");

/**
 * The single most valuable lint rule for this codebase right now is `no-undef`.
 *
 * The Vite migration moved 43 files from one shared <script> global scope into
 * separate ES modules. Cross-module references still resolve — a bare identifier
 * falls through module scope to the global object, and every module still
 * publishes itself onto `window`. But a reference to something a module used to
 * get from shared scope and that is NOT published to `window` now resolves to
 * nothing, and fails at runtime on whatever screen happens to touch it.
 *
 * `no-undef` finds every one of those statically — but only if it knows which
 * names legitimately live on `window`. Rather than hand-maintain a list of ~254
 * names (which would drift the moment anyone adds a store export), we derive it
 * from the source on every lint run.
 */
function collectPublishedGlobals(dir) {
  const found = new Set();

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      for (const name of collectPublishedGlobals(path)) found.add(name);
      continue;
    }
    if (!/\.(jsx?|tsx?)$/.test(entry)) continue;

    const src = readFileSync(path, "utf8");

    // `window.Foo = Foo;`
    for (const m of src.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)) {
      found.add(m[1]);
    }

    // `Object.assign(window, { Foo, Bar: baz, ... })` — possibly multi-line.
    for (const m of src.matchAll(/Object\.assign\(\s*window\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
      for (const part of m[1].split(",")) {
        const name = part.split(":")[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(name)) found.add(name);
      }
    }
  }

  return found;
}

const legacyGlobals = Object.fromEntries(
  [...collectPublishedGlobals(SRC)].map((name) => [name, "readonly"]),
);

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src/lib/_ds_bundle.js", "coverage/**"] },

  // ── Converted TypeScript ───────────────────────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...legacyGlobals },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // ── Unconverted legacy modules ─────────────────────────────────────────────
  // These are pre-migration files being converted one at a time. They are held
  // to exactly one rule — `no-undef` — because that is the rule that catches the
  // specific class of breakage the migration could have introduced. Style rules
  // here would produce thousands of findings and bury it.
  {
    files: ["src/**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...legacyGlobals },
    },
    rules: {
      "no-undef": "error",
    },
  },

  // ── Node-side scripts and config ───────────────────────────────────────────
  {
    files: ["scripts/**/*.mjs", "*.config.{js,ts}", "api/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },

  // ── Tests ──────────────────────────────────────────────────────────────────
  {
    files: ["src/**/*.test.{ts,tsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.browser, ...legacyGlobals } },
    rules: {
      // Tests reach into the legacy `window` surface and assert on shapes that
      // are only typed loosely; non-null assertions are the point there.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
