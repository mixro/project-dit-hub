// Types for the public dataset produced by pipeline/src/build.py (schemaVersion 2).
// These are also the shapes the future REST API should return, so the UI does
// not change when local JSON is replaced by a backend.

export type Decision =
  | "accepted"
  | "accepted-conditional"
  | "rejected"
  | "pending"
  | "not-presented"
  | "unknown";

/** How a project's programme was set: stated by the document or the user, read from the file name, or estimated from the title. */
export type ProgrammeProvenance = "recorded" | "from-source-name" | "inferred-from-title";

export type Provenance = "recorded" | "inferred" | "derived-from-title" | "general-problem-description" | "not-available";

export interface ProjectSummary {
  id: string;
  title: string;
  altTitles: string[];
  /** null: the document gives no single year (none stated, or a range such as 2019–2023). */
  year: number | null;
  /** As stated, e.g. "2025/2026" or "2019–2023"; null when not stated. */
  academicYear: string | null;
  /** "dit" only when the list's header names DIT; otherwise "unconfirmed". */
  institutionId: string;
  programmeId: string;
  programmeProvenance: ProgrammeProvenance;
  /** Only when the programme was estimated from the title. */
  programmeConfidence?: "high" | "low";
  /** null: the document does not state the level. */
  levelId: string | null;
  event: string;
  decision: Decision;
  problemIds: string[];
  categoryIds: string[];
  domainIds: string[];
  technologyIds: string[];
  placeIds: string[];
  sourceId: string;
}

export interface TitleVersion {
  role: "proposed" | "approved-wording" | "revised" | "second-proposal" | "presented" | "listed" | "alternative-proposal";
  title: string;
  asWritten: string;
  corrections: { from: string; to: string }[];
  decision?: Decision;
}

export interface SimilarProject {
  id: string;
  score: number;
  band: "closely-related" | "related" | "loosely-related";
  reasons: { sharedTerms: string[]; sharedProblemIds: string[]; sharedTechnologyIds: string[] };
}

export interface ProjectDetail {
  id: string;
  titleHistory: TitleVersion[];
  decision: Decision;
  decisionProvenance: "recorded" | "inferred";
  remarksAsWritten: string | null;
  annotations: string[];
  workTypeIds: string[];
  provenance: Record<string, Provenance>;
  source: { sourceId: string; serial: string | null; duplicateCount: number };
  relatedSubmissionIds: string[];
  similar: { sameProgramme: SimilarProject[]; otherProgrammes: SimilarProject[] };
}

export interface Project extends ProjectSummary {
  detail: ProjectDetail;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  categoryIds: string[];
  /** null: the problem can arise in any programme. */
  programmeId: string | null;
  projectCount: number;
  projectCountByYear: Record<string, number>;
  topTechnologyIds: string[];
  decisionCounts: Partial<Record<Decision, number>>;
}

export interface Label {
  id: string;
  label: string;
  note?: string;
}

export interface Programme extends Label {
  code: string;
  departmentId: string;
}

export interface Taxonomy {
  categories: Label[];
  domains: (Label & { programmeId: string })[];
  /** programmeIds empty: relevant to every programme. */
  technologies: (Label & { programmeIds: string[] })[];
  places: Label[];
  workTypes: Label[];
  decisions: Label[];
  events: Label[];
  institutions: Label[];
  /** Only programmes that have published projects. */
  programmes: Programme[];
  levels: Label[];
}

export interface SourceInfo {
  id: string;
  documentName: string;
  institutionId: string;
  departmentId: string | null;
  programmeId: string;
  programmeProvenance: ProgrammeProvenance;
  levelId: string | null;
  /** Level as written in the source document. */
  level: string | null;
  yearProvenance: "recorded" | "inferred";
  cohort: string | null;
  academicYear: string | null;
  year: number | null;
  event: string;
  eventDate: string | null;
  notes: string;
  projectCount: number;
  missingSerialNumbers: number[];
}

export interface SearchModel {
  weights: { text: number; problems: number; technologies: number; domains: number };
  stopwords: string[];
  ignoredPlaceWords: string[];
  idf: Record<string, number>;
  documentCount: number;
  rules: {
    problems: { id: string; any: string[]; requires: string[]; excludes: string[]; programmeId: string | null }[];
    technologies: { id: string; patterns: string[]; programmeIds: string[] }[];
    domains: { id: string; patterns: string[]; programmeId: string }[];
  };
}

export interface Manifest {
  schemaVersion: number;
  datasetVersion: string;
  generatedAt: string;
  counts: { projects: number; problems: number; sources: number; years: number[] };
  files: {
    index: string;
    problems: string;
    taxonomy: string;
    sources: string;
    search: string;
    details: Record<string, string>;
  };
  integrity: Record<string, { bytes: number; sha256: string }>;
}

/** Everything needed for the first screen. Details load lazily per source. */
export interface CoreData {
  manifest: Manifest;
  projects: ProjectSummary[];
  problems: Problem[];
  taxonomy: Taxonomy;
  sources: SourceInfo[];
  /** Records that failed validation and were skipped instead of crashing the app. */
  skippedRecords: number;
}

export interface ProjectQuery {
  text?: string;
  years?: number[];
  programmeIds?: string[];
  decisions?: Decision[];
  categoryIds?: string[];
  domainIds?: string[];
  technologyIds?: string[];
  problemIds?: string[];
  sort?: "relevance" | "newest" | "oldest" | "title";
  page?: number;
  pageSize?: number;
}

export interface Facet {
  id: string;
  count: number;
}

export interface ProjectQueryResult {
  items: ProjectSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    years: Facet[];
    decisions: Facet[];
    categoryIds: Facet[];
    domainIds: Facet[];
    technologyIds: Facet[];
    programmeIds: Facet[];
  };
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DataError };

export interface DataError {
  kind: "network" | "timeout" | "invalid-data" | "schema-mismatch" | "not-found";
  message: string;
  retryable: boolean;
}
