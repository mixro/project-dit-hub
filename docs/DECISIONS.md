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
