import { useEffect, type ReactNode } from "react";
import { projectService } from "../data/projectService";
import { useResource } from "../data/useResource";
import type { Project } from "../data/types";
import { DecisionBadge } from "../components/Decision";
import { Empty, ErrorPanel, PageSkeleton } from "../components/States";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link, useLocation, navigate } from "../lib/router";
import { compareStore } from "../lib/compare";
import { track } from "../lib/analytics";

export default function Compare() {
  useDocumentTitle("Compare projects");
  const { params } = useLocation();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 3);
  const { state, retry } = useResource(async () => {
    const results = await Promise.all(ids.map((id) => projectService.getProject(id)));
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) return failed;
    return { ok: true as const, value: results.map((r) => (r as { ok: true; value: Project }).value) };
  }, [ids.join(",")]);

  useEffect(() => { if (ids.length >= 2) track("comparison_completed", { ids }); }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ids.length < 2) {
    return (
      <Empty title="Pick at least two projects">
        <p>Press <strong>Compare</strong> next to any project in the list, then come back here.</p>
        <Link className="btn" to="/projects">Find projects</Link>
      </Empty>
    );
  }
  if (state.status === "loading") return <PageSkeleton />;
  if (state.status === "error") return <ErrorPanel error={state.error} onRetry={retry} />;
  return <CompareTable projects={state.data} />;
}

function CompareTable({ projects }: { projects: Project[] }) {
  const core = useCore();
  const sets = (f: (p: Project) => string[]) => projects.map((p) => new Set(f(p)));
  const shared = (f: (p: Project) => string[]) => {
    const s = sets(f);
    return new Set([...s[0]].filter((x) => s.every((set) => set.has(x))));
  };
  const sharedProblems = shared((p) => p.problemIds);
  const sharedTech = shared((p) => p.technologyIds);

  const rows: { label: string; render: (p: Project) => ReactNode }[] = [
    { label: "Year", render: (p) => p.academicYear },
    { label: "Decision", render: (p) => <DecisionBadge decision={p.decision} /> },
    { label: "Problem", render: (p) => <TagCell ids={p.problemIds} shared={sharedProblems} name={(id) => core.problemById.get(id)?.title ?? id} /> },
    { label: "Technologies", render: (p) => <TagCell ids={p.technologyIds} shared={sharedTech} name={(id) => core.label("technologies", id)} /> },
    { label: "Fields", render: (p) => p.domainIds.map((d) => core.label("domains", d)).join(", ") || "—" },
    { label: "Place", render: (p) => p.placeIds.map((d) => core.label("places", d)).join(", ") || "Not stated" },
  ];

  const remove = (id: string) => {
    compareStore.toggle(id);
    const rest = projects.map((p) => p.id).filter((x) => x !== id);
    navigate(`/compare?ids=${rest.join(",")}`, { replace: true });
  };

  return (
    <div className="compare-page">
      <h1>Compare projects</h1>
      <p className="lead">Highlighted items appear in every project. The rest show where they differ.</p>
      {/* Phones: one attribute at a time, every project's value stacked underneath. */}
      <ol className="compare-legend">
        {projects.map((p, i) => (
          <li key={p.id}>
            <span className="letter">{"ABC"[i]}</span>
            <Link to={`/projects/${p.id}`}>{p.title}</Link>
            <button className="btn-text small" onClick={() => remove(p.id)}>Remove</button>
          </li>
        ))}
      </ol>
      <dl className="compare-stack">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            {projects.map((p, i) => (
              <dd key={p.id}><span className="letter">{"ABC"[i]}</span><span>{r.render(p)}</span></dd>
            ))}
          </div>
        ))}
      </dl>

      {/* Wider screens: classic side-by-side table. */}
      <div className="table-scroll">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Attribute</span></th>
              {projects.map((p) => (
                <th key={p.id} scope="col">
                  <Link to={`/projects/${p.id}`}>{p.title}</Link>
                  <button className="btn-text small" onClick={() => remove(p.id)}>Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {projects.map((p) => <td key={p.id}>{r.render(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TagCell({ ids, shared, name }: { ids: string[]; shared: Set<string>; name: (id: string) => string }) {
  if (!ids.length) return <span className="muted">—</span>;
  return <ul className="cell-list">{ids.map((id) => <li key={id} className={shared.has(id) ? "same" : ""}>{name(id)}</li>)}</ul>;
}
