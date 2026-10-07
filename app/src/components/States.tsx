import type { ReactNode } from "react";
import type { DataError } from "../data/types";

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      <div className="sk sk-title" />
      {Array.from({ length: rows }, (_, i) => <div key={i} className="sk sk-row" />)}
    </div>
  );
}

const ADVICE: Record<DataError["kind"], string> = {
  network: "Check your internet connection, then try again.",
  timeout: "The connection is slow. Try again, or wait for a stronger signal.",
  "invalid-data": "The project data is damaged. Report this to the site maintainer.",
  "schema-mismatch": "This page is out of date. Reload to get the latest version.",
  "not-found": "It may have been removed, or the link is incomplete.",
};

export function ErrorPanel({ error, onRetry }: { error: DataError; onRetry?: () => void }) {
  const title = error.kind === "not-found" ? "Not found" : "Projects couldn't load";
  return (
    <div className="panel panel-error" role="alert">
      <h2>{title}</h2>
      <p>{ADVICE[error.kind]}</p>
      <p className="muted small">{error.message}</p>
      {error.kind === "schema-mismatch"
        ? <button className="btn" onClick={() => window.location.reload()}>Reload page</button>
        : error.retryable && onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel panel-empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
