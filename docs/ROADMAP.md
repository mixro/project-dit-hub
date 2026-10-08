# Roadmap

Status key: ✅ done · 🔜 next · 💭 later · ❓ waiting on a decision

## Phase 1: Prototype ✅
- ✅ Data pipeline for 4 documents (2017/18, 2018/19, 2019/20, 2025/26): 752 projects, 49 problems, privacy gate, quality report
- ✅ Frontend: home, project search and filters, project detail with similar projects, problems and problem timelines, idea checker, compare (max 3), insights, about page
- ✅ Performance: ~59 KB JS + 4.5 KB CSS + ~49 KB data (gzipped) on first load
- ✅ Tests: 15 data-layer tests; 14 browser checks (run manually, scripts not yet in repo)
- ✅ Home refresh (2026-10-08): centred desktop layout, problem card grid sorted by project count, slide-out menu
- ❓ Performance re-measured 2026-10-08: main JS is ~80 KB gzipped (not ~59 KB), so first load is likely above the ~120 KB budget; needs a look before deployment

## Phase 2: Student testing 🔜
- 🔜 Deploy to Netlify or Vercel (base directory `app`); set `SITE_URL` to the final domain so social previews show `og-image.png`
- 🔜 Student testing kit: task scripts, observation sheet, session-log analysis script
- 🔜 Run 5–8 sessions; record findings in `docs/DECISIONS.md`
- 💭 Commit the Playwright browser checks as `app/tests/e2e`

## Phase 3: UX refinement 💭
Driven by Phase 2 findings. Candidates to validate, not to build blindly:
- Which filters students actually use (remove the rest)
- Whether the problem cards or search is the main entry point
- Whether students use the slide-out menu or the tab bar / top links
- Synonyms from real search logs (including Swahili terms)

## Phase 4: Historical data 💭
- ❓ Get DIT title lists for 2019–2025 (most valuable data)
- ❓ The 4 source `.docx` files are not in `raw/` on this machine (2026-10-08), so the pipeline can't rebuild until they are restored
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
- Multi-institution support: needed now if the MUST lists stay?
