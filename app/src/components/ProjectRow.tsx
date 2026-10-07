import { memo } from "react";
import type { ProjectSummary } from "../data/types";
import { Link } from "../lib/router";
import { useCore } from "../lib/core";
import { compareStore, useCompare, MAX_COMPARE } from "../lib/compare";
import { DecisionBadge } from "./Decision";
import { Highlight } from "./Highlight";

export const ProjectRow = memo(function ProjectRow({ project, query, onOpen }: { project: ProjectSummary; query?: string; onOpen?: () => void }) {
  const core = useCore();
  const selected = useCompare();
  const isSelected = selected.includes(project.id);
  const full = !isSelected && selected.length >= MAX_COMPARE;
  const problem = project.problemIds[0] ? core.problemById.get(project.problemIds[0])?.title : undefined;
  return (
    <li className="row">
      <Link to={`/projects/${project.id}`} className="row-main" onClick={onOpen}>
        <span className="row-title"><Highlight text={project.title} query={query} /></span>
        <span className="row-meta">
          <span className="year">{project.year}</span>
          <DecisionBadge decision={project.decision} />
          {problem && <span className="row-problem">{problem}</span>}
        </span>
      </Link>
      <button
        className={`compare-toggle${isSelected ? " on" : ""}`}
        aria-pressed={isSelected}
        disabled={full}
        title={full ? `You can compare up to ${MAX_COMPARE} projects` : undefined}
        onClick={() => compareStore.toggle(project.id)}
      >
        {isSelected ? "Added" : "Compare"}
      </button>
    </li>
  );
});
