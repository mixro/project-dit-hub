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
  const count = core.projects.length.toLocaleString("en-US");
  const from = Math.min(...years);
  const to = Math.max(...years);
  const unconfirmed = core.sources.filter((s) => s.institutionId === "unconfirmed").length;

  // Most-worked-on problems first, so the order itself shows where past effort went.
  const problems = useMemo(
    () => core.problems.filter((p) => p.projectCount > 0).sort((a, b) => b.projectCount - a.projectCount || a.title.localeCompare(b.title)),
    [core.problems],
  );

  const go = (q: string) => {
    if (!q) return navigate("/projects");
    track("search_performed", { q, from: "home" });
    navigate(`/projects?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="home">
      <section className="hero">
        {/* <p className="hero-pill">
          <span className="hero-pill-dot" aria-hidden="true" />
          {count} projects · {from}–{to}
        </p> */}
        <h1>
          <span>What problem do</span> <span>you want to <em>solve?</em></span>
        </h1>
        <p className="lead">
          {/* Line breaks as in the design: after "projects" on wide screens, before "before" on phones. */}
          <span className="lead-a">Search {count} final-year engineering projects</span> from {from} to {to}{" "}
          <span className="lead-c">before you choose your own.</span>
        </p>
        <SearchBox large onSubmit={go} placeholder="e.g. solar irrigation" />
        <p className="examples">
          <span className="examples-label">Try</span>
          {EXAMPLES.map((e) => (
            <Link key={e} to={`/projects?q=${encodeURIComponent(e)}`} className="example-chip" onClick={() => track("search_performed", { q: e, from: "example" })}>{e}</Link>
          ))}
        </p>
      </section>

      <Link to="/check" className="idea-cta">
        <span className="idea-cta-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
          </svg>
        </span>
        <span className="idea-cta-text">
          <strong>Already have an idea?</strong>
          <span>Describe it and see which past projects are closest.</span>
        </span>
        <span className="idea-cta-btn">
          Check your idea
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>

      <section className="index" aria-labelledby="index-h">
        <h2 id="index-h">Problems students have worked on</h2>
        <p className="muted">Most projects first. Open one to see how solutions changed over the years.</p>
        <ul className="problem-grid">
          {problems.map((p) => (
            <li key={p.id}>
              <Link to={`/problems/${p.id}`} className="problem-card" onClick={() => track("problem_opened", { id: p.id, from: "home-index" })}>
                <span className="problem-card-title">{p.title}</span>
                <span className="problem-card-count">{p.projectCount} {p.projectCount === 1 ? "project" : "projects"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {unconfirmed > 0 && (
        <p className="notice">
          {unconfirmed} of {core.sources.length} source lists do not name DIT, so their projects are marked “Unconfirmed”. Some come from other institutions.{" "}
          <Link to="/about">Read about the data</Link>
        </p>
      )}
    </div>
  );
}
