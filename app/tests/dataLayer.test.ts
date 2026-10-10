// Run: npx tsx frontend/tests/dataLayer.test.ts
// Exercises the real data layer against output/public, including failure modes.
import { readFileSync } from "node:fs";
import { DataClient } from "../src/data/dataClient";
import { createProjectService } from "../src/data/projectService";

const DIR = new URL("../../output/public/", import.meta.url);
let pass = 0, fail = 0;
const check = (name: string, cond: boolean, info = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? "  — " + info : ""}`); };

function fileFetch(opts: { failFirst?: number; corrupt?: boolean; hang?: string } = {}): typeof fetch {
  let failures = opts.failFirst ?? 0;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const file = String(input).split("/").pop()!.split("?")[0];
    if (opts.hang && file === opts.hang) {
      return new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    }
    if (failures > 0) { failures--; throw new TypeError("network down"); }
    try {
      let body = readFileSync(new URL(file, DIR), "utf8");
      if (opts.corrupt && file === "projects.index.json") {
        const arr = JSON.parse(body); arr[0] = { id: 42 }; arr[1].title = ""; body = JSON.stringify(arr);
      }
      return new Response(body, { status: 200 });
    } catch { return new Response("", { status: 404 }); }
  }) as typeof fetch;
}

const svc = createProjectService(new DataClient({ baseUrl: "/data/", fetchImpl: fileFetch() }));

const core = await svc.getCore();
check("core loads", core.ok, core.ok ? `${core.value.projects.length} projects, ${core.value.problems.length} problems` : "");

const water = await svc.queryProjects({ text: "water" });
check("search 'water' finds irrigation too", water.ok && water.value.items.some(p => /irrigat/i.test(p.title)), water.ok ? `${water.value.total} results` : "");

const maji = await svc.queryProjects({ text: "maji" });
check("Swahili 'maji' finds water projects", maji.ok && maji.value.total > 10, maji.ok ? `${maji.value.total} results` : "");

const filtered = await svc.queryProjects({ years: [2026], decisions: ["accepted"], technologyIds: ["solar-pv"] });
check("combined filters", filtered.ok && filtered.value.items.every(p => p.year === 2026 && p.decision === "accepted" && p.technologyIds.includes("solar-pv")), filtered.ok ? `${filtered.value.total} results` : "");

if (water.ok) {
  const proj = await svc.getProject(water.value.items[0].id);
  check("project detail loads lazily", proj.ok && proj.value.detail.titleHistory.length > 0, proj.ok ? proj.value.title : "");
}

const prob = await svc.getProblem("irrigation");
const yearOrLast = (y: number | null) => y ?? Infinity; // projects without a single year come last
check("problem evolution sorted by year", prob.ok && prob.value.projects.every((p, i, a) => i === 0 || yearOrLast(a[i - 1].year) <= yearOrLast(p.year)), prob.ok ? `${prob.value.projects.length} projects` : "");

const idea = await svc.checkIdea("solar powered irrigation pump controlled by soil moisture sensors");
check("idea check finds related work", idea.ok && idea.value.matches.length > 0, idea.ok ? idea.value.summary : "");
if (idea.ok) idea.value.matches.slice(0, 4).forEach(m => console.log(`       ${m.score.toFixed(2)} ${m.band.padEnd(16)} ${m.project.year} ${m.project.title.slice(0, 70)}`));

const novel = await svc.checkIdea("quantum entanglement telescope calibration");
check("no-match wording avoids originality claim", novel.ok && /not a judgement of originality/.test(novel.value.summary));

const ins = await svc.getInsights();
const yearCount = core.ok ? core.value.manifest.counts.years.length : -1;
check("insights computed for every year in the data", ins.ok && ins.value.byYear.length === yearCount, ins.ok ? JSON.stringify(ins.value.byYear) : "");

const multi = await svc.queryProjects({ text: "phone jammer" });
check("new 2018 themes searchable", multi.ok && multi.value.items.some(p => p.year === 2018), multi.ok ? `${multi.value.total} results` : "");

if (core.ok) {
  const alt = core.value.projects.find(p => p.sourceId === "tentative-2018" && /Fastest Auto Selection/i.test(p.title));
  const det = alt ? await svc.getProject(alt.id) : null;
  check("alternative titles linked to each other", !!det && det.ok && det.value.detail.relatedSubmissionIds.length === 2,
        det && det.ok ? `${det.value.detail.relatedSubmissionIds.length} linked` : "");
}

// ---- programmes (schema 2) ----
if (core.ok) {
  const { projects, taxonomy, sources } = core.value;
  const progs = new Set(taxonomy.programmes.map(p => p.id));
  const levels = new Set(taxonomy.levels.map(l => l.id));
  const badProg = projects.filter(p =>
    !progs.has(p.programmeId) || (p.levelId !== null && !levels.has(p.levelId)) ||
    !["recorded", "from-source-name", "inferred-from-title"].includes(p.programmeProvenance) ||
    // No confidence only when no programme could be estimated ("unassigned").
    (p.programmeProvenance === "inferred-from-title") !== (p.programmeConfidence !== undefined || p.programmeId === "unassigned"));
  check("every project has a known programme, level and programme provenance", badProg.length === 0, `${badProg.length} invalid`);

  const ee = ["ee-2026-title-defense", "bachelor-2020-final-presentation", "tentative-2018", "titles-2019"];
  check("the four original sources are Electrical Engineering",
        ee.every(id => sources.find(s => s.id === id)?.programmeId === "electrical-engineering") &&
        projects.filter(p => ee.includes(p.sourceId)).every(p => p.programmeId === "electrical-engineering" && p.programmeProvenance === "recorded"));

  check("only programmes with projects are published", taxonomy.programmes.every(g => projects.some(p => p.programmeId === g.id)),
        taxonomy.programmes.map(g => g.code).join(", "));

  const byId = new Map(projects.map(p => [p.id, p]));
  const sample = projects.filter((_, i) => i % 25 === 0);
  let splitOk = true;
  for (const s of sample) {
    const det = await svc.getProject(s.id);
    if (!det.ok) { splitOk = false; break; }
    const { sameProgramme, otherProgrammes } = det.value.detail.similar;
    splitOk &&= sameProgramme.length <= 6 && otherProgrammes.length <= 3 &&
      sameProgramme.every(x => byId.get(x.id)?.programmeId === s.programmeId) &&
      otherProgrammes.every(x => byId.has(x.id) && byId.get(x.id)!.programmeId !== s.programmeId);
  }
  check("similar projects are split into same and other programmes", splitOk, `${sample.length} projects checked`);

  check("unpublished sources (duplicate ETE list) are absent from public data",
        !sources.some(s => s.id === "ete-2025-title-defense-word") && !projects.some(p => p.sourceId === "ete-2025-title-defense-word"));

  check("institution is DIT or unconfirmed only, and UDSM shows as unconfirmed",
        projects.every(p => p.institutionId === "dit" || p.institutionId === "unconfirmed") &&
        projects.some(p => p.sourceId === "udsm-fyp-portal") && projects.filter(p => p.sourceId === "udsm-fyp-portal").every(p => p.institutionId === "unconfirmed"));

  check("projects without a single year load (year null, range kept)",
        projects.some(p => p.year === null && p.academicYear === "2019–2023") && projects.some(p => p.year === null && p.academicYear === null));

  const ict = projects.filter(p => p.sourceId === "ict-2025-title-list");
  const coe = projects.filter(p => p.sourceId === "coe-beng21-title-list");
  check("estimated programmes are labelled as estimates",
        ict.length > 0 && ict.every(p => p.programmeProvenance === "inferred-from-title" && !!p.programmeConfidence) &&
        coe.every(p => p.programmeProvenance === "from-source-name" && p.programmeId === "computer-engineering"),
        `${ict.length} ICT estimated`);

  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  check("group projects with identical titles are one project (COE)", new Set(coe.map(p => norm(p.title))).size === coe.length, `${coe.length} COE projects`);
}

// ---- failure modes ----
const flaky = createProjectService(new DataClient({ fetchImpl: fileFetch({ failFirst: 2 }), retries: 2 }));
const r1 = await flaky.getCore();
check("recovers after 2 network failures (retry)", r1.ok);

const corrupt = createProjectService(new DataClient({ fetchImpl: fileFetch({ corrupt: true }) }));
const r2 = await corrupt.getCore();
check("bad records skipped, app still loads", r2.ok && r2.value.skippedRecords === 2, r2.ok ? `skipped ${r2.value.skippedRecords}` : "");

const slow = new DataClient({ fetchImpl: fileFetch({ hang: "manifest.json" }), timeoutMs: 200, retries: 1 });
const r3 = await slow.loadCore();
check("timeout returns error instead of hanging", !r3.ok && r3.error.kind === "timeout" && r3.error.retryable, !r3.ok ? r3.error.message : "");

const missing = createProjectService(new DataClient({ fetchImpl: fileFetch() }));
const r4 = await missing.getProject("does-not-exist");
check("unknown project -> not-found result", !r4.ok && r4.error.kind === "not-found");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
