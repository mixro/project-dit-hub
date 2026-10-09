"""Compare two public datasets and list every difference.

    python pipeline/src/compare_outputs.py OLD_DIR NEW_DIR [--allow REGEX ...]

Used to prove that a refactor changed nothing it shouldn't: IDs, titles,
decisions, tags, problems, similar projects and search rules must match.
Fields that exist only in NEW are reported as additions, not differences.
A difference whose path matches an --allow pattern is reported as expected.
Lists of IDs with the same items in a different order are reported separately.
Exit code 1 if any unexpected difference remains.

Reads public files only (no personal data).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path


def load(d: Path, name: str):
    p = d / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def by_id(items) -> dict:
    return {x["id"]: x for x in items or []}


def normalise_detail(d: dict) -> dict:
    """Schema 2 splits `similar` into same/other programme groups; compare as one list."""
    d = dict(d)
    sim = d.get("similar")
    if isinstance(sim, dict):
        d["similar"] = sim.get("sameProgramme", []) + sim.get("otherProgrammes", [])
    return d


class Diff:
    def __init__(self, allow: list[str]):
        self.allow = [re.compile(a) for a in allow]
        self.unexpected: list[str] = []
        self.expected: list[str] = []
        self.reordered: list[str] = []  # same items, different order
        self.added: Counter = Counter()

    def note(self, path: str, old, new):
        line = f"{path}: {json.dumps(old, ensure_ascii=False)[:120]} -> {json.dumps(new, ensure_ascii=False)[:120]}"
        (self.expected if any(a.search(path) for a in self.allow) else self.unexpected).append(line)

    def compare(self, path: str, old, new):
        if isinstance(old, dict) and isinstance(new, dict):
            for k in old:
                if k not in new:
                    self.note(f"{path}.{k}", old[k], "<missing>")
                else:
                    self.compare(f"{path}.{k}", old[k], new[k])
            for k in new:
                if k not in old:
                    self.added[re.sub(r"\[[^\]]*\]", "[]", f"{path}.{k}")] += 1
        elif old != new:
            if (isinstance(old, list) and isinstance(new, list) and len(old) == len(new)
                    and all(isinstance(x, str) for x in old + new) and sorted(old) == sorted(new)):
                self.reordered.append(f"{path}: {old} -> {new}")
            else:
                self.note(path, old, new)

    def keyed(self, path: str, old: dict, new: dict):
        for k in sorted(old.keys() - new.keys()):
            self.note(f"{path}[{k}]", "<present>", "<missing>")
        for k in sorted(new.keys() - old.keys()):
            self.note(f"{path}[{k}]", "<missing>", "<present>")
        for k in sorted(old.keys() & new.keys()):
            self.compare(f"{path}[{k}]", old[k], new[k])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("old", type=Path)
    ap.add_argument("new", type=Path)
    ap.add_argument("--allow", action="append", default=[], help="regex of paths allowed to differ")
    ap.add_argument("--show", type=int, default=25, help="how many differences to print")
    args = ap.parse_args()
    o, n, diff = args.old, args.new, Diff(args.allow)

    diff.keyed("index", by_id(load(o, "projects.index.json")), by_id(load(n, "projects.index.json")))

    old_details, new_details = {}, {}
    for f in o.glob("projects.*.json"):
        if f.name != "projects.index.json" and not f.name.startswith("projects.index."):
            old_details.update({k: normalise_detail(v) for k, v in load(o, f.name).items()})
    for f in n.glob("projects.*.json"):
        if f.name != "projects.index.json" and not f.name.startswith("projects.index."):
            new_details.update({k: normalise_detail(v) for k, v in load(n, f.name).items()})
    diff.keyed("details", old_details, new_details)

    diff.keyed("problems", by_id(load(o, "problems.json")), by_id(load(n, "problems.json")))
    diff.keyed("sources", by_id(load(o, "sources.json")), by_id(load(n, "sources.json")))

    ot, nt = load(o, "taxonomy.json"), load(n, "taxonomy.json")
    for key in ot:
        if isinstance(ot[key], list) and ot[key] and isinstance(ot[key][0], dict) and "id" in ot[key][0]:
            diff.keyed(f"taxonomy.{key}", by_id(ot[key]), by_id(nt.get(key)))
        else:
            diff.compare(f"taxonomy.{key}", ot[key], nt.get(key))

    os_, ns = load(o, "search.json"), load(n, "search.json")
    for key in ("weights", "stopwords", "ignoredPlaceWords", "idf", "documentCount"):
        diff.compare(f"search.{key}", os_.get(key), ns.get(key))
    for kind, rules in os_["rules"].items():
        diff.keyed(f"search.rules.{kind}", by_id(rules), by_id(ns["rules"].get(kind)))

    diff.compare("manifest.counts", load(o, "manifest.json")["counts"], load(n, "manifest.json")["counts"])

    print(f"unexpected differences : {len(diff.unexpected)}")
    for line in diff.unexpected[: args.show]:
        print("  !", line)
    print(f"expected differences   : {len(diff.expected)}")
    for pattern, count in Counter(re.sub(r"\[[^\]]*\]", "[]", l.split(":")[0]) for l in diff.expected).most_common():
        print(f"  ~ {pattern} x{count}")
    print(f"order-only differences : {len(diff.reordered)}")
    for line in diff.reordered[: args.show]:
        print("  ~", line)
    print(f"added fields           : {sum(diff.added.values())}")
    for path, count in sorted(diff.added.items()):
        print(f"  + {path} x{count}")
    return 1 if diff.unexpected else 0


if __name__ == "__main__":
    raise SystemExit(main())
