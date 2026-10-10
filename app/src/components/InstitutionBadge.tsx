import type { ProjectSummary } from "../data/types";

/** Shown when the list a project comes from does not name DIT in its header. Text, never colour alone. */
export function InstitutionBadge({ project }: { project: Pick<ProjectSummary, "institutionId"> }) {
  if (project.institutionId !== "unconfirmed") return null;
  return (
    <span className="inst-flag" title="The list this project comes from does not name DIT. It may be from another institution.">
      Unconfirmed<span className="visually-hidden"> institution</span>
    </span>
  );
}
