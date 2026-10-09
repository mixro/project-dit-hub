# Converted source documents (2026-10-09)

Four source files (2 PDF, 2 Excel) were converted to Word tables the pipeline can read. Put the `.docx` files in `raw/` (git-ignored). Do not commit them.

| File | Rows | Institution | Programme | Year | Decisions |
|---|---|---|---|---|---|
| `ETE_2024-2025_title_defense_DIT.docx` | 67 | **DIT** (stated) | ETE (stated) | 2024/2025 (stated) | 49 explicit, 18 none |
| `COE_BEng21_project_list.docx` | 114 | Probably DIT (not stated) | COE (from file name) | Not stated; cohort BEng21 suggests 2024/2025 | none |
| `ICT_2024-2025_title_list_UNCONFIRMED.docx` | 77 | **Not stated** | "ICT" is not one of the six DIT codes | 2024/2025 (stated) | 75 explicit, 2 pending |
| `UDSM_FYP_portal_titles_NOT_DIT.docx` | 477 | **UDSM**, not DIT | Not stated | Not stated | none |

## Processing rules (updated 2026-10-09 by the user)

- **Institution:** not stated → `"unconfirmed"`; stated → record it. So: ETE = `dit`; COE = `unconfirmed`; ICT = `unconfirmed`; UDSM = `udsm` (the file states it).
- **Programme:** not stated → infer per project from the title (`docs/design/MULTI_PROGRAMME.md` section 10). So: ETE = ETE (stated); COE = COE (from the file name, `from-source-name`); ICT = `"infer"` with `fallbackProgrammeId: "computer-engineering"`; UDSM = `"infer"`, no fallback.
- **Year:** COE: use 2024/2025 from the BEng21 cohort, with a note that it's inferred. UDSM: unknown. Set `academicYear: null`, `year: null`; the build and UI must accept a missing year (shown as "Year not recorded", excluded from year filters and timelines).
- **UDSM** needs the institution scope (design doc, section 1) before it goes live, or its 477 titles will dominate DIT students' results. Process it into the data, but keep it hidden from default views until the institution switcher exists (e.g. `"publish": false` on the source until then).

## How the conversion was done

- Tables were extracted from the PDFs; rows split across page breaks were rejoined. Titles, names and comments are verbatim (no spelling correction; the pipeline does that and records it).
- **REMARKS** is a normalised decision in the pipeline's existing vocabulary: `Accepted`, `Accepted with condition`, `Rejected`, `Pending`, or blank.
  - ETE: taken from the comment text only when it explicitly says rejected/accepted. "Accepted but with those condition…" → `Accepted with condition`. 18 comments contain only feedback ("Title should be rephrased…") and no decision → blank → decision not recorded. Do not guess these.
  - ICT: from the ACCEPTED/REJECTED column. "Accepted (with major collection)" (i.e. major corrections) → `Accepted with condition`. Original wording kept in **DECISION AS WRITTEN**.
- **COMMENTS** (committee feedback, verbatim) and **SUPERVISOR** (staff names) are kept for private reference only.
- **Phone numbers** in the ICT PDF were removed and are not in any file.
- UDSM's Description column was "-" in all 477 rows and was dropped.

## Pipeline changes needed

1. **Never publish COMMENTS, SUPERVISOR or DECISION AS WRITTEN.** They contain staff names and free-text feedback. Do not map them in `sources.json` `columns`; the extractor ignores unmapped columns. If committee feedback is ever wanted on the site, that needs a recorded decision and a privacy review first.
2. **Group projects:** in the COE list, 2 titles are each submitted by 2 students (group projects). Within one source, identical titles from different students should become one project, not two. `_merge_duplicates()` currently merges only the same student; extend it for title-list sources and report merges in the quality report.
3. Layouts: ETE and ICT → `title-defense-v1` (no NEW TITLE column; that's fine). COE and UDSM → `title-list-v1`.

## Draft `sources.json` entries

```json
{
  "id": "ete-2025-title-defense",
  "file": "ETE_2024-2025_title_defense_DIT.docx",
  "layout": "title-defense-v1",
  "institutionId": "dit",
  "programmeId": "electronics-telecommunication-engineering",
  "levelId": "beng",
  "cohort": null,
  "academicYear": "2024/2025",
  "year": 2025,
  "event": "title-defense",
  "eventDate": null,
  "columns": { "serial": "S.NO", "regNo": "REG NO", "name": "NAME", "title": "TITLE", "remarks": "REMARKS" },
  "notes": "Converted from a DIT ETE PDF. Decisions normalised from committee comments; 18 rows have feedback but no explicit decision."
},
{
  "id": "coe-beng21-title-list",
  "file": "COE_BEng21_project_list.docx",
  "layout": "title-list-v1",
  "institutionId": "unconfirmed",
  "programmeId": "computer-engineering",
  "levelId": "beng",
  "cohort": "BEng21 COE",
  "academicYear": "2024/2025",
  "year": 2025,
  "event": "title-list",
  "eventDate": null,
  "defaultDecision": { "value": "unknown", "provenance": "inferred", "reason": "Form submissions; no decisions recorded." },
  "columns": { "serial": "S.NO", "regNo": "REG NO", "name": "NAME", "title": "TITLE" },
  "notes": "Converted from Google Form responses. Institution not stated. Year inferred from cohort BEng21 (BEng22 EE defended 2025/2026)."
}
```
ICT and UDSM: follow the processing rules above.

## Note for the product

ICT committee comments on rejected titles include "The project done", "The system exist" (twice) and "Find the gap from the existing system". That is the exact problem this platform solves. Worth quoting (anonymously) when presenting the project.
