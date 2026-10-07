// One hook for every page: turns a service call into loading / error / data states.
// Pages render a skeleton while loading and a retry button on error, so a slow or
// failed request never produces a blank or crashed screen.
//
//   const { state, retry } = useResource(() => projectService.getProject(id), [id]);
//   if (state.status === "loading") return <ProjectSkeleton />;
//   if (state.status === "error") return <ErrorPanel error={state.error} onRetry={retry} />;
//   return <ProjectPage project={state.data} />;

import { useCallback, useEffect, useState } from "react";
import type { DataError, Result } from "./types";

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "error"; error: DataError }
  | { status: "ready"; data: T };

export function useResource<T>(load: () => Promise<Result<T>>, deps: unknown[]) {
  const [state, setState] = useState<ResourceState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false; // ignore late responses after navigation
    setState({ status: "loading" });
    load()
      .then((r) => {
        if (cancelled) return;
        setState(r.ok ? { status: "ready", data: r.value } : { status: "error", error: r.error });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: "error", error: { kind: "invalid-data", message: String(e), retryable: true } });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}
