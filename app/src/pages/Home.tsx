import { useMemo } from "react";
import { SearchBox } from "../components/SearchBox";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link, navigate } from "../lib/router";
import { track } from "../lib/analytics";

const EXAMPLES = ["irrigation", "transformer", "solar", "water meter", "exam"];

export default function Home() {
  useDocumentTitle("");
  const core = useCore();
  const years = core.manifest.counts.years;
  const unconfirmed = core.sources.filter((s) => s.institutionId === "unconfirmed").length;

  // Problems sized by how many projects tackled them: the index *is* the data.
  const problems = useMemo(() => {
    const used = core.problems.filter((p) => p.projectCount > 0).sort((a, b) => a.title.localeCompare(b.title));
    const max = Math.max(...used.map((p) => p.projectCount));
    return used.map((p) => ({ ...p, size: p.projectCount / max > 0.5 ? 3 : p.projectCount / max > 0.2 ? 2 : 1 }));
  }, [core.problems]);

  const go = (q: string) => {
    if (!q) return navigate("/projects");
    track("search_performed", { q, from: "home" });
    navigate(`/projects?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="home">
      <section className="hero">
        <h1>What problem do you want to solve?</h1>
        <p className="lead">
          Search {core.projects.length} final-year engineering projects from {Math.min(...years)} to {Math.max(...years)} before you choose your own.
        </p>
        <SearchBox large onSubmit={go} placeholder="e.g. solar irrigation" />
        <p className="examples">
          Try{" "}
          {EXAMPLES.map((e, i) => (
            <span key={e}>
              <Link to={`/projects?q=${encodeURIComponent(e)}`} onClick={() => track("search_performed", { q: e, from: "example" })}>{e}</Link>
              {i < EXAMPLES.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </section>

      <Link to="/check" className="idea-cta">
        <strong>Already have an idea?</strong>
        <span>Describe it and see which past projects are closest.</span>
      </Link>

      <section className="index" aria-labelledby="index-h">
        <h2 id="index-h">Problems students have worked on</h2>
        <p className="muted">Larger names have more projects. Open one to see how solutions changed over the years.</p>
        <p className="problem-index">
          {problems.map((p) => (
            <Link key={p.id} to={`/problems/${p.id}`} className={`pi pi-${p.size}`} onClick={() => track("problem_opened", { id: p.id, from: "home-index" })}>
              {p.title}<sup>{p.projectCount}</sup>
            </Link>
          ))}
        </p>
      </section>

      {unconfirmed > 0 && (
        <p className="notice">
          {unconfirmed} of {core.sources.length} source lists may come from another university.{" "}
          <Link to="/about">Read about the data</Link>
        </p>
      )}
    </div>
  );
}
