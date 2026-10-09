// Loads the public dataset from /public/data without ever blocking or crashing the app.
//
// How it avoids load failures:
//  1. Data is NOT bundled into JavaScript. The app shell renders immediately and
//     fetches JSON in the background, so data size never slows the first paint.
//  2. manifest.json is fetched first. Its datasetVersion is appended to every URL,
//     so browsers never mix old and new files after a redeploy.
//  3. Only the small index (~200 KB) is needed for the first screen. Project
//     details are split per source document and loaded when a project opens.
//  4. Every request has a timeout and retries with backoff on network errors.
//  5. Every record is validated. Bad records are skipped and counted.
//  6. Failures return Result values the UI can show with a retry button,
//     instead of exceptions thrown during render.
//  7. In-flight requests are shared, so ten components asking at once make one fetch.

import type { CoreData, DataError, Manifest, Problem, ProjectDetail, ProjectSummary, Result, SearchModel, SourceInfo, Taxonomy } from "./types";
import { filterValid, isManifest, isProblem, isProjectDetail, isProjectSummary } from "./validate";

const SUPPORTED_SCHEMA = 2;

export interface DataClientOptions {
  baseUrl?: string; // e.g. `${import.meta.env.BASE_URL}data/` in Vite
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
}

const err = (kind: DataError["kind"], message: string, retryable: boolean): DataError => ({ kind, message, retryable });

export class DataClient {
  private baseUrl: string;
  private timeoutMs: number;
  private retries: number;
  private fetchImpl: typeof fetch;

  private corePromise: Promise<Result<CoreData>> | null = null;
  private detailPromises = new Map<string, Promise<Result<Map<string, ProjectDetail>>>>();
  private searchPromise: Promise<Result<SearchModel>> | null = null;
  private manifest: Manifest | null = null;

  constructor(opts: DataClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "/data/").replace(/\/?$/, "/");
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.retries = opts.retries ?? 2;
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));
  }

  private url(file: string): string {
    // manifest.json is requested without a query so it matches the <link rel="preload">
    // in index.html. Static hosts serve it with revalidation, so it is never stale for long.
    const v = this.manifest ? `?v=${this.manifest.datasetVersion}` : "";
    return `${this.baseUrl}${file}${v}`;
  }

  private async fetchJson(file: string): Promise<Result<unknown>> {
    let last: DataError = err("network", "Request not attempted", true);
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(this.url(file), { signal: controller.signal });
        if (res.status === 404) return { ok: false, error: err("not-found", `${file} not found`, false) };
        if (!res.ok) {
          last = err("network", `${file}: HTTP ${res.status}`, res.status >= 500);
          if (!last.retryable) return { ok: false, error: last };
          continue;
        }
        try {
          return { ok: true, value: await res.json() };
        } catch {
          return { ok: false, error: err("invalid-data", `${file} is not valid JSON`, false) };
        }
      } catch (e) {
        last = (e as Error).name === "AbortError"
          ? err("timeout", `${file} took longer than ${this.timeoutMs / 1000}s`, true)
          : err("network", `Could not reach ${file}. Check your connection.`, true);
      } finally {
        clearTimeout(timer);
      }
    }
    return { ok: false, error: last };
  }

  /** Index, problems, taxonomy and sources: everything the first screens need. */
  loadCore(): Promise<Result<CoreData>> {
    if (!this.corePromise) {
      this.corePromise = this.doLoadCore().then((r) => {
        if (!r.ok) this.corePromise = null; // allow the UI to retry
        return r;
      });
    }
    return this.corePromise;
  }

  private async doLoadCore(): Promise<Result<CoreData>> {
    const m = await this.fetchJson("manifest.json");
    if (!m.ok) return m;
    if (!isManifest(m.value)) return { ok: false, error: err("invalid-data", "manifest.json is malformed", false) };
    if (m.value.schemaVersion !== SUPPORTED_SCHEMA) {
      return { ok: false, error: err("schema-mismatch", `Data schema v${m.value.schemaVersion} needs an app update (supports v${SUPPORTED_SCHEMA})`, false) };
    }
    this.manifest = m.value;
    const f = m.value.files;

    const [idx, probs, tax, srcs] = await Promise.all([
      this.fetchJson(f.index), this.fetchJson(f.problems), this.fetchJson(f.taxonomy), this.fetchJson(f.sources),
    ]);
    for (const r of [idx, probs, tax, srcs]) if (!r.ok) return r;

    const projects = filterValid<ProjectSummary>((idx as { value: unknown }).value, isProjectSummary);
    const problems = filterValid<Problem>((probs as { value: unknown }).value, isProblem);
    if (projects.valid.length === 0) {
      return { ok: false, error: err("invalid-data", "No valid projects in the dataset", false) };
    }
    if (projects.skipped + problems.skipped > 0) {
      console.warn(`[data] skipped ${projects.skipped} projects and ${problems.skipped} problems that failed validation`);
    }
    return {
      ok: true,
      value: {
        manifest: m.value,
        projects: projects.valid,
        problems: problems.valid,
        taxonomy: (tax as { value: Taxonomy }).value,
        sources: (srcs as { value: SourceInfo[] }).value,
        skippedRecords: projects.skipped + problems.skipped,
      },
    };
  }

  /** Detail shard for one source document, loaded when a project from it is opened. */
  loadDetails(sourceId: string): Promise<Result<Map<string, ProjectDetail>>> {
    let p = this.detailPromises.get(sourceId);
    if (!p) {
      p = this.doLoadDetails(sourceId).then((r) => {
        if (!r.ok) this.detailPromises.delete(sourceId);
        return r;
      });
      this.detailPromises.set(sourceId, p);
    }
    return p;
  }

  private async doLoadDetails(sourceId: string): Promise<Result<Map<string, ProjectDetail>>> {
    const core = await this.loadCore();
    if (!core.ok) return core;
    const file = core.value.manifest.files.details[sourceId];
    if (!file) return { ok: false, error: err("not-found", `No detail file for source ${sourceId}`, false) };
    const r = await this.fetchJson(file);
    if (!r.ok) return r;
    const map = new Map<string, ProjectDetail>();
    if (r.value && typeof r.value === "object") {
      for (const [id, d] of Object.entries(r.value as Record<string, unknown>)) {
        if (isProjectDetail(d)) map.set(id, d);
      }
    }
    return { ok: true, value: map };
  }

  /** Search vocabulary for "check my idea". Only loaded when that feature is used. */
  loadSearchModel(): Promise<Result<SearchModel>> {
    if (!this.searchPromise) {
      this.searchPromise = (async (): Promise<Result<SearchModel>> => {
        const core = await this.loadCore();
        if (!core.ok) return core;
        const r = await this.fetchJson(core.value.manifest.files.search);
        if (!r.ok) {
          this.searchPromise = null;
          return r;
        }
        return { ok: true, value: r.value as SearchModel };
      })();
    }
    return this.searchPromise;
  }

  /** Warm the cache in idle time, e.g. after the home page renders. */
  prefetchAllDetails(): void {
    void this.loadCore().then((core) => {
      if (!core.ok) return;
      for (const sid of Object.keys(core.value.manifest.files.details)) void this.loadDetails(sid);
    });
  }
}

export const dataClient = new DataClient();
