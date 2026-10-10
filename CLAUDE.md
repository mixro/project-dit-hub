# DIT Project Hub

A web platform that helps final-year engineering students at DIT (Dar es Salaam Institute of Technology) discover past projects, explore the real problems behind them, and check whether their own idea has already been done. Philosophy: help students understand problems, existing solutions and gaps, not copy titles.

**Current stage: Phase 1 done (frontend-only prototype). Next: Phase 2, testing with real students.**
Full original requirements: @docs/SPEC.md (read it when a request touches product scope).
Roadmap and what's next: @docs/ROADMAP.md
Decisions already made, and why: @docs/DECISIONS.md

## Repository map

- `pipeline/`: Python. Turns Word title lists into public JSON. Domain knowledge lives in `pipeline/config/` (shared rules in `shared/`, per-programme rules in `programmes/<id>/`), not in code. See `pipeline/CLAUDE.md`.
- `docs/design/MULTI_PROGRAMME_DESIGN.md`: how several programmes (EE, ME, ETE, CE, COE, SLT) and institutions are handled; implemented in phases.
- `app/`: React 19 + Vite + TypeScript website. See `app/CLAUDE.md` and `app/README.md`.
- `output/public/`: generated public dataset (also copied to `app/public/data/`). Never edit by hand; regenerate.
- `reports/quality-report.json`: data issues to review (unclassified titles, gaps, duplicates).
- `docs/`: spec, roadmap, decision log.
- `raw/`, `private/`: PERSONAL DATA. Git-ignored. Preferably kept outside the repo (see below).

## Commands

```bash
python3 pipeline/src/build.py          # rebuild data (needs: pip install python-docx)
cd app && npm install                  # first time
cd app && npm run dev                  # local site
cd app && npm run build                # type-check + production build (must pass)
cd app && npm run test:data            # data-layer tests (must pass)
```
Personal documents outside the repo: `HUB_RAW_DIR=~/hub-private/raw HUB_PRIVATE_DIR=~/hub-private/private python3 pipeline/src/build.py`

## Non-negotiable rules

1. **Privacy.** You may read files in `raw/` and `private/` to process them. Student names and registration numbers must never appear in anything tracked by git, in `output/`, `app/`, `reports/`, tests, logs, commit messages, or in your chat replies (refer to rows by source id and serial number). Public records are built from an allow-list of fields in `build.py`; the privacy gate (`pipeline/src/privacy.py`) fails the build on leaks. Never weaken or bypass it. If it fails, fix the cause. Never modify source documents. Before every commit, `git status` must show no `.docx` and nothing under `private/`.
2. **Never fabricate data.** No invented solution summaries, decisions, years or institutions. Unknown stays unknown. Derived information must carry a provenance label (`recorded`, `inferred`, `derived-from-title`).
3. **No originality claims.** The UI says "No highly similar project was found in the current dataset", never "your project is original". Similarity is labelled "Closely related / Related / Loosely related", never an originality or plagiarism score.
4. **One source of truth.** Classification rules live in `pipeline/config/`. The browser idea-checker uses the same rules (shipped in `search.json`) and the same scoring weights. Change rules in config, never duplicate them in app code.
5. **Backend-ready.** UI pages call only `app/src/data/projectService.ts` (async, returns `Result<T>`). Never fetch data directly in components.
6. **Performance budget.** First load ≤ ~120 KB gzipped (JS + CSS + data). No UI kits, chart libraries or web fonts without a recorded decision. New pages are lazy-loaded.

## How to work on this project

- **Before coding**, restate the change, list the files you'll touch, and flag any conflict with the rules above or with `docs/DECISIONS.md`.
- **Data problems** (wrong tag, typo, unclassified title): fix `pipeline/config/*.json`, rebuild, check `reports/quality-report.json`. Change Python only for structural problems.
- **New document layout**: add an entry to `pipeline/config/sources.json`; only add a layout branch in `interpret.py` if the columns truly differ.
- **Definition of done**: `python3 pipeline/src/build.py` prints `privacy check: passed`; `npm run build` and `npm run test:data` pass; UI changes checked at 390 px (phone) and 1280 px widths.
- **After any amendment** the user approves: add an entry to `docs/DECISIONS.md` and update `docs/ROADMAP.md`. Keep this file short; put detail in `docs/`.
- Write user-facing text in plain, sentence-case English for students. Errors say what to do next.

## Open questions (do not assume answers)

- Institution rule (user, 2026-10-10): `dit` only when the document header names DIT; every other list, including UDSM and the probable MUST lists, is `unconfirmed` and shows an "Unconfirmed" badge. Any named institution goes in the source notes.
- Whether "Project Titles 2019–2023" records real past projects (it reads like a themed idea list).
- Full name of SLT; level of the ICT and UDSM lists (not stated, kept null).
- Meaning of "(2014/2015)"-style labels in the 2020 list is unknown; they are preserved verbatim.
- Whether DIT allows rejected titles to be public (`publishRejectedTitles` in `sources.json`).
