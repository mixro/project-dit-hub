import { useEffect, useMemo } from "react";
import { projectService } from "../data/projectService";
import { useResource } from "../data/useResource";
import { DecisionBadge } from "../components/Decision";
import { ErrorPanel, PageSkeleton } from "../components/States";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link } from "../lib/router";
import { track } from "../lib/analytics";

export default function ProblemDetail({ id }: { id: string }) {
  const core = useCore();
  const { state, retry } = useResource(() => projectService.getProblem(id), [id]);
  useEffect(() => { track("problem_opened", { id }); }, [id]);
  const title = state.status === "ready" ? state.data.problem.title : "Problem";
  useDocumentTitle(title);

  const byYear = useMemo(() => {
    if (state.status !== "ready") return [];
    // Projects arrive oldest first, with undated ones last, so insertion order is the timeline order.
    const m = new Map<string, typeof state.data.projects>();
    for (const p of state.data.projects) {
      const key = p.year !== null ? String(p.year) : "Year not recorded";
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return [...m.entries()];
  }, [state]);

  if (state.status === "loading") return <PageSkeleton />;
  if (state.status === "error") return <ErrorPanel error={state.error} onRetry={retry} />;
  const { problem, projects } = state.data;

  return (
    <article className="detail">
      <Link to="/problems" className="back">All problems</Link>
      <h1>{problem.title}</h1>
      <p className="lead">{problem.description}</p>

      <dl className="facts">
        <div><dt>Projects</dt><dd>{problem.projectCount}</dd></div>
        <div><dt>Years</dt><dd>{byYear.map(([y]) => y).join(", ")}</dd></div>
        <div><dt>Areas</dt><dd>{problem.categoryIds.map((c) => core.label("categories", c)).join(", ")}</dd></div>
      </dl>

      {problem.topTechnologyIds.length > 0 && (
        <section>
          <h2>Technologies used so far</h2>
          <div className="chips">
            {problem.topTechnologyIds.map((t) => (
              <Link key={t} className="chip" to={`/projects?problem=${problem.id}&tech=${t}`}>{core.label("technologies", t)}</Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>How students have approached it</h2>
        <p className="muted">Oldest first. Look for what each project added, and what is still missing.</p>
        <ol className="timeline">
          {byYear.map(([year, ps]) => (
            <li key={year}>
              <h3>{year}</h3>
              <ul className="plain">
                {ps.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`}>{p.title}</Link> <DecisionBadge decision={p.decision} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <Link className="btn-outline" to={`/projects?problem=${problem.id}`}>Filter and compare these {projects.length} projects</Link>
      </section>
    </article>
  );
}
