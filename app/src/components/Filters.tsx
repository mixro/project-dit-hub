import { useEffect, useState } from "react";
import type { Facet, ProjectQuery } from "../data/types";
import { useCore } from "../lib/core";
import { decisionLabel } from "./Decision";
import type { Decision } from "../data/types";

export type FilterKey = "programmeIds" | "years" | "decisions" | "categoryIds" | "technologyIds" | "domainIds";

interface Props {
  query: ProjectQuery;
  facets: Record<FilterKey, Facet[]>;
  onToggle: (key: FilterKey, id: string) => void;
  onClear: () => void;
  open: boolean;
  onClose: () => void;
  total: number;
}

// On phones this is a bottom sheet; on wide screens a sidebar. Same component.
// Fewest filters first, with counts, so students see what each choice will give them.
const GROUPS: { key: FilterKey; title: string; limit: number }[] = [
  { key: "programmeIds", title: "Programme", limit: 6 },
  { key: "categoryIds", title: "Area", limit: 14 },
  { key: "years", title: "Year", limit: 10 },
  { key: "decisions", title: "Decision", limit: 6 },
  { key: "technologyIds", title: "Technology", limit: 12 },
  { key: "domainIds", title: "Engineering field", limit: 11 },
];

export function Filters({ query, facets, onToggle, onClear, open, onClose, total }: Props) {
  const core = useCore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("sheet-open");
    return () => { window.removeEventListener("keydown", onKey); document.body.classList.remove("sheet-open"); };
  }, [open, onClose]);

  const label = (key: FilterKey, id: string) => {
    if (key === "programmeIds") return core.label("programmes", id);
    if (key === "years") return id;
    if (key === "decisions") return decisionLabel(id as Decision);
    if (key === "categoryIds") return core.label("categories", id);
    if (key === "technologyIds") return core.label("technologies", id);
    return core.label("domains", id);
  };
  const selected = (key: FilterKey, id: string) => ((query[key] ?? []) as (string | number)[]).map(String).includes(id);

  return (
    <>
      {open && <div className="sheet-backdrop" onClick={onClose} />}
      <aside className={`filters${open ? " open" : ""}`} aria-label="Filters">
        <div className="filters-head">
          <h2>Filters</h2>
          <button className="btn-text" onClick={onClear}>Clear all</button>
        </div>
        <div className="filters-body">
          {GROUPS.map((g) => {
            const sel = facets[g.key].filter((f) => selected(g.key, f.id));
            const rest = facets[g.key].filter((f) => !selected(g.key, f.id));
            const items = g.key === "years"
              ? [...facets.years].sort((a, b) => Number(b.id) - Number(a.id)) // years read best in date order
              : [...sel, ...rest];
            const shown = expanded[g.key] ? items : items.slice(0, g.key === "years" || g.key === "decisions" ? 10 : 6);
            if (!items.length) return null;
            return (
              <fieldset key={g.key} className="fgroup">
                <legend>{g.title}</legend>
                <div className="chips">
                  {shown.map((f) => (
                    <button key={f.id} className={`chip${selected(g.key, f.id) ? " on" : ""}`} aria-pressed={selected(g.key, f.id)} onClick={() => onToggle(g.key, f.id)}>
                      {label(g.key, f.id)} <span className="count">{f.count}</span>
                    </button>
                  ))}
                </div>
                {items.length > shown.length && (
                  <button className="btn-text" onClick={() => setExpanded({ ...expanded, [g.key]: true })}>Show all {items.length}</button>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="filters-foot">
          <button className="btn btn-block" onClick={onClose}>Show {total} project{total === 1 ? "" : "s"}</button>
        </div>
      </aside>
    </>
  );
}
