// Loads the core dataset once and builds lookup tables every page needs.
// The app shell (header, nav) renders immediately; only page content waits.
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { projectService } from "../data/projectService";
import { useResource } from "../data/useResource";
import type { CoreData, Problem, ProjectSummary, SourceInfo } from "../data/types";
import { ErrorPanel, PageSkeleton } from "../components/States";

export interface Core extends CoreData {
  byId: Map<string, ProjectSummary>;
  problemById: Map<string, Problem>;
  sourceById: Map<string, SourceInfo>;
  label: (kind: "categories" | "domains" | "technologies" | "places" | "decisions" | "events" | "institutions" | "programmes", id: string) => string;
}

const Ctx = createContext<Core | null>(null);

export function CoreProvider({ children }: { children: ReactNode }) {
  const { state, retry } = useResource(() => projectService.getCore(), []);
  const core = useMemo<Core | null>(() => {
    if (state.status !== "ready") return null;
    const d = state.data;
    const maps = Object.fromEntries(
      (Object.keys(d.taxonomy) as (keyof typeof d.taxonomy)[]).map((k) => [k, new Map(d.taxonomy[k].map((l) => [l.id, l.label]))]),
    ) as Record<keyof typeof d.taxonomy, Map<string, string>>;
    return {
      ...d,
      byId: new Map(d.projects.map((p) => [p.id, p])),
      problemById: new Map(d.problems.map((p) => [p.id, p])),
      sourceById: new Map(d.sources.map((s) => [s.id, s])),
      label: (kind, id) => maps[kind]?.get(id) ?? id,
    };
  }, [state]);

  if (state.status === "loading") return <PageSkeleton />;
  if (state.status === "error") return <ErrorPanel error={state.error} onRetry={retry} />;
  return <Ctx.Provider value={core}>{children}</Ctx.Provider>;
}

export function useCore(): Core {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCore must be used inside CoreProvider");
  return c;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} – DIT Project Hub` : "DIT Project Hub";
  }, [title]);
}
