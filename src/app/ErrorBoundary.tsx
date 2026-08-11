/**
 * Top-level error boundary. Without one, a crash anywhere in the tree unmounts
 * silently and only shows up in the console. This catches it, reports it to
 * Sentry (so it is visible without anyone having to reproduce it locally), and
 * shows a recoverable fallback instead of a blank screen.
 */
import React from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

interface SentryGlobal {
  captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => void;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const sentry = (window as unknown as Record<string, unknown>)["Sentry"] as
      | SentryGlobal
      | undefined;
    if (sentry) sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    else console.error("AppErrorBoundary caught:", error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 24,
            textAlign: "center",
            fontFamily: "var(--font-sans, system-ui)",
          }}
        >
          <p style={{ fontSize: 15, color: "var(--text-strong, #111)", marginBottom: 16 }}>
            Something went wrong. Your data is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--ink-900, #111)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
