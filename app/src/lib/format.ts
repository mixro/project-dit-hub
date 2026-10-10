import type { ProjectSummary } from "../data/types";

/** Year as students read it: the year, a stated range such as "2019–2023", or "Year not recorded". */
export const yearText = (p: Pick<ProjectSummary, "year" | "academicYear">): string =>
  p.year !== null ? String(p.year) : p.academicYear ?? "Year not recorded";
