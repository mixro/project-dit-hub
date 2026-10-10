import { useMemo } from "react";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link } from "../lib/router";
import { decisionLabel } from "../components/Decision";
import type { Decision } from "../data/types";

interface Bar { id: string; label: string; value: number; to?: string }

function Bars({ items, unit = "projects" }: { items: Bar[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="bars">
      {items.map((i) => (
        <li key={i.id}>
          <span className="bar-label">{i.to ? <Link to={i.to}>{i.label}</Link> : i.label}</span>
          <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className="bar-value">{i.value}<span className="visually-hidden"> {unit}</span></span>
        </li>
      ))}
    </ul>
  );
}

export default function Insights() {
  useDocumentTitle("Insights");
  const core = useCore();

  // Every number here is computed from the loaded data. Nothing is hardcoded.
  const data = useMemo(() => {
    const ps = core.projects;
    const count = <T extends string | number>(xs: T[]) => {
      const m = new Map<T, number>();
      xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    // Trends use dated projects only; lists without a single year are left out.
    const dated = ps.filter((p): p is typeof p & { year: number } => p.year !== null);
    const latest = Math.max(...dated.map((p) => p.year));
    const recent = dated.filter((p) => p.year === latest);
    const older = dated.filter((p) => p.year < latest);
    const share = (set: typeof ps, id: string) => set.filter((p) => p.problemIds.includes(id)).length / Math.max(1, set.length);
    const rising = core.problems
      .filter((p) => p.projectCount >= 5)
      .map((p) => ({ p, delta: share(recent, p.id) - share(older, p.id) }))
      .sort((a, b) => b.delta - a.delta);
    return {
      latest,
      byYear: count(dated.map((p) => p.year)).sort((a, b) => a[0] - b[0]),
      problems: count(ps.flatMap((p) => p.problemIds)).slice(0, 10),
      tech: count(ps.flatMap((p) => p.technologyIds)).slice(0, 10),
      decisions: count(recent.map((p) => p.decision)),
      recentTotal: recent.length,
      rising: rising.slice(0, 5),
      falling: rising.slice(-5).reverse(),
    };
  }, [core]);

  const pct = (x: number) => `${x > 0 ? "+" : ""}${Math.round(x * 100)} pts`;

  return (
    <div className="insights-page">
      <h1>Insights</h1>
      <p className="lead">What past students worked on, calculated from all {core.projects.length} projects.</p>

      <div className="insight-grid">
        <section>
          <h2>Projects per year</h2>
          <Bars items={data.byYear.map(([y, n]) => ({ id: String(y), label: String(y), value: n, to: `/projects?year=${y}` }))} />
          <p className="muted small">Years depend on which documents have been collected so far.</p>
        </section>

        <section>
          <h2>Decisions in {data.latest}</h2>
          <Bars items={data.decisions.map(([d, n]) => ({ id: d, label: decisionLabel(d as Decision), value: n, to: `/projects?year=${data.latest}&decision=${d}` }))} />
          <p className="muted small">“Not recorded” is mostly second proposals whose outcome the document does not state.</p>
        </section>

        <section>
          <h2>Most-tackled problems</h2>
          <Bars items={data.problems.map(([id, n]) => ({ id, label: core.problemById.get(id)?.title ?? id, value: n, to: `/problems/${id}` }))} />
        </section>

        <section>
          <h2>Most-used technologies</h2>
          <Bars items={data.tech.map(([id, n]) => ({ id, label: core.label("technologies", id), value: n, to: `/projects?tech=${id}` }))} />
        </section>

        <section>
          <h2>Growing in {data.latest}</h2>
          <p className="muted small">Change in share of projects compared with earlier years.</p>
          <ul className="plain trend">
            {data.rising.map(({ p, delta }) => <li key={p.id}><Link to={`/problems/${p.id}`}>{p.title}</Link> <span className="up">{pct(delta)}</span></li>)}
          </ul>
        </section>

        <section>
          <h2>Less common in {data.latest}</h2>
          <p className="muted small">Fewer recent projects can mean room for new work.</p>
          <ul className="plain trend">
            {data.falling.map(({ p, delta }) => <li key={p.id}><Link to={`/problems/${p.id}`}>{p.title}</Link> <span className="down">{pct(delta)}</span></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
