# Roadmap

Status key: ✅ done · 🔜 next · 💭 later · ❓ waiting on a decision

## Phase 1: Prototype ✅
- ✅ Data pipeline for 4 documents (2017/18, 2018/19, 2019/20, 2025/26): 752 projects, 49 problems, privacy gate, quality report
- ✅ Frontend: home, project search and filters, project detail with similar projects, problems and problem timelines, idea checker, compare (max 3), insights, about page
- ✅ Performance: ~59 KB JS + 4.5 KB CSS + ~49 KB data (gzipped) on first load
- ✅ Tests: 15 data-layer tests; 14 browser checks (run manually, scripts not yet in repo)
- ✅ Home refresh (2026-10-08): centred desktop layout, problem card grid sorted by project count, slide-out menu
- ✅ Theme switch (2026-10-09): dark default, light mode, collapsible problem areas
- ❓ Performance re-measured 2026-10-08: main JS is ~80 KB gzipped (not ~59 KB), so first load is likely above the ~120 KB budget; needs a look before deployment. Multi-programme data added ~14 KB more (2026-10-09). After the 2026-10-10 lists: ~203 KB first load (project index 104 KB); index trimming or sharded loading needed

## Multiple programmes (design: `docs/design/MULTI_PROGRAMME_DESIGN.md`)
- ✅ Phase 1 (2026-10-09): config split into shared + per-programme rules, programme catalogue, schema 2, programme inference from titles, institution rules. 1,007 projects published: EE 760, COE 180, ETE 67 (ETE, COE, ICT lists added); UDSM (463) processed, not published
- ❓ Review 24 low-confidence ICT programme estimates (`reports/quality-report.json` → `programmeInference.toReview`); corrections go in `pipeline/config/programme_overrides.json`
- ❓ Two COE titles may be one group project each with a typo or extra words ("E-Residence Verification", "Timetable Generator"); not merged automatically
- 🔜 Phase 2: write ETE and COE rules (problems, fields) with the user; unclassified today: ETE 40%, COE 75%, ICT 78%
- 💭 Improve programme inference (81% on known titles, target 90%); ETE vs EE is the hard part
- 💭 Phase 3 scope UX (programme chooser, header pill), phase 4 split results, phase 5 sharded loading
- ✅ All institutions published (2026-10-10): DIT only when the header names DIT, everything else "Unconfirmed" (badge). 9 new lists; 2,237 projects; UDSM published; schema 3 (projects without a single year)
- ✅ 44 non-project titles (app names, vague or campaign topics, placeholders) excluded via `pipeline/config/excluded_projects.json`; 2,193 projects (2026-10-10)
- ✅ Projects with no identified programme left out (`publishUnidentifiedProgramme: false`): 130 removed, 2,063 published (2026-10-10)
- ❓ Confirm "Project Titles 2019–2023" (300 titles) is a record of real past projects, not a themed idea list
- 🔜 Rules for software titles: COE 64% and unassigned 55% unclassified (UDSM, ICT, COE lists)

## Phase 2: Student testing 🔜
- 🔜 Deploy to Netlify (base directory `app`) at https://instiwise-project-hub.netlify.app. The address lives in `app/.env.production`, `public/robots.txt` and `public/sitemap.xml`; update all three if the domain changes
- 🔜 Student testing kit: task scripts, observation sheet, session-log analysis script
- 🔜 Run 5–8 sessions; record findings in `docs/DECISIONS.md`
- 💭 Commit the Playwright browser checks as `app/tests/e2e`

## Phase 3: UX refinement 💭
Driven by Phase 2 findings. Candidates to validate, not to build blindly:
- Which filters students actually use (remove the rest)
- Whether the problem cards or search is the main entry point
- Whether students use the slide-out menu or the tab bar / top links
- How many students switch to light mode (`theme_changed`); whether dark should stay the default
- Synonyms from real search logs (including Swahili terms)

## Phase 4: Historical data 💭
- ❓ Get DIT title lists for 2019–2025 (most valuable data)
- ✅ The 4 original EE `.docx` files are back in `raw/` (2026-10-09); the pipeline rebuilds again
- 💭 PDF input for the pipeline (new lists may arrive as PDF; needs a recorded decision on the extraction library)
- ❓ Confirm the origin of the 2017–2020 lists (likely MUST)
- 💭 Collect short solution summaries from supervisors or students (the only honest way to fill `solutionSummary`)

## Phase 5: Backend 💭
Node.js (Express or NestJS) + PostgreSQL. Replace the bodies of `projectService.ts` with API calls; pages stay unchanged. Admin import flow: upload → validate → standardise → classify → approve → publish.

## Phase 6: Intelligence 💭
Semantic search, AI similarity explanations, discovery assistant. Only after the dataset is cleaned and validated.

## Open questions ❓
- Institution of the 2017–2020 lists
- Meaning of "(YYYY/YYYY)" labels in the 2020 list
- Whether rejected titles may be public
- Year and institution of the OD23EE, "Project Titles" and 2023/24 electrical lists (not stated)
