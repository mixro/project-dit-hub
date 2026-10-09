"""Stage 2: interpret raw rows as project submissions.

One title-defense row can describe up to two different projects:
  * the original TITLE with its REMARKS decision, and
  * the NEW TITLE, which is either a reworded version of the same project
    (recast/approved wording) or a completely different second proposal.

We decide which by combining the remark with how similar the two titles are.
Every inference is labelled so the UI can show what was recorded vs inferred.
"""
from __future__ import annotations

import hashlib
import hmac
import re

from textnorm import PLACEHOLDER_RE, clean_cell, extract_annotations, remove_repeated_sentence, split_alternatives, tokens

REG_RE = re.compile(r"^\d{9,13}$")

RECORDED, INFERRED = "recorded", "inferred"


def _jaccard(a: str, b: str) -> float:
    ta, tb = set(tokens(a)), set(tokens(b))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def parse_remark(remark: str) -> dict:
    r = remark.lower().strip()
    second = r.startswith("2nd")
    conditional = "condition" in r
    if "absent" in r:
        first = "not-presented"
    elif second:
        first = "rejected"
    elif conditional:
        first = "accepted-conditional"
    elif "accepted" in r:
        first = "accepted"
    elif "rejected" in r:
        first = "rejected"
    elif "pending" in r:
        first = "pending"
    else:
        first = "unknown"
    return {
        "first": first,
        "firstProvenance": INFERRED if second else (RECORDED if first != "unknown" else INFERRED),
        "secondTitleDecision": ("accepted-conditional" if conditional else "accepted") if second else None,
        "isSecondTitleRemark": second,
        "recast": "recast" in r,
    }


class StudentKeyer:
    """Anonymous, salted key. Lets us link a student's two titles without
    ever publishing who they are. The salt lives only in private/."""

    def __init__(self, salt: bytes):
        self.salt = salt

    def __call__(self, reg: str, name: str) -> str:
        basis = f"{reg}|{' '.join(name.upper().split())}"
        return hmac.new(self.salt, basis.encode(), hashlib.sha256).hexdigest()[:16]


def _prepare_title(raw: str, issues: list, where: dict) -> tuple[str, list[str]]:
    text = clean_cell(raw)
    text, repeated = remove_repeated_sentence(text)
    if repeated:
        issues.append({**where, "type": "repeated-text-removed"})
    text, annotations = extract_annotations(text)
    return text, annotations


def interpret_rows(rows: list[dict], source: dict, keyer: StudentKeyer) -> tuple[list[dict], list[dict]]:
    submissions, issues = [], []
    layout = source["layout"]

    for row in rows:
        where = {"sourceId": row["sourceId"], "row": row["location"]["row"], "serial": row["serial"]}
        reg = re.sub(r"[^0-9]", "", row["regNo"] or "")
        name = clean_cell(row["name"])
        if row["regNo"] and not REG_RE.match(reg):
            issues.append({**where, "type": "invalid-registration-number"})
        if row["extraCells"]:
            issues.append({**where, "type": "extra-cells-ignored", "count": len(row["extraCells"])})
        student_key = keyer(reg, name) if (reg or name) else None

        original, ann1 = _prepare_title(row["title"], issues, where)
        base = {
            "sourceId": row["sourceId"],
            "location": row["location"],
            "serial": row["serial"],
            "studentKey": student_key,
            "remarksRaw": clean_cell(row["remarks"]) or None,
        }

        if layout == "title-list-v1":
            default = source.get("defaultDecision", {"value": "unknown", "provenance": INFERRED})
            alternatives = []
            for alt in split_alternatives(row["title"]):
                text, ann = _prepare_title(alt, issues, where)
                if not text:
                    continue
                if PLACEHOLDER_RE.match(text):
                    issues.append({**where, "type": "placeholder-title-skipped", "value": text})
                    continue
                alternatives.append((text, ann))
            if not alternatives:
                if not (row["title"] or "").strip():
                    issues.append({**where, "type": "empty-title"})
                continue
            if len(alternatives) > 1:
                issues.append({**where, "type": "alternative-titles-split", "count": len(alternatives)})
            for n, (text, ann) in enumerate(alternatives):
                if ann:
                    issues.append({**where, "type": "year-annotation-preserved", "value": ann})
                role = "presented" if source["event"] == "final-presentation" else "listed"
                submissions.append({
                    **base, "part": "abcdefgh"[n],
                    "versions": [{"text": text, "role": role if n == 0 else "alternative-proposal"}],
                    "decision": default["value"], "decisionProvenance": default["provenance"],
                    "annotations": ann,
                })
            continue

        # ---- title-defense layout ----
        new, ann2 = _prepare_title(row["newTitle"], issues, where)
        remark = parse_remark(row["remarks"] or "")
        sim = _jaccard(original, new) if original and new else 0.0

        if not original and not new:
            issues.append({**where, "type": "empty-title"})
            continue

        first = None
        if original:
            first = {
                **base, "part": "a",
                "versions": [{"text": original, "role": "proposed", "decision": remark["first"]}],
                "decision": remark["first"], "decisionProvenance": remark["firstProvenance"],
                "annotations": ann1,
            }
            submissions.append(first)
        else:
            issues.append({**where, "type": "missing-original-title"})

        if not new:
            continue

        same_project = False
        if first and not remark["isSecondTitleRemark"]:
            if first["decision"] in ("accepted", "accepted-conditional"):
                same_project = sim >= 0.25
            else:
                same_project = sim >= 0.5

        if same_project and first:
            if new.upper() != original.upper():
                role = "approved-wording" if first["decision"].startswith("accepted") else "revised"
                first["versions"].append({"text": new, "role": role})
            continue

        if remark["isSecondTitleRemark"]:
            decision, prov = remark["secondTitleDecision"], RECORDED
        else:
            decision, prov = "unknown", INFERRED
            if first and first["decision"].startswith("accepted"):
                issues.append({**where, "type": "accepted-but-new-title-differs", "similarity": round(sim, 2)})

        second = {
            **base, "part": "b",
            "versions": [{"text": new, "role": "second-proposal"}],
            "decision": decision, "decisionProvenance": prov,
            "annotations": ann2,
        }
        submissions.append(second)

    issues.extend(_serial_gaps(rows))
    return _merge_duplicates(submissions, issues, source.get("mergeGroupTitles", False)), issues


def _serial_gaps(rows: list[dict]) -> list[dict]:
    nums = sorted({int(n) for r in rows for n in re.findall(r"\d+", r["serial"] or "")})
    if not nums:
        return []
    missing = sorted(set(range(nums[0], nums[-1] + 1)) - set(nums))
    if not missing:
        return []
    return [{"sourceId": rows[0]["sourceId"], "type": "missing-serial-numbers", "value": missing}]


def _merge_duplicates(subs: list[dict], issues: list, group_titles: bool = False) -> list[dict]:
    """Same student + same title appearing twice (a row re-entered) -> one record.
    With group_titles (sources.json "mergeGroupTitles"), the same title from different
    students in one source is one group project, not several."""
    seen: dict[tuple, dict] = {}
    out = []
    for s in subs:
        key = (s["sourceId"], None if group_titles else s["studentKey"], " ".join(tokens(s["versions"][0]["text"])))
        if key in seen:
            keep = seen[key]
            keep.setdefault("duplicateLocations", []).append(s["location"])
            if keep["decision"] == "unknown" and s["decision"] != "unknown":
                keep["decision"], keep["decisionProvenance"] = s["decision"], s["decisionProvenance"]
            if not s["studentKey"]:
                kind = "duplicate-title-merged"
            elif s["studentKey"] == keep["studentKey"]:
                kind = "duplicate-row-merged"
            else:
                kind = "group-title-merged"
            issues.append({"sourceId": s["sourceId"], "row": s["location"]["row"], "serial": s["serial"],
                           "type": kind, "mergedInto": keep["location"]["row"]})
            s["_mergedInto"] = keep
            continue
        seen[key] = s
        out.append(s)
    # Re-point second proposals whose first part got merged away.
    for s in subs:
        if s.get("_mergedInto"):
            s.pop("_mergedInto")
    return out
