import { useMemo, useState } from "react";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link } from "../lib/router";
import { track } from "../lib/analytics";

export default function Problems() {
  useDocumentTitle("Problems");
  const core = useCore();
  const [filter, setFilter] = useState("");
  const years = core.manifest.counts.years;

  // Each problem appears under its first (main) area, so the list has no duplicates.
  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const map = new Map<string, typeof core.problems>();
    for (const p of core.problems) {
      if (!p.projectCount) continue;
      if (f && !`${p.title} ${p.description}`.toLowerCase().includes(f)) continue;
      const cat = p.categoryIds[0];
      map.set(cat, [...(map.get(cat) ?? []), p]);
    }
    return [...map.entries()]
      .map(([cat, ps]) => ({ cat, label: core.label("categories", cat), problems: ps.sort((a, b) => b.projectCount - a.projectCount) }))
      .sort((a, b) => b.problems.reduce((n, p) => n + p.projectCount, 0) - a.problems.reduce((n, p) => n + p.projectCount, 0));
  }, [core, filter]);

  return (
    <div className="problems-page">
      <h1>Engineering problems</h1>
      <p className="lead">Start from a real problem, then see how past students tried to solve it.</p>
      <input className="input" type="search" placeholder="Filter problems, e.g. water, fault, farm" value={filter}
        onChange={(e) => setFilter(e.target.value)} aria-label="Filter problems" />

      {groups.length === 0 && <p className="muted">No problem matches “{filter}”. Try a shorter word.</p>}

      {groups.map((g) => (
        <section key={g.cat} className="pgroup">
          <h2>{g.label}</h2>
          <ul className="plist">
            {g.problems.map((p) => (
              <li key={p.id}>
                <Link to={`/problems/${p.id}`} onClick={() => track("problem_opened", { id: p.id, from: "problems" })}>
                  <span className="plist-title">{p.title}</span>
                  <span className="plist-count">{p.projectCount} projects</span>
                  <span className="spark" aria-label={`Projects per year: ${years.map((y) => `${y}: ${p.projectCountByYear[y] ?? 0}`).join(", ")}`}>
                    {years.map((y) => {
                      const n = p.projectCountByYear[y] ?? 0;
                      return <span key={y} style={{ height: `${Math.min(100, 12 + n * 9)}%` }} className={n ? "" : "zero"} title={`${y}: ${n}`} />;
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
