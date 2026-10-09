import { useMemo, useState } from "react";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link } from "../lib/router";
import { track } from "../lib/analytics";

export default function Problems() {
  useDocumentTitle("Problems");
  const core = useCore();
  const [filter, setFilter] = useState("");
  // Categories collapse to keep the page scannable; null = default (only the largest open).
  const [open, setOpen] = useState<Set<string> | null>(null);
  const filtering = filter.trim() !== "";
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
      .map(([cat, ps]) => ({ cat, label: core.label("categories", cat), problems: ps.sort((a, b) => b.projectCount - a.projectCount), projects: ps.reduce((n, p) => n + p.projectCount, 0) }))
      .sort((a, b) => b.projects - a.projects);
  }, [core, filter]);

  const isOpen = (cat: string) => (open ? open.has(cat) : cat === groups[0]?.cat);
  const allOpen = groups.length > 0 && groups.every((g) => isOpen(g.cat));
  const toggle = (cat: string) => {
    const next = new Set(open ?? (groups[0] ? [groups[0].cat] : []));
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setOpen(next);
  };

  return (
    <div className="problems-page">
      <h1>Engineering problems</h1>
      <p className="lead">Start from a real problem, then see how past students tried to solve it.</p>
      <input className="input" type="search" placeholder="Filter problems, e.g. water, fault, farm" value={filter}
        onChange={(e) => setFilter(e.target.value)} aria-label="Filter problems" />

      {groups.length === 0 && <p className="muted">No problem matches “{filter}”. Try a shorter word.</p>}

      {groups.length > 0 && (
        <div className="pgroups-bar">
          <p className="muted small">{groups.length} {groups.length === 1 ? "area" : "areas"}{filtering ? " match" : ". Open one to see its problems."}</p>
          {!filtering && (
            <button className="btn-text" onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.cat)))}>
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      )}

      {groups.map((g) => (
        // While filtering, every matching area stays open so no result is hidden.
        <details key={g.cat} className="pgroup" open={filtering || isOpen(g.cat)}
          onToggle={(e) => { if (!filtering && e.currentTarget.open !== isOpen(g.cat)) toggle(g.cat); }}>
          <summary>
            <h2>{g.label}</h2>
            <span className="pgroup-meta">{g.problems.length} {g.problems.length === 1 ? "problem" : "problems"} · {g.projects} projects</span>
            <svg className="chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6Z" fill="currentColor" /></svg>
          </summary>
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
        </details>
      ))}
    </div>
  );
}
