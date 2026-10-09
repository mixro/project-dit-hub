"""Stage 4: deterministic, explainable similarity.

score = 0.55 * cosine(TF-IDF of title words)
      + 0.25 * overlap(problems)
      + 0.12 * overlap(technologies)
      + 0.08 * overlap(engineering domains)

Place and organisation names are excluded, so two projects are not 'similar'
just because both mention DIT. Every result carries its reasons (shared words,
problems, technologies) so students see *why*, not just a number.
"""
from __future__ import annotations

import math
import re
from collections import Counter

from textnorm import tokens

WEIGHTS = {"text": 0.55, "problems": 0.25, "technologies": 0.12, "domains": 0.08}
BANDS = [(0.55, "closely-related"), (0.32, "related"), (0.18, "loosely-related")]


def place_stopwords(taxonomy: dict) -> set[str]:
    words = set()
    for _pid, label, pattern in taxonomy["places"]["items"]:
        for part in re.split(r"[^a-z]+", (label + " " + pattern).lower()):
            if len(part) > 2:
                words.add(part)
    return words - {"campus", "railway", "hospital", "national", "authority", "ports"}


def _overlap(a: list[str], b: list[str]) -> float:
    sa, sb = set(a), set(b)
    return len(sa & sb) / len(sa | sb) if sa and sb else 0.0


def band(score: float) -> str | None:
    for threshold, name in BANDS:
        if score >= threshold:
            return name
    return None


class SimilarityIndex:
    def __init__(self, records: list[dict], drop: set[str], programme_stopwords: dict[str, set[str]] | None = None):
        """IDF is computed over every record (shared vocabulary). A programme's own
        stopwords are dropped only from that programme's titles."""
        self.records = records
        self.drop = drop
        extra = programme_stopwords or {}
        docs = [tokens(r["searchText"], drop | extra.get(r["programmeId"], set())) for r in records]
        df = Counter(t for d in docs for t in set(d))
        n = len(docs)
        self.idf = {t: math.log((1 + n) / (1 + c)) + 1.0 for t, c in df.items()}
        self.vectors = [self._vector(d) for d in docs]

    def _vector(self, toks: list[str]) -> dict[str, float]:
        tf = Counter(toks)
        vec = {t: (1 + math.log(c)) * self.idf.get(t, 0.0) for t, c in tf.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        return {t: v / norm for t, v in vec.items()}

    def compare(self, i: int, j: int) -> tuple[float, dict]:
        a, b = self.records[i]["derived"], self.records[j]["derived"]
        va, vb = self.vectors[i], self.vectors[j]
        shared_terms = sorted((t for t in va if t in vb), key=lambda t: -(va[t] * vb[t]))
        cos = sum(va[t] * vb[t] for t in shared_terms)
        parts = {
            "text": cos,
            "problems": _overlap(a["problemIds"], b["problemIds"]),
            "technologies": _overlap(a["technologyIds"], b["technologyIds"]),
            "domains": _overlap(a["domainIds"], b["domainIds"]),
        }
        score = sum(WEIGHTS[k] * v for k, v in parts.items())
        reasons = {
            "sharedTerms": shared_terms[:5],
            "sharedProblemIds": sorted(set(a["problemIds"]) & set(b["problemIds"])),
            "sharedTechnologyIds": sorted(set(a["technologyIds"]) & set(b["technologyIds"])),
        }
        return score, reasons

    def top_similar(self, i: int, k_same: int = 6, k_other: int = 3, exclude: set[int] | None = None) -> dict:
        """Best matches in the project's own programme and, separately, in other programmes."""
        exclude = exclude or set()
        scored = []
        for j in range(len(self.records)):
            if j == i or j in exclude:
                continue
            score, reasons = self.compare(i, j)
            b = band(score)
            if b:
                scored.append((score, j, b, reasons))
        scored.sort(key=lambda x: -x[0])
        own = self.records[i]["programmeId"]
        out = lambda rows: [{"id": self.records[j]["id"], "score": round(s, 3), "band": b, "reasons": r} for s, j, b, r in rows]
        return {
            "sameProgramme": out([x for x in scored if self.records[x[1]]["programmeId"] == own][:k_same]),
            "otherProgrammes": out([x for x in scored if self.records[x[1]]["programmeId"] != own][:k_other]),
        }
