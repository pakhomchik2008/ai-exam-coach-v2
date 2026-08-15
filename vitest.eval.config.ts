/**
 * Live-model evals, kept out of `npm test` and out of CI on purpose: they cost
 * Anthropic tokens, need a key CI does not have, and are non-deterministic.
 * `*.eval.ts` does not match Vitest's default include, so the normal run
 * cannot pick these up by accident.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.eval.ts"],
    // One live generation is 10-40 s; several samples per prompt add up.
    testTimeout: 180_000,
    hookTimeout: 60_000,
  },
});
