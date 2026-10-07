"""Stage 3: enrich submissions with derived information.

Everything added here comes from the title text plus the editable config
files. Each derived field is labelled with how it was produced, so the UI can
say "derived from title" instead of presenting guesses as recorded facts.
"""
from __future__ import annotations

import re

from textnorm import Corrector, TitleCaser


def _compile(patterns: list[str]) -> list[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


class Enricher:
    def __init__(self, corrections: dict, taxonomy: dict, problems: dict):
        self.corrector = Corrector(corrections["spelling"])
        self.caser = TitleCaser(corrections["acronyms"], corrections["smallWords"])
        self.glue = None  # set by build.py once all titles are known
        self.tag_sets = {
            key: [(item["id"], _compile(item["patterns"])) for item in taxonomy[key]]
            for key in ("categories", "domains", "technologies")
        }
        self.places = [(pid, re.compile(p, re.IGNORECASE)) for pid, _label, p in taxonomy["places"]["items"]]
        self.work_types = [(wid, re.compile(p, re.IGNORECASE)) for wid, _label, p in taxonomy["workTypes"]]
        self.problems = [
            {
                "id": p["id"],
                "categoryIds": p["categoryIds"],
                "any": _compile(p.get("any", [])),
                "requires": _compile(p.get("requires", [])),
                "excludes": _compile(p.get("excludes", [])),
            }
            for p in problems["problems"]
        ]

    @staticmethod
    def _hits(text: str, rules: list[tuple[str, list[re.Pattern]]]) -> list[str]:
        return [rid for rid, pats in rules if any(p.search(text) for p in pats)]

    def match_problems(self, text: str) -> list[str]:
        out = []
        for p in self.problems:
            if p["requires"] and not all(r.search(text) for r in p["requires"]):
                continue
            if any(x.search(text) for x in p["excludes"]):
                continue
            if any(a.search(text) for a in p["any"]):
                out.append(p["id"])
        return out

    def enrich(self, sub: dict) -> dict:
        for v in sub["versions"]:
            text, glued = self.glue.apply(v["text"].upper()) if self.glue else (v["text"], [])
            corrected, applied = self.corrector.apply(text)
            v["corrected"] = corrected
            v["corrections"] = glued + applied
        # The display title is the most recent wording (approved > revised > proposed).
        current = sub["versions"][-1]
        text = current["corrected"].lower()
        # Tag on all versions so a recast title doesn't lose its original meaning.
        all_text = " | ".join(v["corrected"].lower() for v in sub["versions"])

        sub["displayTitle"] = self.caser(current["corrected"])
        sub["searchText"] = all_text
        problem_ids = self.match_problems(all_text)
        categories = set(self._hits(all_text, self.tag_sets["categories"]))
        for p in self.problems:
            if p["id"] in problem_ids:
                categories.update(p["categoryIds"])
        sub["derived"] = {
            "problemIds": problem_ids,
            "categoryIds": sorted(categories),
            "domainIds": self._hits(all_text, self.tag_sets["domains"]),
            "technologyIds": self._hits(all_text, self.tag_sets["technologies"]),
            "placeIds": [pid for pid, rx in self.places if rx.search(text)],
            "workTypeIds": [wid for wid, rx in self.work_types if rx.search(text)],
        }
        return sub
