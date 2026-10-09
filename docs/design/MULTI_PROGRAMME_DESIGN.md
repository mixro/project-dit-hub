# Design: Multiple programmes (Electrical, Civil, Mechanical, …)

Status: approved direction; programme list confirmed 2026-10-09. Place at `docs/design/MULTI_PROGRAMME.md`. Implement in the phases at the end; get the user's approval per phase and record each in `docs/DECISIONS.md`.

## 0. Confirmed facts (2026-10-09)

- DIT programmes to support, with official DIT codes:

| Code | Programme | Department |
|---|---|---|
| EE | Electrical Engineering | Electrical |
| ME | Mechanical Engineering | Mechanical |
| ETE | Electronics and Telecommunication Engineering | Electronics and Telecommunication |
| CE | Civil Engineering | Civil |
| COE | Computer Engineering | Computer |
| SLT | Science and Laboratory Technology | Laboratory |

  Codes are confirmed. Confirm the full names of COE and SLT before they appear on the site.
- **All 752 existing projects are EE.** Set `programmeId: "electrical-engineering"` on all four existing sources. This settles the programme only; the institution of the 2017/18, 2018/19 and 2019/20 lists stays `unconfirmed` until the user says otherwise.
- **Workflow:** the user adds Word documents directly in the repo; Claude Code reads and processes them (see section 9). Raw data is never shown on the website.
- **Programme assignment (changed 2026-10-09):** when a document does not state its programme, assign each project to the best-fitting programme by analysing its title (section 10). Every assignment records how it was made, and inferred ones are labelled on the site. A programme stated by the document or the user always wins.
- **Institution (changed 2026-10-09):** when a document does not state its institution, process it anyway with `institutionId: "unconfirmed"`. Only a document that states DIT, or that the user confirms, gets `"dit"`. A document that states another institution (e.g. the UDSM portal export) records that institution, not "unconfirmed".

---

## 1. The core decision: programme is a *lens*, not a wall

**Do not split the site into separate per-course sections or sites.** Make the student's programme the default *scope* of everything they see, with one tap to widen to all programmes.

Why:

| Separate sections per course | Programme as a scope (chosen) |
|---|---|
| Simple to explain | Same simplicity: a student only sees their programme unless they ask for more |
| Hides cross-discipline work. A civil student designing flood channels never sees the electrical flood-alarm projects | Cross-discipline inspiration is one tap away, and shown deliberately |
| Problems duplicated per course | One shared problem catalogue; each problem shows how *each* programme tackled it |
| Every new course = new pages | New course = new config + data, no new pages |

What a student actually needs, in order:
1. "Has this been done **in my programme**?" (this is what the title committee judges)
2. "How have **others** approached this problem?" (inspiration, gaps)

The design answers 1 by default and makes 2 visible without mixing the two.

The same mechanism later handles **institutions** (DIT vs MUST lists): institution becomes an outer scope with the same switcher pattern. Design for one, reuse for both.

---

## 2. Concepts and vocabulary

| Concept | Meaning | Example | Who sets it |
|---|---|---|---|
| **Department** | Organisational unit | Civil Engineering Department | `sources.json` |
| **Programme** | What the student studies; the main scope | Civil Engineering | `sources.json`, a programme column, or inferred per title (section 10) |
| **Level** | Award level | Ordinary Diploma, Bachelor of Engineering | `sources.json` |
| **Area** (existing "category") | Real-world application area; shared across programmes | Water & Sanitation, Agriculture, Transport | rules, derived from title |
| **Field** (existing "domain") | Engineering sub-discipline; belongs to a programme | Structural, Geotechnical, Power Systems | rules, per programme |
| **Technology** | Tool/method; shared list, each tagged with programmes it's relevant to | GIS, CAD, PLC, Solar PV | rules |
| **Problem** | Real-world problem; shared catalogue | Flooding, water leakage | rules |

**Rule:** a programme stated by the source document, its file name/header, or the user is final; a civil-sounding title in an electrical list stays electrical. Only when no programme is stated is it inferred per project from the title (section 10), labelled as inferred. Level is never inferred from titles.

**Level matters:** if DIT diploma and degree lists are both added, students should by default see their own level too (a diploma project is not "already done" at degree level in the committee's eyes). Level is a second scope, defaulting to "All levels" until diploma data exists.

---

## 3. UX design

### 3.1 Choosing a programme (first visit)

On the home page, under the main question, a non-blocking row:

> **Your programme:** [Electrical] [Civil] [Mechanical] [Telecom] … [Just browsing]

- Tapping one sets the scope immediately; no modal, no sign-up.
- Remembered on the device (`localStorage`, key `hub.scope.v1`).
- "Just browsing" = all programmes.
- Only programmes with data are shown, with counts: "Civil · 214".
- After choosing, the row collapses into the header scope pill (below).

### 3.2 Scope pill (every page)

In the top bar, next to the logo: **`Electrical ▾`**. Tapping opens a small sheet:

```
Show projects from
 ● Electrical Engineering     412
 ○ Civil Engineering          214
 ○ Mechanical Engineering     188
 ○ All programmes             814
```

- The pill always shows the current scope, so the student never wonders why results are missing.
- Scope is also in the URL (`?prog=civil`) so shared links show what the sender saw. A shared link changes the view **without** overwriting the receiver's saved programme.
- On phones the pill sits in the top bar (bottom bar stays 4 tabs).

### 3.3 Search results: own programme first, others separated

Results page, scoped to Electrical:

```
"water pump"
38 projects in Electrical          [Filters] [Best match ▾]
  ...rows...

──────────────────────────────────────
Also in other programmes (14)              [Show]
  Mechanical 9 · Civil 5
```

- Other-programme results are **collapsed by default**, shown as a counted section, never interleaved. Interleaving would make students think a civil project "uses up" their electrical idea.
- Opening it lists rows with a programme badge (text code: `ME`, `CE`; never colour alone).
- In "All programmes" scope, every row shows its badge and the section split disappears.

### 3.4 Check my idea: the most important split

```
Your idea is compared with 814 projects.

In Electrical (what the title committee will compare with)
  Closely related   Smart Irrigation Pump Controller…   2026 ✕ Rejected
  Related           …

In other programmes (for ideas, not duplicates)
  Related   ME  Design of a Low-cost Solar Water Pump…   2019
```

- The own-programme group comes first and carries the "closely related" warning tone.
- Other programmes use neutral tone and the explicit label "for ideas, not duplicates".
- The summary sentence counts only the student's programme: "2 closely related projects in Electrical."

### 3.5 Problems: shared catalogue, per-programme view

- Problems list and home problem index show counts **for the current scope** and hide problems with zero projects in scope (toggle: "Show problems from other programmes").
- Problem page timeline gets a programme lane view when more than one programme has projects:

```
Flooding and drainage
               2018   2019   2020   2026
Civil           ●●     ●      ●●●    ●●
Electrical      ●             ●      ●●●
Mechanical                    ●
```
Each dot opens the project. This view is the platform's unique value for interdisciplinary thinking: "civil students built drainage, electrical students built alarms; nobody combined them."

- Below the lanes, the existing chronological list, with programme badges.

### 3.6 Filters

- **Field** and **Technology** filters show only values relevant to the current scope (no "Geotechnical" when scope is Electrical). In "All programmes", a **Programme** filter group appears first.
- **Area** (agriculture, water, transport…) stays shared, which is what makes cross-programme comparison meaningful.

### 3.7 Project page

- Facts row gains **Programme** and **Level**.
- Similar projects: two groups, "In Electrical" (up to 6) and "In other programmes" (up to 3).

### 3.8 Insights

- Default: current programme only.
- New card in "All programmes" scope: **"Same problem, different programmes"**, problems tackled by 2+ programmes, with counts per programme. Points students to interdisciplinary gaps.

### 3.9 Empty and edge states

- Programme with no lists yet: "No Civil title lists have been added yet. [Browse all programmes]". Not a blank list.
- Scope narrows search to zero but other programmes have matches: "No Electrical projects match. 6 matches in other programmes. [Show them]".
- Unconfirmed-institution sources stay labelled as today.

### 3.10 Accessibility and visual rules

- Programme badges: short text code in a neutral outlined chip (`EE`, `CE`, `ME`). No per-programme colour coding; colours run out and fail for colour-blind users.
- Codes defined once in config; full name in a `title`/aria-label.
- Scope pill and sheet keyboard and screen-reader accessible; scope change announced via `aria-live` ("Showing Civil Engineering projects").

---

## 4. Data model changes

### 4.1 `sources.json`

```json
{
  "id": "ce-2026-title-defense",
  "institutionId": "dit",
  "departmentId": "civil",
  "programmeId": "civil-engineering",
  "levelId": "beng",
  ...
}
```
Optional `"columns": { "programme": "PROGRAMME" }` for documents mixing programmes; values mapped through `programmeAliases` (below). Unknown values fail the build with a clear message, never silently become "unknown".

### 4.2 Programme catalogue: `pipeline/config/programmes.json` (new)

```json
{
  "levels": [
    { "id": "od", "label": "Ordinary Diploma" },
    { "id": "beng", "label": "Bachelor of Engineering" }
  ],
  "programmes": [
    { "id": "electrical-engineering", "code": "EE", "label": "Electrical Engineering", "departmentId": "electrical",
      "aliases": ["EE", "ELECTRICAL", "ELECTRICAL ENGINEERING", "BENG EE"] },
    { "id": "mechanical-engineering", "code": "ME", "label": "Mechanical Engineering", "departmentId": "mechanical",
      "aliases": ["ME", "MECHANICAL", "MECHANICAL ENGINEERING", "BENG ME"] },
    { "id": "electronics-telecommunication-engineering", "code": "ETE", "label": "Electronics and Telecommunication Engineering", "departmentId": "electronics-telecommunication",
      "aliases": ["ETE", "ELECTRONICS AND TELECOMMUNICATION", "ELECTRONICS & TELECOMMUNICATION", "BENG ETE"] },
    { "id": "civil-engineering", "code": "CE", "label": "Civil Engineering", "departmentId": "civil",
      "aliases": ["CE", "CIVIL", "CIVIL ENGINEERING", "BENG CE"] },
    { "id": "computer-engineering", "code": "COE", "label": "Computer Engineering", "departmentId": "computer",
      "aliases": ["COE", "COMPUTER", "COMPUTER ENGINEERING", "BENG COE"] },
    { "id": "science-laboratory-technology", "code": "SLT", "label": "Science and Laboratory Technology", "departmentId": "laboratory",
      "aliases": ["SLT", "LABORATORY", "SCIENCE AND LABORATORY TECHNOLOGY"] }
  ]
}
```
Programme IDs are permanent (they appear in URLs); labels can change. The `od` level is listed for the future; keep it unused until diploma lists are confirmed.

### 4.2a What each programme's rules must handle

| Code | Notes for its rule files |
|---|---|
| EE | Existing rules move here unchanged. |
| ME | Fields: thermofluids, manufacturing, machine design, automotive, HVAC/refrigeration, materials. Shares agriculture, water, energy problems. |
| ETE | Heavy overlap with EE (IoT, GSM, sensors). Fields: telecom networks, RF/antennas, embedded, signal processing. The "In your programme / other programmes" split matters most here. |
| CE | Fields: structural, geotechnical, highways/transport, water and hydraulics, materials, surveying, construction management. |
| COE | Titles are mostly software. Add stopwords such as *system, management, online, web-based, application, platform*, or similarity degrades. Technologies: web, mobile, databases, machine learning, networking, cybersecurity. |
| SLT | Not engineering: chemical, biological and food analysis. Needs its own problems (e.g. water contamination testing, food safety, quality control). Draft from real titles, not guesses. |

### 4.3 Rules split into shared + per-programme

```
pipeline/config/
  shared/problems.json        problems that cross programmes (water, flooding, waste, energy access…)
  shared/categories.json      areas (shared)
  shared/technologies.json    each technology has "programmeIds": [...] (empty = all)
  shared/corrections.json     spelling, acronyms, keepWords
  programmes/electrical-engineering/
      domains.json            power systems, power electronics, machines…
      problems.json           programme-specific problems (transformer failures, power quality…)
      corrections.json        programme acronyms (MCCB, SCADA…)
  programmes/civil-engineering/
      domains.json            structural, geotechnical, highway, hydraulics, materials, surveying…
      problems.json           e.g. pavement failure, soil stability, low-cost housing materials
      corrections.json
```

- A project is classified with **shared rules + its own programme's rules only.** This stops false matches across disciplines (a civil "load" or "transformation" must not trigger electrical rules).
- Problems keep a single ID namespace so a shared problem collects projects from every programme.
- Existing electrical rules move into `programmes/electrical-engineering/` and `shared/` with no behaviour change (verified by identical output, see Phase 1).
- Regex must stay JavaScript-compatible (existing rule).

### 4.4 Public records

`ProjectSummary` gains `levelId` (programmeId already exists). `ProjectDetail.similar` becomes:

```ts
similar: { sameProgramme: SimilarProject[]; otherProgrammes: SimilarProject[] }
```
`taxonomy.json` gains `programmes` (with `code`, `departmentId`), `levels`, and `domains[].programmeId`, `technologies[].programmeIds`.

This changes shapes → bump **SCHEMA_VERSION to 2** in `build.py` and `SUPPORTED_SCHEMA` in `dataClient.ts` together.

### 4.5 Similarity

- IDF computed over the whole corpus (shared vocabulary).
- Programme-specific stopwords added (e.g. civil titles all say "design of", "proposed", "case study of"). Kept in `programmes/<id>/corrections.json` → `stopwords`.
- For each project store top 6 same-programme and top 3 other-programme matches.
- Browser idea checker loads shared rules + rules for every programme (so it can tag against any), but groups results by the student's scope.

---

## 5. Performance: shard by programme

At ~5 programmes × several years × ~150 titles, the index passes 3,000 projects (~1.4 MB raw, ~170 KB gzipped), too much for first load on mobile data.

```
manifest.json
projects.index.<programmeId>.json       one per programme (~30–60 KB gz each)
projects.<sourceId>.json                details, unchanged (already per document)
problems.json, taxonomy.json, sources.json   shared, small
search.rules.shared.json + search.rules.<programmeId>.json
search.idf.json                         corpus-wide
```

Loading:
1. First load: manifest + shared files + **index for the saved programme only**.
2. "Also in other programmes" section, "All programmes" scope, problem lanes and idea check: load the remaining programme indexes (in parallel, cached; prefetched in idle time on good connections, as today).
3. First-time visitors with no saved programme see the home page immediately (no index needed to render it); the index loads when they pick a programme or search.

Budget stays: first screen ≤ ~120 KB gzipped (JS + CSS + data).

`projectService` API stays the shape pages already use; `ProjectQuery` gains `programmeIds` scope handling and results gain `otherProgrammes: { total, byProgramme: Facet[] }`. Pages still never fetch directly.

---

## 6. Analytics (for testing)

New events: `programme_selected` (from: home | pill), `scope_changed` (to), `other_programmes_opened` (where: results | idea | project), `cross_programme_project_opened`.

Questions these answer in Phase 2/3 testing:
- Do students pick a programme, or browse everything?
- Do they ever open other programmes? If almost never, simplify; if often, promote it.
- Does the split idea-check change what they do next?

---

## 7. Implementation phases

Each phase ends with: pipeline `privacy check: passed`, `npm run test:data` and `npm run build` pass, checks at 390 px and 1280 px, DECISIONS/ROADMAP updated.

**Phase 1: Data foundation (no visible UI change)**
- Add `programmes.json`, `levelId`, `departmentId`; split config into `shared/` + `programmes/electrical-engineering/`.
- Acceptance: with only electrical data, regenerated projects have identical IDs, tags and problems as before (write a diff check script comparing old and new `projects.index.json`).

**Phase 2: Add the first second programme**
- Needs a real Civil or Mechanical list from the user (`docs/ADDING_DOCUMENTS.md`), plus that programme's domains/problems written with the user.
- Acceptance: unclassified rate for the new programme ≤ 5%; ~20 spot-checked titles tagged correctly; no electrical rule fires on a civil title (add a test).

**Phase 3: Scope UX**
- Home programme chooser, header pill, URL `?prog=`, scoped filters/problems/insights, empty states.

**Phase 4: Split results**
- "Also in other programmes" section, split idea check, split similar projects, problem programme lanes, "Same problem, different programmes" insight.

**Phase 5: Sharded loading**
- Only when total projects > ~1,500 or first-load budget is exceeded.

---

## 8. Open questions for the user (do not assume)

1. ~~Exact list of programmes and codes~~: confirmed (section 0). Still confirm the full names of COE and SLT.
2. Will Ordinary Diploma lists be added alongside degree lists?
3. ~~Documents with several programmes~~: resolved; inferred per title (section 10).
4. Interdisciplinary student groups (e.g. EE + ME students on one project): do they exist? If yes, the model needs `programmeIds: string[]` instead of one programme. Decide before Phase 1.
5. ~~Institution of unstated lists~~: resolved; `unconfirmed` (section 0). Still open: build the institution switcher now, since a UDSM list (477 titles) has been received?

## 9. Workflow: Claude Code processes the documents

The user places new `.docx` files in `raw/` (git-ignored) and Claude Code processes them directly. Claude Code may read raw documents **only to process them**. Replaces the earlier "never open the .docx" rule and the `inspect_doc.py`-only flow.

**Required config changes (do these together, or Claude Code gets conflicting instructions):**

1. Root `CLAUDE.md`, rule 1 becomes:
   > **Privacy.** You may read files in `raw/` and `private/` to process them. Student names and registration numbers must never appear in anything tracked by git, in `output/`, `app/`, `reports/`, tests, logs, commit messages, or in your chat replies (refer to rows by source id and serial number). Public records are built from an allow-list of fields in `build.py`; the privacy gate fails the build on leaks. Never weaken or bypass it.
2. `.claude/settings.json`: remove the `Read(./raw/**)`, `Read(./private/**)` and `Read(**/*.docx)` deny rules. Keep the `Edit(./raw/**)` and `Edit(./private/**)` denies, so source documents are never modified.
3. `pipeline/CLAUDE.md` and `docs/ADDING_DOCUMENTS.md`: replace "ask the user to run `inspect_doc.py`" with "run `inspect_doc.py` yourself first for a summary, then read the document if needed". Keep the inspector; it gives a fast, name-free overview.
4. Keep `raw/` and `private/` in `.gitignore`. Before every commit, `git status` must show no `.docx` and nothing under `private/`.

**Per-document procedure for Claude Code:**

1. Run `inspect_doc.py` on the new file; read the document only as far as needed.
2. Ask the user for anything the document does not state: programme (one of the six codes), level, academic year, list type. If the programme is not stated, infer it per project (section 10) and report the distribution and low-confidence titles to the user.
3. Add the `sources.json` entry; extend that programme's rule files.
4. Build. Must print `privacy check: passed`.
5. Review `reports/quality-report.json`: unclassified ≤ 5% for that programme, glued-word splits correct, ~20 random titles spot-checked.
6. Report to the user: counts (projects, decisions, unclassified), sample tags, rules added. No student names.
7. `npm run test:data` and `npm run build` pass; update `docs/ROADMAP.md` and `docs/DECISIONS.md`; commit.

## 10. Inferring the programme from a title

Used only for sources whose programme is not stated (`"programmeId": "infer"` in `sources.json`). Mixed lists such as an "ICT" list or a multi-department portal export are handled per project, not per document.

### 10.1 How

1. Each programme gets a `programme_signals` list in `pipeline/config/programmes/<id>/signals.json`: weighted regex terms that indicate the discipline, e.g.
   - EE: transformer, substation, power factor, motor, generator, inverter, grid, load shedding
   - ETE: antenna, RF, signal, telecommunication, GSM network, modulation, fibre, BTS
   - COE: web, mobile app, database, management system, platform, machine learning, chatbot, USSD, e-commerce
   - ME: engine, turbine, heat exchanger, refrigeration, gearbox, welding, CNC, machining, pump design
   - CE: bridge, concrete, pavement, road, soil, foundation, drainage, building materials, survey
   - SLT: analysis of, determination of, concentration, contamination, microbial, assay, extract, samples
2. Score = sum of matched weights per programme. Shared words that fit several programmes (IoT, sensor, monitoring, solar, automatic) get low weights.
3. Assign the top programme. **Confidence:**
   - `high`: top score ≥ 2× the second and ≥ a minimum score
   - `low`: otherwise (still assigned to the top programme, but flagged)
   - no signal at all: assign to the source's `fallbackProgrammeId` if set (e.g. an "ICT" list → COE), else `unassigned`
4. Calibrate on the 752 EE titles plus the ETE list (known programmes). Target: ≥ 90% of known titles land in their real programme, measured and printed by the build. Re-run this check whenever signals change.

### 10.2 Stored fields

```ts
programmeId: string;                       // "unassigned" allowed only for inferred sources
programmeProvenance: "recorded" | "from-source-name" | "inferred-from-title";
programmeConfidence?: "high" | "low";      // only when inferred
```
Bump the schema version with the other Phase 1 changes.

### 10.3 Product behaviour

- Inferred projects appear in their programme's scope like any other, so students actually see them.
- The project page shows: "Programme: Computer Engineering (estimated from the title)".
- Low-confidence and unassigned projects are listed in `reports/quality-report.json` for the user to review. The user's correction goes into `pipeline/config/programme_overrides.json` (`{ "<projectId>": "<programmeId>" }`), which wins over inference and survives rebuilds.
- Idea check: an inferred-programme match is still shown in "In your programme", with the "estimated" note, because missing a real duplicate is worse than showing a near one.
