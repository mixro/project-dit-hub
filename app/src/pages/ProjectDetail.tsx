import { useEffect } from "react";
import { projectService } from "../data/projectService";
import { useResource } from "../data/useResource";
import type { Project, SimilarProject, TitleVersion } from "../data/types";
import { DecisionBadge } from "../components/Decision";
import { ProgrammeBadge } from "../components/ProgrammeBadge";
import { ErrorPanel, PageSkeleton } from "../components/States";
import { useCore, useDocumentTitle } from "../lib/core";
import { Link } from "../lib/router";
import { compareStore, useCompare, MAX_COMPARE } from "../lib/compare";
import { track } from "../lib/analytics";

const ROLE: Record<TitleVersion["role"], string> = {
  proposed: "Proposed title",
  "approved-wording": "Approved wording",
  revised: "Revised title",
  "second-proposal": "Second proposal",
  presented: "Presented title",
  listed: "Listed title",
  "alternative-proposal": "Alternative title",
};
const BAND: Record<SimilarProject["band"], string> = {
  "closely-related": "Closely related",
  related: "Related",
  "loosely-related": "Loosely related",
};
const EVENT_LABEL: Record<string, string> = {
  "title-defense": "Title defence",
  "final-presentation": "Final presentation",
  "tentative-titles": "Tentative title list",
  "title-list": "Title list",
};

export default function ProjectDetail({ id }: { id: string }) {
  const { state, retry } = useResource(() => projectService.getProject(id), [id]);
  if (state.status === "loading") return <PageSkeleton rows={8} />;
  if (state.status === "error") return <ErrorPanel error={state.error} onRetry={retry} />;
  return <ProjectView project={state.data} />;
}

function ProjectView({ project: p }: { project: Project }) {
  const core = useCore();
  const compare = useCompare();
  useDocumentTitle(p.title);
  useEffect(() => { track("project_opened", { id: p.id }); }, [p.id]);

  const d = p.detail;
  const source = core.sourceById.get(p.sourceId);
  const unconfirmed = p.institutionId === "unconfirmed";
  const inCompare = compare.includes(p.id);
  const history = d.titleHistory;
  const corrected = history.some((v) => v.corrections.length > 0);
  // Shown as one list until the programme split UI arrives (multi-programme design, phase 4).
  const similar = [...d.similar.sameProgramme, ...d.similar.otherProgrammes];

  return (
    <article className="detail">
      <Link to="/projects" className="back">Back to projects</Link>
      <h1>{p.title}</h1>

      <dl className="facts">
        <div><dt>Programme</dt><dd>{core.programmeById.get(p.programmeId)?.label ?? "Not identified"}{p.programmeProvenance === "inferred-from-title" && <span className="muted small"> (estimated from the title)</span>}</dd></div>
        <div><dt>Level</dt><dd>{p.levelId ? core.label("levels", p.levelId) : <span className="muted">Not recorded</span>}</dd></div>
        <div><dt>Year</dt><dd>{p.academicYear}</dd></div>
        <div><dt>Decision</dt><dd><DecisionBadge decision={d.decision} inferred={d.decisionProvenance === "inferred"} /></dd></div>
        <div><dt>Listed in</dt><dd>{EVENT_LABEL[p.event] ?? p.event}{source?.cohort ? `, ${source.cohort}` : ""}</dd></div>
        <div>
          <dt>Institution</dt>
          <dd>{unconfirmed ? <>Not confirmed <Link to="/about" className="small">why?</Link></> : core.label("institutions", p.institutionId)}</dd>
        </div>
      </dl>

      <div className="detail-actions">
        <button
          className={inCompare ? "btn" : "btn-outline"}
          aria-pressed={inCompare}
          disabled={!inCompare && compare.length >= MAX_COMPARE}
          onClick={() => { compareStore.toggle(p.id); if (!inCompare) track("comparison_started", { id: p.id }); }}
        >
          {inCompare ? "Added to compare" : "Add to compare"}
        </button>
      </div>

      {p.problemIds.length > 0 && (
        <section>
          <h2>The problem behind it</h2>
          {p.problemIds.map((pid) => {
            const prob = core.problemById.get(pid);
            if (!prob) return null;
            return (
              <div key={pid} className="problem-note">
                <Link to={`/problems/${pid}`} className="problem-link">{prob.title}</Link>
                <p>{prob.description}</p>
                <p className="muted small">{prob.projectCount} projects tackle this problem.</p>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <h2>Similar projects</h2>
        {similar.length === 0 ? (
          <p className="muted">No similar project was found in the current dataset.</p>
        ) : (
          <ul className="similar">
            {similar.map((s) => {
              const o = core.byId.get(s.id);
              if (!o) return null;
              const shared = [
                ...s.reasons.sharedProblemIds.map((x) => core.problemById.get(x)?.title ?? x),
                ...s.reasons.sharedTechnologyIds.map((x) => core.label("technologies", x)),
              ];
              return (
                <li key={s.id}>
                  <span className={`band band-${s.band}`}>{BAND[s.band]}</span>
                  <Link to={`/projects/${s.id}`} onClick={() => track("similar_project_clicked", { from: p.id, to: s.id, band: s.band })}>{o.title}</Link>
                  <span className="similar-meta">
                    <ProgrammeBadge project={o} /> {o.year}, <DecisionBadge decision={o.decision} />
                  </span>
                  {(s.reasons.sharedTerms.length > 0 || shared.length > 0) && (
                    <span className="why">
                      Why: {[s.reasons.sharedTerms.length ? `shared words “${s.reasons.sharedTerms.slice(0, 3).join("”, “")}”` : "", shared.slice(0, 2).join(", ")].filter(Boolean).join("; ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">Similarity compares titles and tags. It shows related work, not whether a project is original.</p>
      </section>

      {d.relatedSubmissionIds.length > 0 && (
        <section>
          <h2>Other titles from the same student</h2>
          <ul className="plain">
            {d.relatedSubmissionIds.map((rid) => {
              const r = core.byId.get(rid);
              return r ? <li key={rid}><Link to={`/projects/${rid}`}>{r.title}</Link> <DecisionBadge decision={r.decision} /></li> : null;
            })}
          </ul>
        </section>
      )}

      <section className="tags-section">
        <h2>Technologies and fields</h2>
        <TagLinks label="Technologies" ids={p.technologyIds} kind="technologies" param="tech" />
        <TagLinks label="Engineering fields" ids={p.domainIds} kind="domains" param="field" />
        <TagLinks label="Areas" ids={p.categoryIds} kind="categories" param="area" />
      </section>

      {(history.length > 1 || corrected) && (
        <section>
          <h2>Title history</h2>
          <ol className="history">
            {history.map((v, i) => (
              <li key={i}>
                <span className="muted small">{ROLE[v.role]}</span>
                <span>{v.title}</span>
                {v.title.toLowerCase() !== v.asWritten.toLowerCase() && (
                  <details><summary>As written in the document</summary><span className="as-written">{v.asWritten}</span></details>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <aside className="provenance">
        <h2>Where this information comes from</h2>
        <p>The title and decision come from {source ? <em>{source.documentName}</em> : "the source document"}{d.decisionProvenance === "inferred" ? "; the decision is inferred, not stated" : ""}. The problem, technologies and fields were derived from the title and may be incomplete. No solution summary is available yet.</p>
      </aside>
    </article>
  );
}

function TagLinks({ label, ids, kind, param }: { label: string; ids: string[]; kind: "technologies" | "domains" | "categories"; param: string }) {
  const core = useCore();
  if (!ids.length) return null;
  return (
    <div className="taglinks">
      <span className="muted small">{label}</span>
      <div className="chips">
        {ids.map((id) => (
          <Link key={id} className="chip" to={`/projects?${param}=${id}`} onClick={() => kind === "technologies" && track("technology_selected", { id, from: "detail" })}>
            {core.label(kind, id)}
          </Link>
        ))}
      </div>
    </div>
  );
}
