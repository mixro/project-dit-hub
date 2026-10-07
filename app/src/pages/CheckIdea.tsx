import { useState, type FormEvent } from "react";
import { projectService } from "../data/projectService";
import type { DataError } from "../data/types";
import type { IdeaMatch } from "../data/search";
import { DecisionBadge } from "../components/Decision";
import { ErrorPanel } from "../components/States";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link } from "../lib/router";
import { track } from "../lib/analytics";

const KEY = "hub.idea.v1";
const BAND = { "closely-related": "Closely related", related: "Related", "loosely-related": "Loosely related" } as const;

function saved(): { idea: string; matches: IdeaMatch[]; summary: string } | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

export default function CheckIdea() {
  useDocumentTitle("Check your idea");
  const core = useCore();
  const initial = saved(); // survive "open a match, press Back"
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [result, setResult] = useState(initial ? { matches: initial.matches, summary: initial.summary } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const tooShort = idea.trim().split(/\s+/).filter(Boolean).length < 3;

  const run = async (e: FormEvent) => {
    e.preventDefault();
    if (tooShort) return;
    setBusy(true);
    const r = await projectService.checkIdea(idea);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setError(null);
    setResult(r.value);
    track("idea_checked", { words: idea.trim().split(/\s+/).length, text: idea.trim(), matches: r.value.matches.length });
    try { sessionStorage.setItem(KEY, JSON.stringify({ idea, ...r.value })); } catch { /* ignore */ }
  };

  return (
    <div className="check-page">
      <h1>Has my idea been done?</h1>
      <p className="lead">Describe your idea in a sentence or two. We compare it with every project title in the dataset.</p>

      <form onSubmit={run} className="idea-form">
        <label htmlFor="idea" className="label">Your idea</label>
        <textarea
          id="idea"
          rows={4}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Example: A solar-powered pump that waters crops automatically when soil moisture is low, for small farms in Morogoro."
        />
        <p className="hint">Mention the problem, who it is for, and the main technology. More detail gives better matches.</p>
        <button className="btn" type="submit" disabled={tooShort || busy}>{busy ? "Checking…" : "Check my idea"}</button>
      </form>

      {error && <ErrorPanel error={error} />}

      {result && (
        <section className="idea-results" aria-live="polite">
          <p className="summary">{result.summary}</p>
          {result.matches.length > 0 && (
            <>
              <ul className="similar">
                {result.matches.map((m) => (
                  <li key={m.project.id}>
                    <span className={`band band-${m.band}`}>{BAND[m.band]}</span>
                    <Link to={`/projects/${m.project.id}`}>{m.project.title}</Link>
                    <span className="similar-meta">{m.project.year}, <DecisionBadge decision={m.project.decision} /></span>
                    <span className="why">
                      Why: {[
                        m.sharedProblemIds.length ? `same problem (${m.sharedProblemIds.map((x) => core.problemById.get(x)?.title ?? x).join(", ")})` : "",
                        m.sharedTerms.length ? `shared words “${m.sharedTerms.slice(0, 3).join("”, “")}”` : "",
                        m.sharedTechnologyIds.length ? m.sharedTechnologyIds.map((x) => core.label("technologies", x)).join(", ") : "",
                      ].filter(Boolean).join("; ")}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="next-step">
                <h2>What to do next</h2>
                <p>Open the closest projects. For each, write one sentence on what your project would do differently: a new place, a cheaper design, better accuracy, or a different technology. Take that list to your supervisor.</p>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
