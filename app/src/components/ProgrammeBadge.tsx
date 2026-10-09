import type { ProjectSummary } from "../data/types";
import { useCore } from "../lib/core";

/** Programme as a short text code (EE, COE…) in a neutral chip; never colour-coded.
 *  The full name, and whether it was estimated from the title, is in the tooltip and for screen readers. */
export function ProgrammeBadge({ project }: { project: Pick<ProjectSummary, "programmeId" | "programmeProvenance"> }) {
  const core = useCore();
  const prog = core.programmeById.get(project.programmeId);
  const full = `${prog?.label ?? "Programme not identified"}${project.programmeProvenance === "inferred-from-title" ? ", estimated from the title" : ""}`;
  return (
    <span className="prog" title={full}>
      <span aria-hidden="true">{prog?.code ?? "?"}</span>
      <span className="visually-hidden">{full}</span>
    </span>
  );
}
