# pipeline/: document → public dataset

Run: `python3 pipeline/src/build.py` from the repo root (requires `python-docx`). Stages: extract → interpret → enrich (spelling, glued words, tags) → similarity → publish → privacy gate → copy to `app/public/data/`.

## Where things live

- `config/sources.json`: one entry per document: year, programme, event, column names (`"#0"` means a column by position; a list means alternative header names), default decision, notes, publishing flags.
- `config/problems.json`: the 49 real-world problems: general description (never about a specific student's project) plus regex rules (`any`, `requires`, `excludes`).
- `config/taxonomy.json`: categories, engineering domains, technologies, places, work types (regex patterns).
- `config/corrections.json`: spelling fixes, acronym display, `keepWords` (compound words the glue-splitter must not split).
- `src/extract.py` → `interpret.py` (remarks → decisions, two-title rows, alternative titles, duplicates) → `enrich.py` → `similarity.py` → `build.py` (publishing, manifest, report) → `privacy.py`.

## Rules

- Regex in config must also work in JavaScript (the browser reuses it): no look-behind, no named groups, no inline flags.
- Never print student names or registration numbers in output, logs or reports. Refer to rows by `sourceId` and `serial` only.
- Keep IDs stable: they are content hashes of source + original title. Don't change `stable_id()`; URLs depend on it.
- After any config change: rebuild, confirm `privacy check: passed`, read `reports/quality-report.json` (unclassified count, new issues), and spot-check ~20 random titles for tagging accuracy.
- A new spelling or split rule must not change correct words. Check the "split-glued-word" corrections listed in the report.
