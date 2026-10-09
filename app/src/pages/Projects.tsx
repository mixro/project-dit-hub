import { useCallback, useEffect, useMemo, useState } from "react";
import { projectService } from "../data/projectService";
import type { Decision, ProjectQuery, ProjectQueryResult } from "../data/types";
import { SearchBox } from "../components/SearchBox";
import { Filters, type FilterKey } from "../components/Filters";
import { ProjectRow } from "../components/ProjectRow";
import { Empty, ErrorPanel, PageSkeleton } from "../components/States";
import { decisionLabel } from "../components/Decision";
import { useCore, useDocumentTitle } from "../lib/core";
import { setParams, useLocation } from "../lib/router";
import { track } from "../lib/analytics";
import type { DataError } from "../data/types";

const PAGE = 25;
const PARAM: Record<FilterKey, string> = { programmeIds: "prog", years: "year", decisions: "decision", categoryIds: "area", technologyIds: "tech", domainIds: "field" };

function readQuery(params: URLSearchParams): ProjectQuery {
  return {
    text: params.get("q") ?? "",
    programmeIds: params.getAll("prog"),
    years: params.getAll("year").map(Number).filter(Boolean),
    decisions: params.getAll("decision") as Decision[],
    categoryIds: params.getAll("area"),
    technologyIds: params.getAll("tech"),
    domainIds: params.getAll("field"),
    problemIds: params.getAll("problem"),
    sort: (params.get("sort") as ProjectQuery["sort"]) ?? undefined,
    page: 1,
    pageSize: PAGE * Math.max(1, Number(params.get("show") ?? 1)),
  };
}

export default function Projects() {
  const core = useCore();
  const { params } = useLocation();
  const key = params.toString();
  const query = useMemo(() => readQuery(params), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<ProjectQueryResult | null>(null);
  const [error, setError] = useState<DataError | null>(null);
  const [pending, setPending] = useState(true);
  const [sheet, setSheet] = useState(false);
  useDocumentTitle(query.text ? `“${query.text}”` : "Projects");

  // Keep showing the previous results while new ones compute: no skeleton flash on every keystroke.
  useEffect(() => {
    let live = true;
    setPending(true);
    projectService.queryProjects(query).then((r) => {
      if (!live) return;
      if (r.ok) { setResult(r.value); setError(null); } else setError(r.error);
      setPending(false);
    });
    return () => { live = false; };
  }, [query]);

  const toggle = useCallback((k: FilterKey, id: string) => {
    const current = params.getAll(PARAM[k]);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    track(k === "technologyIds" ? "technology_selected" : k === "categoryIds" ? "category_opened" : "filter_used", { filter: k, value: id, on: !current.includes(id) });
    setParams({ [PARAM[k]]: next, show: null });
  }, [params]);

  const clearAll = useCallback(() => setParams({ prog: null, year: null, decision: null, area: null, tech: null, field: null, problem: null, show: null }), []);
  const closeSheet = useCallback(() => setSheet(false), []);

  const activeChips: { k: FilterKey | "problemIds"; id: string; label: string }[] = [
    ...(query.problemIds ?? []).map((id) => ({ k: "problemIds" as const, id, label: core.problemById.get(id)?.title ?? id })),
    ...(query.programmeIds ?? []).map((id) => ({ k: "programmeIds" as const, id, label: core.label("programmes", id) })),
    ...(query.categoryIds ?? []).map((id) => ({ k: "categoryIds" as const, id, label: core.label("categories", id) })),
    ...(query.years ?? []).map((y) => ({ k: "years" as const, id: String(y), label: String(y) })),
    ...(query.decisions ?? []).map((d) => ({ k: "decisions" as const, id: d, label: decisionLabel(d) })),
    ...(query.technologyIds ?? []).map((id) => ({ k: "technologyIds" as const, id, label: core.label("technologies", id) })),
    ...(query.domainIds ?? []).map((id) => ({ k: "domainIds" as const, id, label: core.label("domains", id) })),
  ];
  const removeChip = (c: (typeof activeChips)[number]) => {
    if (c.k === "problemIds") setParams({ problem: params.getAll("problem").filter((x) => x !== c.id) });
    else toggle(c.k, c.id);
  };

  if (error) return <ErrorPanel error={error} onRetry={() => setParams({})} />;
  if (!result) return <PageSkeleton />;

  return (
    <div className="projects-page">
      <div className="search-sticky">
        <SearchBox
          initial={query.text}
          onChange={(q) => { setParams({ q: q || null, show: null, sort: null }); if (q) track("search_performed", { q, from: "projects" }); }}
        />
      </div>

      <div className="layout-2col">
        <Filters
          query={query}
          facets={result.facets}
          onToggle={toggle}
          onClear={clearAll}
          open={sheet}
          onClose={closeSheet}
          total={result.total}
        />

        <section className={`results${pending ? " is-pending" : ""}`} aria-live="polite" aria-busy={pending}>
          <div className="results-bar">
            <p className="count"><strong>{result.total}</strong> project{result.total === 1 ? "" : "s"}{query.text ? <> for “{query.text}”</> : null}</p>
            <div className="results-actions">
              <button className="btn-outline filter-btn" onClick={() => setSheet(true)}>
                Filters{activeChips.length ? ` (${activeChips.length})` : ""}
              </button>
              <label className="sort">
                <span className="visually-hidden">Sort by</span>
                <select value={query.sort ?? (query.text ? "relevance" : "newest")} onChange={(e) => setParams({ sort: e.target.value })}>
                  {query.text && <option value="relevance">Best match</option>}
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">A to Z</option>
                </select>
              </label>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="chips active-chips">
              {activeChips.map((c) => (
                <button key={c.k + c.id} className="chip on" onClick={() => removeChip(c)} aria-label={`Remove filter ${c.label}`}>
                  {c.label} <span aria-hidden="true">×</span>
                </button>
              ))}
              <button className="btn-text" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {result.total === 0 ? (
            <Empty title="No projects match">
              <p>Try fewer words, a related term (for example “pump” instead of “irrigation”), or remove a filter.</p>
              {activeChips.length > 0 && <button className="btn" onClick={clearAll}>Remove all filters</button>}
            </Empty>
          ) : (
            <>
              <ul className="rows">
                {result.items.map((p) => (
                  <ProjectRow key={p.id} project={p} query={query.text} />
                ))}
              </ul>
              {result.items.length < result.total && (
                <button className="btn-outline btn-block more" onClick={() => setParams({ show: String(Number(params.get("show") ?? 1) + 1) })}>
                  Show more ({result.total - result.items.length} left)
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
