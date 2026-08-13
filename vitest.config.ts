import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // The legacy modules register themselves on `window` at import time and
    // mutate shared localStorage-backed stores. Running files in parallel in one
    // shared jsdom would let them clobber each other's fixtures, so each test
    // file gets its own environment.
    isolate: true,
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/stores/**", "src/lib/**", "src/app/**"],
      exclude: ["src/lib/_ds_bundle.js", "**/*.test.*"],
    },
  },
});
