# Decision log

Newest first. One entry per decision or approved amendment. Claude: add an entry whenever the user approves a change in direction, then update `ROADMAP.md`.

Template:
```
## YYYY-MM-DD: Short title
**Context:** what prompted it.
**Decision:** what we chose.
**Alternatives:** what we rejected and why.
**Consequences:** files affected, follow-ups.
```

---

## 2026-10-10: Projects without an identified programme are not published
**Context:** the user asked to remove all 130 projects listed under "Programme not identified".
**Decision:** new flag `publishing.publishUnidentifiedProgramme: false` in `sources.json`. Projects from `programmeId: "infer"` sources whose programme could not be estimated from the title (no fallback) are left out of every public file; the "Programme not identified" filter option disappears. Removed: UDSM 73, "Project Titles 2019–2023" 57. The build prints the count per source.
**Alternatives:** list the 130 IDs in `excluded_projects.json` (rejected: future lists would need the same manual step).
**Consequences:** 2,063 projects published. Better programme signals (`config/programmes/*/signals.json`) or `programme_overrides.json` bring a project back.

## 2026-10-10: Remove titles that are not project titles
**Context:** after publishing UDSM, the user asked to remove titles that do not read as an engineering project (e.g. "Afya Yangu"); most were in "Programme not identified".
**Decision:** a reviewed list, `pipeline/config/excluded_projects.json` (project ID, title, reason), keeps 44 titles out of every public file, similarity list and search: 26 app names with no description, 9 too vague, 6 health or social campaign topics, 3 placeholders or duplicates ("W", "Test Project", a "Title: …" repeat). All are from the UDSM list. Titles that name a device or system stay, even if short. The build reports the count and any IDs that no longer match.
**Alternatives:** an automatic rule (word count, non-English words) (rejected: would also drop real short titles such as "Rain Alarm" and "Dual Axis Solar Tracker").
**Consequences:** 2,193 projects published. The excluded titles still teach the word-splitter vocabulary (exclusion is by project ID, which exists only after that step); no visible effect.

## 2026-10-10: All institutions published; DIT only when the header names DIT; nine new lists
**Context:** the user added nine `.docx` files to `raw/` and asked to include every list, even from other institutions such as UDSM, showing anything not confirmed as DIT as "Unconfirmed".
**Decision:**
- Public institution has two values only: `dit` when the document header names DIT, otherwise `unconfirmed` (the build rejects any other value). A named other institution goes in the source notes. This replaces the 2026-10-09 rule that a stated other institution (UDSM) is recorded as itself.
- UDSM list published (`unconfirmed`). New sources: EE BENG18 approved 2020/21, ETE BENG22 assessment 2025/26 (scores never extracted; two rows per group project merged), EE titles 2023/24 (numbered paragraphs, new `format: "numbered-paragraphs"`), EE OD23 (year not stated), 2014/15 and 2016/17 lists (programme estimated, EE fallback; MUST evidence in notes), "Project Titles" (nothing stated) and "Project Titles 2019–2023" (range, no single year). Only the new ETE 2024/25 Word file names DIT; it duplicates the published ETE 2024/25 list (67/67 titles), so it is processed but `publish: false`.
- Projects may have no single year: schema 3, `year` and `academicYear` nullable; undated projects sort last, are not year-filter options and are left out of year trends.
- "Unconfirmed" badge (text, dashed warn border) on project rows, idea-check matches, similar projects and the project page. Event labels come from `taxonomy.json` instead of a copy in `ProjectDetail.tsx`. New events: mini presentation, project assessment.
- Extraction skips header rows repeated inside one table. 31 correct compound words or product names added to `keepWords` (e.g. barcode, gateway, microgrid, travelled). Problem rules extended and a shared `food-quality` problem added.
**Alternatives:** keep UDSM unpublished until an institution switcher exists (rejected by the user); record each institution separately (rejected: user wants one "Unconfirmed" label); publish both ETE 2024/25 files (rejected: every project twice).
**Consequences:** 2,237 projects (was 1,007); existing project IDs unchanged. Unclassified: EE 4%, ETE 17%, COE 64%, unassigned 55%. First load ~203 KB gzipped (was ~148 KB; budget ~120 KB): the project index is now 104 KB. "Project Titles 2019–2023" looks like a themed idea list rather than a record of past projects; needs the user's confirmation.

## 2026-10-09: Theme switch (dark default, light mode) and collapsible problem areas
**Context:** the user asked to keep the existing dark look, add a light mode with a switch beside the menu icon, and make the problem categories collapsible.
**Decision:** dark is the default for every visitor; a sun/moon button in the top bar switches to light, remembered on the device (`hub.theme.v1`) and applied before first paint by an inline script in `index.html`, so there is no flash. The light palette keeps the documented brand colours (paper #FBFBF9, ink #172130, green #0B6E4F) and adds soft card shadows and a faint green glow behind the home hero. The Problems page groups areas into collapsible sections: the largest open by default, "Expand all / Collapse all", and every matching area open while filtering. New analytics event `theme_changed`.
**Alternatives:** follow the device's light/dark setting (the previous behaviour; replaced because the user wants dark as the default look).
**Consequences:** `index.html`, `styles.css`, `lib/theme.ts`, `Layout.tsx`, `Problems.tsx`, `analytics.ts`, `app/CLAUDE.md`. Main JS +0.5 KB, CSS +0.4 KB gzipped.

## 2026-10-09: Multiple programmes, phase 1 (data foundation, programme inference, institution rules)
**Context:** `docs/design/MULTI_PROGRAMME_DESIGN.md` phase 1, plus sections 0 and 10 and `docs/CONVERSION_NOTES.md`. Four new lists arrived (ETE, COE, ICT, UDSM).
**Decision:**
- Config split into `pipeline/config/shared/` and `programmes/<id>/`, with a programme catalogue in `programmes.json`. A project is tagged with shared rules plus its own programme's rules; its programme's problems are listed first. Verified with only EE data: identical IDs, tags, decisions and similar projects (`compare_outputs.py`); 5 projects show a different first problem.
- The four original sources are EE, level `beng` (user, 2026-10-09). One programme per project (no joint-programme projects). Data schema 2: `levelId`, `programmeProvenance`, `programmeConfidence`, similar projects split into same / other programmes (shown as one list until phase 4).
- Programme inference from titles for sources with `programmeId: "infer"`: weighted signals per programme, `high`/`low` confidence, the source's fallback wins ties and covers titles with no signal, user corrections in `programme_overrides.json`. Calibration on 930 known titles: 81% overall (EE 88%, COE 75%, ETE 13%), below the design's 90% target. ETE titles read like EE titles; that is a limit of title-only inference, not a missing word list.
- Institution as stated or `unconfirmed`. ETE = DIT; COE and ICT = unconfirmed; UDSM = `udsm`, processed but `publish: false`, so it is in no public file, similarity list or search vocabulary.
- Not stated stays unknown: ICT and UDSM level `null`; UDSM year `null`; COE year 2024/25 marked `yearProvenance: "inferred"`; ICT event "Title list" (header does not say title defence).
- Group projects: identical titles from different students in one source merge only when the source sets `mergeGroupTitles` (COE: 3 merges).
- Published on the site with labels: programme code badge on rows, idea-check results and similar projects; "Programme" and "Level" on the project page with "(estimated from the title)"; Programme filter (`?prog=`).
- Build fixes found on the way: the optional system spelling dictionary made output machine-dependent (removed; CHANGEOVER, PREPAYMENT, CARWASH, LOCKOUT added to `keepWords`); words with an explicit spelling fix are never split automatically; the privacy gate now also scans `reports/`.
**Alternatives:** keep new lists unpublished until the scope UX (rejected: user chose to publish with labels); publish UDSM hidden in the UI (rejected: it would shift DIT similarity scores and leak into data files); merge group titles in every list (rejected: could change EE data).
**Consequences:** first-load data +14 KB gzipped (project index 54 KB). ETE/COE/ICT are mostly unclassified (ETE 40%, COE 75%, ICT 78%) until their rules are written (phase 2). 24 ICT estimates are low-confidence and listed in the quality report for review.

## 2026-10-09: Document workflow adopted from the multi-programme design (section 9)
**Context:** `docs/design/MULTI_PROGRAMME_DESIGN.md` section 9 sets the wording for how Claude Code processes documents.
**Decision:** root `CLAUDE.md` rule 1 now uses the design's wording, plus "never modify source documents" and the pre-commit `git status` check. `pipeline/CLAUDE.md` gains the per-document procedure. `.claude/settings.json` already matched (Read denies removed 2026-10-08; Edit and Write denies on `raw/` and `private/` kept). `.gitignore` already ignores `raw/` and `private/`.
**Consequences:** `inspect_doc.py` and `docs/ADDING_DOCUMENTS.md`, both referenced by the design, do not exist yet; the procedure says so. Supersedes the 2026-10-08 rule wording below.

## 2026-10-08: Claude may read source documents; names still never published
**Context:** the user wants to hand new title lists (Word and PDF) to Claude to process. The goal of the privacy rule was always to keep names off the website, not to keep Claude from seeing the documents.
**Decision:** Claude may open and read source documents in `raw/`, `private/` or `HUB_RAW_DIR`. Unchanged: allow-list publishing, the privacy gate, and no names or registration numbers in `output/`, `app/`, config, reports, logs, tests or commits. Added: in chat, rows are referred to by `sourceId` + serial; source documents stay read-only (`.claude/settings.json` now denies Edit/Write there instead of Read).
**Alternatives:** keep Claude blind to the documents and have the user describe column layouts (rejected: slow, and the user asked for the change).
**Consequences:** `CLAUDE.md` rule 1, `.claude/settings.json`. Supersedes the read-deny part of "Personal documents may live outside the repo" (2026-10-07); keeping documents outside the repo is still allowed. Document contents are sent to Anthropic as part of the conversation when Claude reads them. PDF input still needs pipeline support (not built).

## 2026-10-08: Home page cards, centred layout and slide-out menu
**Context:** the user asked for a cleaner, more professional home page.
**Decision:** problems on the home page are now an equal-size card grid sorted by project count (most first), each showing "N projects"; this replaces the size-by-count index from the 2026-10-07 UX entry. On ≥900 px the hero, search and idea box are centred. A menu icon in the top-right opens a slide-out menu from the right listing every page (adds Home, Compare, About); the bottom tab bar on phones and top links on desktop stay. New analytics event `menu_opened`.
**Alternatives:** alphabetical cards (loses the "where effort went" signal); the menu replacing the top links or all navigation (rejected: bigger untested change before student testing).
**Consequences:** `Home.tsx`, `Layout.tsx`, `analytics.ts`, `styles.css`. Main JS +0.5 KB gzipped, CSS +0.3 KB. Phase 2 sessions should note whether students use the menu or the tab bar (`menu_opened` vs `page_viewed`).

## 2026-10-07: Personal documents may live outside the repo
**Decision:** `HUB_RAW_DIR` / `HUB_PRIVATE_DIR` env vars let the pipeline read Word files from outside the project; `.claude/settings.json` also denies reading `raw/`, `private/` and `*.docx`.
**Why:** deny rules guard Claude Code's file tools, but keeping files outside the repo is the strongest protection.

## 2026-10-07: Idea checker reuses pipeline rules and scoring
**Decision:** `search.json` ships the problem/technology/domain regex rules; the browser tags a typed idea exactly as the pipeline tags titles; same weights (text 0.55, problems 0.25, technologies 0.12, domains 0.08) and bands (0.55 / 0.32 / 0.18).
**Alternatives:** text-only TF-IDF. Rejected because it ranked "solar security system" above soil-moisture irrigation projects for an irrigation idea.

## 2026-10-07: Frontend with no UI, chart or router libraries
**Decision:** a custom 60-line router, CSS-only bars, system fonts, a single stylesheet.
**Why:** students on mobile data; first load ~110 KB gzipped. React Router can be added if nested routes are ever needed.

## 2026-10-07: UX patterns
Problem-first home ("What problem do you want to solve?") with a problem index sized by project count. Bottom tab bar on phones. Filters in a bottom sheet with live counts; each group's counts ignore its own filter so multi-select works. Filter changes replace history. Decision = icon + text. Similarity shown as bands with a "Why" line. Compare stacked A/B/C on phones.

## 2026-10-06: Older lists treated as institution "unconfirmed"
**Context:** the 2017/18, 2018/19 and 2019/20 documents never mention DIT; they reference MUST and Mbeya-area sites.
**Decision:** keep them, labelled `unconfirmed`, with notes; awaiting the user's confirmation.

## 2026-10-06: Alternative titles and glued words
Multi-line cells are split only when a line starts like a new title; alternatives become linked projects. Glued words are repaired using corpus vocabulary plus a `keepWords` list (after MICROPROCESSOR was wrongly split).

## 2026-10-05: Data processing principles
- Two-title rows in the 2026 document: the remark plus title similarity decides "same project reworded" vs "second proposal".
- Decisions carry provenance (`recorded` / `inferred`). Tags are `derived-from-title`.
- Problem descriptions describe the general problem only; **no generated solution summaries**.
- Privacy: allow-list publishing plus a privacy gate that fails the build. Students are linked across rows by a salted key that is never published.
- Stable content-hash IDs. Manifest-versioned, sharded JSON loaded lazily.
