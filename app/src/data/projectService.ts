// The ONLY module UI components call for data.
// Every function is async and returns Result<T>, exactly like a REST client would.
// Phase 5: replace the bodies with fetch(`/api/projects?...`) calls. Pages and
// components will not change.

import { dataClient, type DataClient } from "./dataClient";
import { ProjectSearch, checkIdea, ideaCheckSummary, type IdeaMatch } from "./search";
import type { CoreData, Facet, Problem, Project, ProjectQuery, ProjectQueryResult, ProjectSummary, Result } from "./types";

let searchCache: { version: string; search: ProjectSearch } | null = null;

function getSearch(core: CoreData): ProjectSearch {
  if (!searchCache || searchCache.version !== core.manifest.datasetVersion) {
    searchCache = { version: core.manifest.datasetVersion, search: new ProjectSearch(core.projects, core.problems, core.taxonomy) };
  }
  return searchCache.search;
}

function facet<K extends keyof ProjectSummary>(items: ProjectSummary[], key: K): Facet[] {
  const counts = new Map<string, number>();
  for (const p of items) {
    const v = p[key];
    for (const id of Array.isArray(v) ? v : [String(v)]) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

const anyOf = (selected: string[] | undefined, values: string[]) =>
  !selected?.length || selected.some((s) => values.includes(s));

export function createProjectService(client: DataClient = dataClient) {
  return {
    async getCore(): Promise<Result<CoreData>> {
      return client.loadCore();
    },

    async queryProjects(q: ProjectQuery): Promise<Result<ProjectQueryResult>> {
      const core = await client.loadCore();
      if (!core.ok) return core;
      const { projects } = core.value;

      const scores = q.text?.trim() ? getSearch(core.value).search(q.text) : null;
      type Group = "years" | "decisions" | "programmeIds" | "categoryIds" | "domainIds" | "technologyIds" | "problemIds";
      const passes = (p: ProjectSummary, skip?: Group) =>
        (!scores || scores.has(p.id)) &&
        (skip === "years" || !q.years?.length || q.years.includes(p.year)) &&
        (skip === "decisions" || !q.decisions?.length || q.decisions.includes(p.decision)) &&
        (skip === "programmeIds" || anyOf(q.programmeIds, [p.programmeId])) &&
        (skip === "categoryIds" || anyOf(q.categoryIds, p.categoryIds)) &&
        (skip === "domainIds" || anyOf(q.domainIds, p.domainIds)) &&
        (skip === "technologyIds" || anyOf(q.technologyIds, p.technologyIds)) &&
        (skip === "problemIds" || anyOf(q.problemIds, p.problemIds));
      const matched = projects.filter((p) => passes(p));
      // Each facet counts results under all OTHER filters, so options in the same
      // group stay visible and multi-select within a group works.
      const facetFor = <K extends keyof ProjectSummary>(group: Group, key: K) =>
        facet(projects.filter((p) => passes(p, group)), key);

      const sort = q.sort ?? (scores ? "relevance" : "newest");
      const sorted = [...matched].sort((a, b) => {
        if (sort === "relevance" && scores) return (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
        if (sort === "oldest") return a.year - b.year || a.title.localeCompare(b.title);
        if (sort === "title") return a.title.localeCompare(b.title);
        return b.year - a.year || a.title.localeCompare(b.title);
      });

      const pageSize = q.pageSize ?? 24;
      const page = Math.max(1, q.page ?? 1);
      return {
        ok: true,
        value: {
          items: sorted.slice((page - 1) * pageSize, page * pageSize),
          total: sorted.length,
          page,
          pageSize,
          facets: {
            years: facetFor("years", "year"),
            decisions: facetFor("decisions", "decision"),
            categoryIds: facetFor("categoryIds", "categoryIds"),
            domainIds: facetFor("domainIds", "domainIds"),
            technologyIds: facetFor("technologyIds", "technologyIds"),
            programmeIds: facetFor("programmeIds", "programmeId"),
          },
        },
      };
    },

    async getProject(id: string): Promise<Result<Project>> {
      const core = await client.loadCore();
      if (!core.ok) return core;
      const summary = core.value.projects.find((p) => p.id === id);
      if (!summary) return { ok: false, error: { kind: "not-found", message: "Project not found", retryable: false } };
      const details = await client.loadDetails(summary.sourceId);
      if (!details.ok) return details;
      const detail = details.value.get(id);
      if (!detail) return { ok: false, error: { kind: "not-found", message: "Project details missing", retryable: false } };
      return { ok: true, value: { ...summary, detail } };
    },

    async getProjectsByIds(ids: string[]): Promise<Result<ProjectSummary[]>> {
      const core = await client.loadCore();
      if (!core.ok) return core;
      const byId = new Map(core.value.projects.map((p) => [p.id, p]));
      return { ok: true, value: ids.map((i) => byId.get(i)).filter((p): p is ProjectSummary => !!p) };
    },

    /** Problem page: the problem plus its projects in chronological order (project evolution). */
    async getProblem(id: string): Promise<Result<{ problem: Problem; projects: ProjectSummary[] }>> {
      const core = await client.loadCore();
      if (!core.ok) return core;
      const problem = core.value.problems.find((p) => p.id === id);
      if (!problem) return { ok: false, error: { kind: "not-found", message: "Problem not found", retryable: false } };
      const projects = core.value.projects
        .filter((p) => p.problemIds.includes(id))
        .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
      return { ok: true, value: { problem, projects } };
    },

    async checkIdea(idea: string): Promise<Result<{ matches: IdeaMatch[]; summary: string }>> {
      const [core, model] = await Promise.all([client.loadCore(), client.loadSearchModel()]);
      if (!core.ok) return core;
      if (!model.ok) return model;
      const matches = checkIdea(idea, core.value.projects, model.value);
      return { ok: true, value: { matches, summary: ideaCheckSummary(matches, core.value.projects.length, core.value.manifest.counts.years) } };
    },

    /** Insights page. Always computed from data, never hardcoded. */
    async getInsights(): Promise<Result<{
      byYear: Facet[]; byDecision: Facet[]; topCategories: Facet[]; topTechnologies: Facet[]; topProblems: Facet[];
    }>> {
      const core = await client.loadCore();
      if (!core.ok) return core;
      const ps = core.value.projects;
      return {
        ok: true,
        value: {
          byYear: facet(ps, "year"),
          byDecision: facet(ps, "decision"),
          topCategories: facet(ps, "categoryIds").slice(0, 10),
          topTechnologies: facet(ps, "technologyIds").slice(0, 10),
          topProblems: facet(ps, "problemIds").slice(0, 10),
        },
      };
    },
  };
}

export const projectService = createProjectService();
export type ProjectService = ReturnType<typeof createProjectService>;
