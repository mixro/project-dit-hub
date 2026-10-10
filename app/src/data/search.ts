// Client-side search and "check my idea".
// The tokenizer mirrors pipeline/src/textnorm.py so scores agree with the
// precomputed similar-project lists. Stopwords, ignored place words and IDF
// weights come from search.json, so the pipeline remains the single source of truth.

import type { Problem, ProjectSummary, SearchModel, Taxonomy } from "./types";

const TOKEN_RE = /[a-z0-9₂]+/g;

export function stem(tok: string): string {
  if (tok.length > 4 && tok.endsWith("ies")) return tok.slice(0, -3) + "y";
  if (tok.length > 3 && tok.endsWith("s") && !tok.endsWith("ss")) return tok.slice(0, -1);
  return tok;
}

export function tokenize(text: string, drop: Set<string>): string[] {
  const out: string[] = [];
  for (const t of text.toLowerCase().match(TOKEN_RE) ?? []) {
    if (t.length < 2 || drop.has(t) || /^\d+$/.test(t)) continue;
    out.push(stem(t));
  }
  return out;
}

// Concept expansion so "water" also finds irrigation, pumps and tanks, and a few
// Swahili words students may type. Extend this list from real search logs.
const SYNONYMS: Record<string, string[]> = {
  water: ["irrigation", "pump", "tank", "desalination", "sewage", "leakage", "pipe"],
  maji: ["water"],
  umeme: ["electricity", "power", "energy"],
  electricity: ["power", "energy", "meter"],
  kilimo: ["agriculture", "farm", "crop", "irrigation"],
  farm: ["agriculture", "crop", "irrigation", "poultry"],
  jua: ["solar"],
  solar: ["photovoltaic", "pv"],
  hospitali: ["hospital", "patient", "medical"],
  health: ["hospital", "patient", "medical"],
  usalama: ["security", "safety"],
  security: ["theft", "alarm", "intruder", "access"],
  car: ["vehicle"],
  gari: ["vehicle", "car"],
  ai: ["artificial", "intelligence", "machine", "learning"],
  phone: ["mobile", "gsm", "sms"],
};

interface IndexedProject {
  project: ProjectSummary;
  fields: { text: string; weight: number }[];
}

export class ProjectSearch {
  private indexed: IndexedProject[];

  constructor(projects: ProjectSummary[], problems: Problem[], taxonomy: Taxonomy) {
    const label = new Map<string, string>();
    for (const list of [taxonomy.categories, taxonomy.domains, taxonomy.technologies, taxonomy.places]) {
      for (const l of list) label.set(l.id, l.label);
    }
    const problemTitle = new Map(problems.map((p) => [p.id, p.title]));
    const labels = (ids: string[], m: Map<string, string>) => ids.map((i) => m.get(i) ?? "").join(" ").toLowerCase();

    this.indexed = projects.map((project) => ({
      project,
      fields: [
        { text: project.title.toLowerCase(), weight: 3 },
        { text: project.altTitles.join(" ").toLowerCase(), weight: 2 },
        { text: labels(project.problemIds, problemTitle), weight: 2 },
        { text: labels(project.technologyIds, label), weight: 1.5 },
        { text: labels([...project.categoryIds, ...project.domainIds], label), weight: 1 },
        { text: labels(project.placeIds, label) + " " + (project.year ?? project.academicYear ?? ""), weight: 1 },
      ],
    }));
  }

  /** Returns projects with a relevance score. Exact query words count more than synonyms. */
  search(query: string): Map<string, number> {
    const words = (query.toLowerCase().match(TOKEN_RE) ?? []).filter((w) => w.length >= 2);
    const scores = new Map<string, number>();
    if (words.length === 0) return scores;
    for (const { project, fields } of this.indexed) {
      let score = 0;
      let matchedWords = 0;
      for (const w of words) {
        const variants = [{ term: w, boost: 1 }, ...(SYNONYMS[w] ?? []).map((s) => ({ term: s, boost: 0.4 }))];
        let best = 0;
        for (const { term, boost } of variants) {
          for (const f of fields) {
            // Prefix match lets "irrig" find "irrigation" while typing.
            if (f.text.includes(term)) best = Math.max(best, f.weight * boost);
          }
        }
        if (best > 0) matchedWords += 1;
        score += best;
      }
      // Projects matching every query word rank above those matching only some.
      if (score > 0) scores.set(project.id, score + matchedWords * 10);
    }
    return scores;
  }
}

export interface IdeaMatch {
  project: ProjectSummary;
  score: number;
  band: "closely-related" | "related" | "loosely-related";
  sharedTerms: string[];
  sharedProblemIds: string[];
  sharedTechnologyIds: string[];
}

interface CompiledRules {
  problems: { id: string; any: RegExp[]; requires: RegExp[]; excludes: RegExp[] }[];
  technologies: { id: string; patterns: RegExp[] }[];
  domains: { id: string; patterns: RegExp[] }[];
}
const compiled = new WeakMap<SearchModel, CompiledRules>();
const rx = (ps: string[]) => ps.map((p) => new RegExp(p, "i"));

function rules(model: SearchModel): CompiledRules {
  let c = compiled.get(model);
  if (!c) {
    c = {
      problems: model.rules.problems.map((p) => ({ id: p.id, any: rx(p.any), requires: rx(p.requires), excludes: rx(p.excludes) })),
      technologies: model.rules.technologies.map((t) => ({ id: t.id, patterns: rx(t.patterns) })),
      domains: model.rules.domains.map((t) => ({ id: t.id, patterns: rx(t.patterns) })),
    };
    compiled.set(model, c);
  }
  return c;
}

/** Tag free text with the same rules the pipeline used for titles. */
export function classify(text: string, model: SearchModel) {
  const r = rules(model);
  const t = text.toLowerCase();
  return {
    problemIds: r.problems.filter((p) =>
      p.requires.every((x) => x.test(t)) && !p.excludes.some((x) => x.test(t)) && p.any.some((x) => x.test(t))).map((p) => p.id),
    technologyIds: r.technologies.filter((x) => x.patterns.some((p) => p.test(t))).map((x) => x.id),
    domainIds: r.domains.filter((x) => x.patterns.some((p) => p.test(t))).map((x) => x.id),
  };
}

const overlap = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const inter = a.filter((x) => sb.has(x)).length;
  return inter / new Set([...a, ...b]).size;
};

/**
 * "Check my idea": the same formula as the pipeline's precomputed similarity,
 * TF-IDF on words plus overlap of problems, technologies and fields,
 * so a typed idea is judged exactly like a project title.
 * It reports relatedness. It never says an idea is "original".
 */
export function checkIdea(idea: string, projects: ProjectSummary[], model: SearchModel, limit = 10): IdeaMatch[] {
  const drop = new Set([...model.stopwords, ...model.ignoredPlaceWords]);
  const w = model.weights;
  const vec = (toks: string[]) => {
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v = new Map<string, number>();
    let norm = 0;
    for (const [t, c] of tf) {
      const x = (1 + Math.log(c)) * (model.idf[t] ?? Math.log(model.documentCount + 1) + 1);
      v.set(t, x);
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, x] of v) v.set(t, x / norm);
    return v;
  };

  const q = vec(tokenize(idea, drop));
  if (q.size === 0) return [];
  const tags = classify(idea, model);
  const matches: IdeaMatch[] = [];
  for (const p of projects) {
    const pv = vec(tokenize([p.title, ...p.altTitles].join(" "), drop));
    let cos = 0;
    const shared: [string, number][] = [];
    for (const [t, x] of q) {
      const o = pv.get(t);
      if (o) { cos += x * o; shared.push([t, x * o]); }
    }
    const score = w.text * cos + w.problems * overlap(tags.problemIds, p.problemIds)
      + w.technologies * overlap(tags.technologyIds, p.technologyIds) + w.domains * overlap(tags.domainIds, p.domainIds);
    const band = score >= 0.55 ? "closely-related" : score >= 0.32 ? "related" : score >= 0.18 ? "loosely-related" : null;
    if (band) {
      matches.push({
        project: p,
        score: Math.round(score * 1000) / 1000,
        band,
        sharedTerms: shared.sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 5),
        sharedProblemIds: tags.problemIds.filter((x) => p.problemIds.includes(x)),
        sharedTechnologyIds: tags.technologyIds.filter((x) => p.technologyIds.includes(x)),
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Wording the UI must use. Keeps the platform from making originality claims. */
export function ideaCheckSummary(matches: IdeaMatch[], projectCount: number, years: number[]): string {
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
  if (matches.length === 0) {
    return `No highly similar project was found among the ${projectCount} projects in the current dataset (${span}). This is not a judgement of originality. Discuss your idea with your supervisor.`;
  }
  const close = matches.filter((m) => m.band === "closely-related").length;
  return close > 0
    ? `${close} closely related project${close > 1 ? "s" : ""} found. Study how your idea differs before proposing it.`
    : `${matches.length} related project${matches.length > 1 ? "s" : ""} found. They may help you sharpen what is new in your idea.`;
}
