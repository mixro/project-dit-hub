"""Compact view of reports/quality-report.json (a few KB instead of the whole file).

    python3 pipeline/src/report_summary.py                     # whole dataset
    python3 pipeline/src/report_summary.py --source <sourceId> # one list, after adding it
    python3 pipeline/src/report_summary.py --source <id> --sample 20   # + random titles with tags

Claude Code: use this instead of opening the report or output JSON files.
Prints no personal data (the report contains none; rows are referred to by source and serial).
"""
from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", help="limit to one sourceId")
    ap.add_argument("--sample", type=int, default=0, help="print N random projects with their tags")
    ap.add_argument("--limit", type=int, default=15, help="max items per list (default 15)")
    a = ap.parse_args()

    r = load("reports/quality-report.json")
    index = load("output/public/projects.index.json")
    by_id = {p["id"]: p for p in index}
    src_of = {p["id"]: p["sourceId"] for p in index}
    in_scope = (lambda sid: sid == a.source) if a.source else (lambda sid: True)
    projects = [p for p in index if in_scope(p["sourceId"])]

    print(f"Report generated {r.get('generatedAt')}  |  privacy violations: {r.get('privacyViolations')}")
    print(f"Published projects: {r.get('projectsPublished')} (rows extracted {r.get('rowsExtracted')})")
    if a.source:
        if not projects:
            print(f"\nNo published projects for source '{a.source}'.")
            unpub = r.get("unpublishedSources", {})
            if a.source in unpub:
                print(f"Unpublished source: {unpub[a.source]}")
            print("Known sources:", ", ".join(sorted({p['sourceId'] for p in index})))
            return
        print(f"\nSource {a.source}: {len(projects)} projects")

    print("\nBy programme:", dict(Counter(p.get("programmeId") for p in projects).most_common()))
    print("Decisions:   ", dict(Counter(p.get("decision") for p in projects).most_common()))
    prov = Counter(p.get("programmeProvenance") for p in projects if p.get("programmeProvenance"))
    if prov:
        print("Programme provenance:", dict(prov))

    uncl = [u for u in r.get("unclassifiedProjects", []) if in_scope(src_of.get(u["id"], ""))]
    share = len(uncl) / max(1, len(projects))
    print(f"\nUnclassified: {len(uncl)} ({share:.0%})" + ("  <- above the 5% target" if share > 0.05 else ""))
    for u in uncl[: a.limit]:
        print(f"  - {u['id']}  {u['title'][:110]}")
    if len(uncl) > a.limit:
        print(f"  … {len(uncl) - a.limit} more (raise --limit to see them)")

    issues = [i for i in r.get("issues", []) if in_scope(i.get("sourceId", ""))]
    print("\nIssues:", dict(Counter(i["type"] for i in issues).most_common()) or "none")

    pi = r.get("programmeInference", {})
    cal = pi.get("calibration", {})
    if cal and not a.source:
        print(f"\nProgramme inference accuracy on known titles: {cal.get('accuracy')} (target 0.90)")
        for prog, s in cal.get("byProgramme", {}).items():
            print(f"  {prog}: recall {s.get('recall')} of {s.get('total')}")
    review = [x for x in pi.get("toReview", []) if in_scope(src_of.get(x.get("id", ""), x.get("sourceId", "")))]
    if review:
        print(f"\nLow-confidence programme estimates to review: {len(review)}")
        for x in review[: a.limit]:
            print("  -", json.dumps(x, ensure_ascii=False)[:160])

    if not a.source:
        corr = r.get("correctionsApplied", {})
        if isinstance(corr, dict) and corr:
            print(f"\nCorrections applied: {sum(corr.values())} across {len(corr)} rules")
        for k in ("unpublishedSources", "unidentifiedProgrammeLeftOut", "excludedProjects"):
            if r.get(k):
                print(f"{k}: {json.dumps(r[k], ensure_ascii=False)[:200]}")

    if a.sample:
        print(f"\nRandom sample of {min(a.sample, len(projects))} (check the tags):")
        rnd = random.Random(42)
        for p in rnd.sample(projects, min(a.sample, len(projects))):
            print(f"  {p['title'][:80]:80} | {','.join(p.get('problemIds', [])) or '-'} | {p.get('programmeId')}")
        _ = by_id


if __name__ == "__main__":
    main()
