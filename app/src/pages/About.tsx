import { useState } from "react";
import { useCore, useDocumentTitle } from "../lib/core";
import { clearEvents, eventCount, exportEvents } from "../lib/analytics";

export default function About() {
  useDocumentTitle("About this data");
  const core = useCore();
  const [events, setEvents] = useState(eventCount());

  const download = () => {
    const blob = new Blob([exportEvents()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hub-session-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="about-page prose">
      <h1>About this data</h1>
      <p>This is a testing version built to learn how students search for project ideas. It is not an official record and it does not approve or reject projects.</p>

      <h2>Sources</h2>
      <ul className="sources">
        {core.sources.map((s) => (
          <li key={s.id}>
            <strong>{s.academicYear ?? "Year not recorded"}</strong>: {s.documentName}, {s.projectCount} projects.
            {s.institutionId === "unconfirmed" && <span className="flag"> Institution not confirmed: the header does not name DIT.</span>}
            <span className="muted small"> {s.notes}</span>
          </li>
        ))}
      </ul>

      <h2>What is recorded and what is derived</h2>
      <p>Titles and decisions come from the documents. Spelling was corrected, and the original wording is kept on each project page. Problems, technologies and fields were matched from the title by rules, so they can be incomplete. Problem descriptions explain the general problem; they never describe what a student built.</p>

      <h2>Privacy</h2>
      <p>Student names and registration numbers are never published. They stay in the private source files, and the build stops if any appear in the website data.</p>

      <h2>Similarity scores</h2>
      <p>“Closely related” means the titles share important words and tags. It is not an originality or plagiarism check. A related project can still leave room for a new contribution.</p>

      {/* <h2>For test sessions</h2>
      <p>This device has recorded {events} usage events (searches, filters and pages opened). They never leave the device unless you download them.</p>
      <div className="row-actions">
        <button className="btn-outline" onClick={download} disabled={!events}>Download session log</button>
        <button className="btn-text" onClick={() => { clearEvents(); setEvents(0); }} disabled={!events}>Clear log</button>
      </div>
      <p className="muted small">Data version {core.manifest.datasetVersion}, built {new Date(core.manifest.generatedAt).toLocaleDateString()}.</p> */}
    </div>
  );
}
