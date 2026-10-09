"""Estimate a project's programme from its title (design doc section 10).

Used only for sources with programmeId "infer". Each programme has weighted
regex signals (config/programmes/<id>/signals.json); a title scores the sum
of the weights of the signals it matches, per programme. The top programme
wins; confidence is 'high' only when it clearly beats the runner-up.

    python pipeline/src/infer_programme.py --calibrate

prints how well the signals recover the programme of titles whose programme
is known (sources not set to "infer"). Titles only; no personal data.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

UNASSIGNED = "unassigned"


class ProgrammeInferrer:
    def __init__(self, signals: dict[str, list], min_score: float, dominance: float):
        self.signals = {pid: [(re.compile(p, re.IGNORECASE), w) for p, w in sig] for pid, sig in signals.items() if sig}
        self.min_score, self.dominance = min_score, dominance

    def scores(self, text: str) -> dict[str, float]:
        return {pid: sum(w for rx, w in sig if rx.search(text)) for pid, sig in self.signals.items()}

    def infer(self, text: str, prefer: str | None = None) -> tuple[str | None, str | None, dict[str, float]]:
        """(programmeId or None when nothing matched, 'high' | 'low' | None, scores).
        `prefer` (the source's fallback programme) wins a tie for first place."""
        sc = self.scores(text)
        ranked = sorted(sc.items(), key=lambda kv: (-kv[1], kv[0] != prefer))
        if not ranked or ranked[0][1] <= 0:
            return None, None, sc
        top, second = ranked[0][1], ranked[1][1] if len(ranked) > 1 else 0.0
        high = top >= self.min_score and top >= self.dominance * second
        return ranked[0][0], "high" if high else "low", sc


def calibrate(inferrer: ProgrammeInferrer, known: list[tuple[str, str]]) -> dict:
    """known: (text, real programmeId). Accuracy counts low-confidence hits as hits."""
    per = defaultdict(Counter)
    for text, real in known:
        got, conf, _ = inferrer.infer(text)
        per[real]["total"] += 1
        per[real]["correct"] += got == real
        per[real]["high-correct"] += got == real and conf == "high"
        per[real]["no-signal"] += got is None
        per[real][f"-> {got or 'none'}"] += 1
    total = sum(c["total"] for c in per.values())
    correct = sum(c["correct"] for c in per.values())
    return {
        "known": total,
        "accuracy": round(correct / total, 3) if total else None,
        "byProgramme": {pid: {"total": c["total"], "recall": round(c["correct"] / c["total"], 3),
                              "highConfidenceHits": c["high-correct"], "noSignal": c["no-signal"],
                              "assignedTo": {k[3:]: v for k, v in c.items() if k.startswith("-> ")}}
                        for pid, c in per.items()},
    }


def from_config(cfg) -> ProgrammeInferrer:
    inf = cfg.catalogue.get("inference", {})
    return ProgrammeInferrer({pid: r.signals for pid, r in cfg.programmes.items()}, inf.get("minScore", 3), inf.get("dominance", 2))


if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).parent))
    from config import load_config
    from extract import extract_source

    root = Path(__file__).resolve().parents[2]
    cfg = load_config(root / "pipeline" / "config")
    inferrer = from_config(cfg)
    known, unknown = [], defaultdict(list)
    for src in cfg.sources:
        rows, _ = extract_source(root / "raw", src)
        texts = [" | ".join(t for t in (r["title"], r["newTitle"]) if t.strip()).lower() for r in rows if r["title"].strip()]
        if src["programmeId"] == "infer":
            unknown[src["id"]] += texts
        else:
            known += [(t, src["programmeId"]) for t in texts]
    print(json.dumps(calibrate(inferrer, known), indent=1))
    for sid, texts in unknown.items():
        dist = Counter()
        for t in texts:
            got, conf, _ = inferrer.infer(t)
            dist[f"{got or UNASSIGNED}/{conf or '-'}"] += 1
        print(sid, dict(dist.most_common()))
    if "--misses" in sys.argv:
        want = sys.argv[sys.argv.index("--misses") + 1]
        for t, real in known:
            got, conf, sc = inferrer.infer(t)
            if real == want and got != real:
                print(f"  {got or 'none':>40} {conf or '':4} | {t[:90]}")
