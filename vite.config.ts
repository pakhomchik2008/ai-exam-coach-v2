import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // pdf.js worker is loaded via `?url` from extract-study-file.ts. Pinning the
  // dep here stops Vite from re-optimizing it mid-session and breaking the
  // worker URL on the first Study Tools PDF drop of a cold `npm run dev`.
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },

  server: {
    port: 5173,
    // `scripts/dev-api.mjs` runs the real `api/*.js` handlers on 8745, the same
    // port serve.py used to proxy to. Keeps local AI calls hitting the real
    // auth/quota gate rather than a stub.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8745",
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
        // Without this, a down :8745 becomes an empty 500 and the UI shows
        // the useless "proxy error" string from claude-proxy.ts.
        configure(proxy) {
          proxy.on("error", (_err, _req, res) => {
            if (!res || !("writeHead" in res) || res.headersSent) return;
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: "Local API is not running. Run: npm run dev (starts Vite + the API together), or npm run dev:api in a second terminal if you started Vite alone with npm run dev:web.",
            }));
          });
        },
      },
    },
  },

  build: {
    outDir: "dist",
    // Sentry is wired up in production; without sourcemaps every stack trace it
    // captures points at minified bundle offsets and is useless for triage.
    //
    // "hidden" emits the .map files but omits the //# sourceMappingURL comment,
    // so browsers never fetch them and the full un-minified source is not served
    // to every visitor. Phase 1b uploads them to Sentry at build time and strips
    // them from the deploy artifact entirely.
    sourcemap: "hidden",
  },
});
