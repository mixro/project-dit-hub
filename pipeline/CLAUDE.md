# pipeline/: document → public dataset

Run: `python3 pipeline/src/build.py` from the repo root (requires `python-docx`). Stages: extract → interpret → enrich (spelling, glued words, tags) → similarity → publish → privacy gate → copy to `app/public/data/`.

## Where things live

- `config/sources.json`: one entry per document: year, programme, department, level, event, column names (`"#0"` means a column by position; a list means alternative header names), default decision, notes, institutions, publishing flags. `format: "numbered-paragraphs"` reads "1. Title" paragraphs instead of a table. Institution is `dit` only when the header names DIT, else `unconfirmed`. `year` may be null (not stated or a range kept in `academicYear`).
- `publishing.publishUnidentifiedProgramme` in `sources.json` (false): projects whose programme cannot be estimated are not published; add signals or an override to bring one back.
- `config/excluded_projects.json`: project IDs kept out of public output because the title is not a project (name only, too vague, not engineering, placeholder). Add entries by hand with a reason; the build reports stale IDs.
- `config/programmes.json`: the six DIT programmes (ID, code, label, department, aliases) and award levels.
- `config/shared/`: rules every programme uses. `problems.json` (real-world problems: general description, never about a specific student's project, plus regex rules `any`, `requires`, `excludes`), `categories.json` (areas), `technologies.json` (`programmeIds` empty = all), `places.json`, `workTypes.json`, `corrections.json` (spelling fixes, acronym display, `keepWords`: compound words the glue-splitter must not split).
- `config/programmes/<programmeId>/`: one programme's rules. `domains.json` (fields), `problems.json` (programme-specific problems), `corrections.json` (`stopwords` for similarity).
- A project is classified with shared rules plus its own programme's rules only; its programme's problems are listed first. Problem, domain and technology IDs must be unique across files (the build checks).
- `src/config.py` loads and validates all of this → `extract.py` → `interpret.py` (remarks → decisions, two-title rows, alternative titles, duplicates) → `enrich.py` → `similarity.py` → `build.py` (publishing, manifest, report) → `privacy.py`.
- `src/compare_outputs.py OLD NEW`: lists every difference between two public datasets. Run it before and after any refactor.

## Rules

- Regex in config must also work in JavaScript (the browser reuses it): no look-behind, no named groups, no inline flags.
- Never print student names or registration numbers in output, logs or reports. Refer to rows by `sourceId` and `serial` only.
- Keep IDs stable: they are content hashes of source + original title. Don't change `stable_id()`; URLs depend on it.
- After any config change: rebuild, confirm `privacy check: passed`, read `reports/quality-report.json` (unclassified count, new issues), and spot-check ~20 random titles for tagging accuracy.
- A new spelling or split rule must not change correct words. Check the "split-glued-word" corrections listed in the report.

## Processing a new document

The user places `.docx` files in `raw/`; you process them yourself (full procedure: `docs/design/MULTI_PROGRAMME_DESIGN.md` section 9).

1. Get a summary first (`inspect_doc.py` once it exists; not built yet), then read the document only as far as needed.
2. Ask the user for anything the document does not state: programme (EE, ME, ETE, CE, COE, SLT), level, academic year, list type. Never infer programme from titles.
3. Add the `sources.json` entry; extend that programme's rule files.
4. Build. It must print `privacy check: passed`.
5. Review `reports/quality-report.json`: unclassified ≤ 5% for that programme, glued-word splits correct, ~20 random titles spot-checked.
6. Report counts (projects, decisions, unclassified), sample tags and rules added. No student names.
