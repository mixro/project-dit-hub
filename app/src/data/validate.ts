// Runtime validation at the data boundary. JSON from disk (or later, an API)
// is untrusted: a malformed record is skipped and counted, never allowed to
// throw inside a React render. Zero dependencies on purpose; swap for zod if
// the schema grows.

import type { Manifest, Problem, ProjectDetail, ProjectSummary } from "./types";

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function isProjectSummary(v: unknown): v is ProjectSummary {
  if (!isObj(v)) return false;
  return (
    isStr(v.id) && isStr(v.title) && v.title.length > 0 && isStrArr(v.altTitles) &&
    isNum(v.year) && isStr(v.academicYear) && isStr(v.institutionId) && isStr(v.programmeId) &&
    isStr(v.event) && isStr(v.decision) && isStrArr(v.problemIds) && isStrArr(v.categoryIds) &&
    isStrArr(v.domainIds) && isStrArr(v.technologyIds) && isStrArr(v.placeIds) && isStr(v.sourceId)
  );
}

export function isProjectDetail(v: unknown): v is ProjectDetail {
  if (!isObj(v)) return false;
  return (
    isStr(v.id) && Array.isArray(v.titleHistory) && v.titleHistory.length > 0 &&
    isStr(v.decision) && Array.isArray(v.similar) && isStrArr(v.relatedSubmissionIds) && isObj(v.source)
  );
}

export function isProblem(v: unknown): v is Problem {
  if (!isObj(v)) return false;
  return isStr(v.id) && isStr(v.title) && isStr(v.description) && isStrArr(v.categoryIds) && isNum(v.projectCount);
}

export function isManifest(v: unknown): v is Manifest {
  if (!isObj(v) || !isObj(v.files) || !isObj(v.counts)) return false;
  return isNum(v.schemaVersion) && isStr(v.datasetVersion) && isStr(v.files.index) && isObj(v.files.details);
}

/** Keep valid items, count the rest. */
export function filterValid<T>(items: unknown, guard: (v: unknown) => v is T): { valid: T[]; skipped: number } {
  if (!Array.isArray(items)) return { valid: [], skipped: 0 };
  const valid: T[] = [];
  let skipped = 0;
  for (const item of items) {
    if (guard(item)) valid.push(item);
    else skipped += 1;
  }
  return { valid, skipped };
}
