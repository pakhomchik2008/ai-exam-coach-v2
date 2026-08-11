/**
 * Application entry point.
 *
 * The ordered loading of the 43 legacy modules lives in `./bootstrap`, which the
 * test suite imports too — see the comment at the top of that file before
 * touching the order.
 */
import "./bootstrap";
import "./styles/styles.css";

import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppErrorBoundary } from "./app/ErrorBoundary";

const container = document.getElementById("root");
if (!container) throw new Error("#root not found in index.html");

// Deliberately NOT wrapped in <React.StrictMode>. The original mount was not,
// and StrictMode double-invokes effects in dev — against modules that fire AI
// calls and start study sessions from effects, that is a behavior change, not a
// safety net. Enable it once those side effects are covered by tests.
createRoot(container).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
