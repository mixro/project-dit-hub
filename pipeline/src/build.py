"""Build the public dataset.

    python pipeline/src/build.py

Stages: extract -> interpret -> enrich -> link -> similarity -> publish -> privacy check.
Public output: output/public/   (safe to ship to the browser)
Private output: private/        (never commit, never deploy)
Report:        reports/         (data quality issues, no personal data)
"""
from __future__ import annotations

import hashlib
import json
import os
import secrets
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from enrich import Enricher  # noqa: E402
from extract import extract_source  # noqa: E402
from interpret import StudentKeyer, interpret_rows  # noqa: E402
from privacy import check_public_dir  # noqa: E402
from similarity import WEIGHTS, SimilarityIndex, place_stopwords  # noqa: E402
from textnorm import STOPWORDS, GlueSplitter  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "pipeline" / "config"
# Personal data can live OUTSIDE the repository (recommended, so no tool or AI
# assistant working in the repo can read it). Set HUB_RAW_DIR / HUB_PRIVATE_DIR.
RAW = Path(os.environ.get("HUB_RAW_DIR", ROOT / "raw")).expanduser()
PRIVATE = Path(os.environ.get("HUB_PRIVATE_DIR", ROOT / "private")).expanduser()
PUBLIC, REPORTS = ROOT / "output" / "public", ROOT / "reports"
SCHEMA_VERSION = 1

DECISIONS = [
    {"id": "accepted", "label": "Accepted"},
    {"id": "accepted-conditional", "label": "Accepted with conditions"},
    {"id": "rejected", "label": "Rejected"},
    {"id": "pending", "label": "Pending"},
    {"id": "not-presented", "label": "Not presented (absent)"},
    {"id": "unknown", "label": "Decision not recorded"},
]
EVENTS = [
    {"id": "title-defense", "label": "Title defence"},
    {"id": "final-presentation", "label": "Final presentation"},
    {"id": "tentative-titles", "label": "Tentative titles"},
    {"id": "title-list", "label": "Title list"},
]


def load(name: str) -> dict:
    return json.loads((CONFIG / name).read_text(encoding="utf-8"))


def salt() -> bytes:
    PRIVATE.mkdir(parents=True, exist_ok=True)
    path = PRIVATE / ".salt"
    if not path.exists():
        path.write_bytes(secrets.token_bytes(32))
    return path.read_bytes()


def stable_id(sub: dict, year: int, taken: set[str]) -> str:
    basis = f"{sub['sourceId']}|{sub['versions'][0]['text'].upper()}"
    base = f"p{year}-{hashlib.sha1(basis.encode()).hexdigest()[:8]}"
    pid, n = base, 2
    while pid in taken:
        pid, n = f"{base}-{n}", n + 1
    taken.add(pid)
    return pid


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> int:
    sources_cfg, taxonomy = load("sources.json"), load("taxonomy.json")
    problems_cfg, corrections = load("problems.json"), load("corrections.json")
    sources = {s["id"]: s for s in sources_cfg["sources"]}
    publishing = sources_cfg["publishing"]

    keyer = StudentKeyer(salt())
    enricher = Enricher(corrections, taxonomy, problems_cfg)

    all_rows, subs, issues = [], [], []
    for src in sources_cfg["sources"]:
        rows, ext_issues = extract_source(RAW, src)
        interpreted, int_issues = interpret_rows(rows, src, keyer)
        all_rows += rows
        subs += interpreted
        issues += ext_issues + int_issues

    # Private copy of exactly what the documents said (contains personal data).
    with (PRIVATE / "raw_rows.jsonl").open("w", encoding="utf-8") as fh:
        for r in all_rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    if not publishing["publishRejectedTitles"]:
        subs = [s for s in subs if s["decision"] != "rejected"]

    # Learn vocabulary from every title in every document, then repair fused words.
    enricher.glue = GlueSplitter([v["text"] for s in subs for v in s["versions"]], corrections.get("keepWords", []))

    taken: set[str] = set()
    loc_to_id: dict[tuple, str] = {}
    for s in subs:
        enricher.enrich(s)
        s["id"] = stable_id(s, sources[s["sourceId"]]["year"], taken)
        loc = (s["sourceId"], s["location"]["row"], s["part"])
        loc_to_id[loc] = s["id"]
        for dup in s.get("duplicateLocations", []):
            loc_to_id[(s["sourceId"], dup["row"], s["part"])] = s["id"]

    # Titles from the same row belong to the same student (second proposals,
    # alternatives). Link them without exposing who the student is.
    row_groups: dict[tuple, set[str]] = defaultdict(set)
    for s in subs:
        row_groups[(s["sourceId"], s["location"]["row"])].add(s["id"])
        for dup in s.get("duplicateLocations", []):
            row_groups[(s["sourceId"], dup["row"])].add(s["id"])
    related: dict[str, set[str]] = defaultdict(set)
    for ids in row_groups.values():
        for pid in ids:
            related[pid] |= ids - {pid}
    if not publishing["publishSubmissionLinks"]:
        related.clear()

    sim = SimilarityIndex(subs, place_stopwords(taxonomy))
    # Never list a student's own other titles as "similar projects".
    index_of = {s["id"]: i for i, s in enumerate(subs)}
    same_student: dict[int, set[int]] = defaultdict(set)
    for i, s in enumerate(subs):
        same_student[i] |= {index_of[r] for r in related.get(s["id"], set())}
        if s["studentKey"]:
            same_student[i] |= {j for j, o in enumerate(subs) if o["studentKey"] == s["studentKey"] and j != i}

    # ---------- public records (allow-list of fields only) ----------
    summaries, details = [], defaultdict(dict)
    for i, s in enumerate(subs):
        src = sources[s["sourceId"]]
        d = s["derived"]
        current = s["versions"][-1]
        summaries.append({
            "id": s["id"],
            "title": s["displayTitle"],
            "altTitles": [enricher.caser(v["corrected"]) for v in s["versions"][:-1]],
            "year": src["year"],
            "academicYear": src["academicYear"],
            "institutionId": src["institutionId"],
            "programmeId": src["programmeId"],
            "event": src["event"],
            "decision": s["decision"],
            "problemIds": d["problemIds"],
            "categoryIds": d["categoryIds"],
            "domainIds": d["domainIds"],
            "technologyIds": d["technologyIds"],
            "placeIds": d["placeIds"],
            "sourceId": s["sourceId"],
        })
        exclude = same_student[i]
        details[s["sourceId"]][s["id"]] = {
            "id": s["id"],
            "titleHistory": [
                {
                    "role": v["role"],
                    "title": enricher.caser(v["corrected"]),
                    "asWritten": v["text"],
                    "corrections": v["corrections"],
                    **({"decision": v["decision"]} if "decision" in v else {}),
                }
                for v in s["versions"]
            ],
            "decision": s["decision"],
            "decisionProvenance": s["decisionProvenance"],
            "remarksAsWritten": s["remarksRaw"],
            "annotations": s.get("annotations", []),
            "workTypeIds": d["workTypeIds"],
            "provenance": {
                "title": "recorded",
                "decision": s["decisionProvenance"],
                "problems": "derived-from-title",
                "categories": "derived-from-title",
                "domains": "derived-from-title",
                "technologies": "derived-from-title",
                "problemStatement": "general-problem-description",
                "solutionSummary": "not-available",
            },
            "source": {"sourceId": s["sourceId"], "serial": s["serial"] or None,
                       "duplicateCount": len(s.get("duplicateLocations", []))},
            "relatedSubmissionIds": sorted(related.get(s["id"], [])),
            "similar": sim.top_similar(i, k=6, exclude=exclude),
        }
        assert current is s["versions"][-1]

    # ---------- problems with computed context ----------
    proj_by_problem = defaultdict(list)
    for p in summaries:
        for pid in p["problemIds"]:
            proj_by_problem[pid].append(p)
    problems_out = []
    for p in problems_cfg["problems"]:
        projects = proj_by_problem.get(p["id"], [])
        tech = Counter(t for x in projects for t in x["technologyIds"])
        problems_out.append({
            "id": p["id"], "title": p["title"], "description": p["description"],
            "categoryIds": p["categoryIds"],
            "projectCount": len(projects),
            "projectCountByYear": dict(sorted(Counter(x["year"] for x in projects).items())),
            "topTechnologyIds": [t for t, _ in tech.most_common(6)],
            "decisionCounts": dict(Counter(x["decision"] for x in projects)),
        })

    def label_list(items):
        return [{"id": x["id"], "label": x["label"]} for x in items]

    taxonomy_out = {
        "categories": label_list(taxonomy["categories"]),
        "domains": label_list(taxonomy["domains"]),
        "technologies": label_list(taxonomy["technologies"]),
        "places": [{"id": pid, "label": label} for pid, label, _ in taxonomy["places"]["items"]],
        "workTypes": [{"id": wid, "label": label} for wid, label, _ in taxonomy["workTypes"]],
        "decisions": DECISIONS,
        "events": EVENTS,
        "institutions": sources_cfg["institutions"],
        "programmes": sources_cfg["programmes"],
    }

    missing_serials = {i["sourceId"]: i["value"] for i in issues if i["type"] == "missing-serial-numbers"}
    sources_out = [{
        "id": s["id"], "documentName": s["file"], "institutionId": s["institutionId"],
        "programmeId": s["programmeId"], "level": s["level"], "cohort": s["cohort"],
        "academicYear": s["academicYear"], "year": s["year"], "event": s["event"],
        "eventDate": s["eventDate"], "notes": s["notes"],
        "projectCount": sum(1 for x in summaries if x["sourceId"] == s["id"]),
        "missingSerialNumbers": missing_serials.get(s["id"], []),
    } for s in sources_cfg["sources"]]

    search_out = {
        "weights": WEIGHTS,
        "stopwords": sorted(STOPWORDS),
        "ignoredPlaceWords": sorted(sim.drop),
        "idf": {t: round(v, 4) for t, v in sorted(sim.idf.items())},
        "documentCount": len(subs),
        # The same rules the pipeline used, so the browser tags a student's idea
        # exactly the way titles were tagged (one source of truth).
        "rules": {
            "problems": [{k: p.get(k, []) for k in ("id", "any", "requires", "excludes")} for p in problems_cfg["problems"]],
            "technologies": [{"id": t["id"], "patterns": t["patterns"]} for t in taxonomy["technologies"]],
            "domains": [{"id": t["id"], "patterns": t["patterns"]} for t in taxonomy["domains"]],
        },
    }

    # ---------- write ----------
    for f in PUBLIC.glob("*.json"):
        f.unlink()
    files = {
        "projects.index.json": summaries,
        "problems.json": problems_out,
        "taxonomy.json": taxonomy_out,
        "sources.json": sources_out,
        "search.json": search_out,
    }
    for source_id, shard in details.items():
        files[f"projects.{source_id}.json"] = shard
    for name, data in files.items():
        write_json(PUBLIC / name, data)

    entries = {}
    for name in sorted(files):
        raw = (PUBLIC / name).read_bytes()
        entries[name] = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()[:16]}
    dataset_version = hashlib.sha256("".join(e["sha256"] for e in entries.values()).encode()).hexdigest()[:12]
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "datasetVersion": dataset_version,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "counts": {
            "projects": len(summaries),
            "problems": sum(1 for p in problems_out if p["projectCount"]),
            "sources": len(sources_out),
            "years": sorted({p["year"] for p in summaries}),
        },
        "files": {
            "index": "projects.index.json",
            "problems": "problems.json",
            "taxonomy": "taxonomy.json",
            "sources": "sources.json",
            "search": "search.json",
            "details": {sid: f"projects.{sid}.json" for sid in details},
        },
        "integrity": entries,
    }
    write_json(PUBLIC / "manifest.json", manifest)

    # ---------- privacy gate ----------
    violations = check_public_dir(PUBLIC, all_rows)

    # ---------- quality report ----------
    unclassified = [s["id"] for s in subs if not s["derived"]["problemIds"]]
    report = {
        "generatedAt": manifest["generatedAt"],
        "rowsExtracted": len(all_rows),
        "projectsPublished": len(summaries),
        "decisionCounts": dict(Counter(s["decision"] for s in summaries)),
        "issueCounts": dict(Counter(i["type"] for i in issues)),
        "issues": issues,
        "unclassifiedProjects": [{"id": pid, "title": next(x["title"] for x in summaries if x["id"] == pid)} for pid in unclassified],
        "correctionsApplied": dict(Counter(c["from"] for s in subs for v in s["versions"] for c in v["corrections"])),
        "privacyViolations": violations,
    }
    REPORTS.mkdir(exist_ok=True)
    write_json(REPORTS / "quality-report.json", report)

    print(f"rows extracted      : {len(all_rows)}")
    print(f"projects published  : {len(summaries)}")
    print(f"decisions           : {dict(Counter(s['decision'] for s in summaries))}")
    print(f"problems used       : {manifest['counts']['problems']} / {len(problems_out)}")
    print(f"unclassified        : {len(unclassified)}")
    print(f"issues              : {dict(Counter(i['type'] for i in issues))}")
    print(f"public files        : " + ", ".join(f"{k} ({v['bytes']//1024} KB)" for k, v in entries.items()))
    print(f"dataset version     : {dataset_version}")
    if violations:
        print("\nPRIVACY CHECK FAILED - public output removed:")
        for v in violations[:20]:
            print("  -", v)
        for f in PUBLIC.glob("*.json"):
            f.unlink()
        return 1
    print("privacy check       : passed")
    app_data = ROOT / "app" / "public" / "data"
    if app_data.parent.exists():
        app_data.mkdir(exist_ok=True)
        for f in app_data.glob("*.json"):
            f.unlink()
        for f in PUBLIC.glob("*.json"):
            (app_data / f.name).write_bytes(f.read_bytes())
        print(f"copied to           : {app_data.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
