/**
 * App cover pieces. One header (title + one action) and empty states
 * that name the next tap. Landing CTA and in-app Start share .app-btn-primary.
 */
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  kicker?: string;
  action?: ReactNode;
};

export function PageHeader({ title, kicker, action }: PageHeaderProps) {
  return (
    <header className="app-page-header">
      <div className="app-page-heading">
        {kicker ? <p className="app-page-kicker">{kicker}</p> : null}
        <h1 className="app-page-title">{title}</h1>
      </div>
      {action ? <div className="app-page-action">{action}</div> : null}
    </header>
  );
}

type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="app-empty">
      <h1 className="app-page-title">{title}</h1>
      <p className="app-empty-body">{body}</p>
      {actionLabel && onAction ? (
        <button type="button" className="app-btn app-btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  block?: boolean;
};

export function PrimaryButton({ children, onClick, disabled, block }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={block ? "app-btn app-btn-primary app-btn-block" : "app-btn app-btn-primary"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
