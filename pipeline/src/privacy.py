"""Privacy guard. Runs after the public files are written and fails the build
if personal data could leak. This is a safety net: public records are built
from an allow-list of fields, so names never get copied in the first place.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

FORBIDDEN_KEYS = {"name", "names", "regno", "regnumber", "registrationnumber", "student", "students", "studentkey"}
LONG_DIGITS = re.compile(r"(?<!\d)\d{9,}(?!\d)")
NAME_TOKEN = re.compile(r"[A-Za-z']{3,}")


# Dicts whose keys are vocabulary words, not field names (e.g. search.json idf).
WORD_MAP_PATHS = {".idf"}


def _walk_keys(obj, path=""):
    if isinstance(obj, dict):
        if path in WORD_MAP_PATHS:
            return
        for k, v in obj.items():
            yield f"{path}.{k}", k
            yield from _walk_keys(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk_keys(v, f"{path}[{i}]")


# Content hashes are random hex and may contain long digit runs by chance.
HASH_KEYS = {"sha256", "datasetVersion"}


def _values(obj, key=None):
    """All string values (and dict keys), except content-hash fields."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield str(k)
            if k not in HASH_KEYS:
                yield from _values(v, k)
    elif isinstance(obj, list):
        for v in obj:
            yield from _values(v, key)
    elif isinstance(obj, (str, int)) and not isinstance(obj, bool):
        yield str(obj)


def check_public_dir(public_dir: Path, raw_rows: list[dict]) -> list[str]:
    violations = []
    regs = {re.sub(r"\D", "", r["regNo"] or "") for r in raw_rows}
    regs = {r for r in regs if len(r) >= 6}
    name_pairs = set()
    for r in raw_rows:
        toks = [t.lower() for t in NAME_TOKEN.findall(r["name"] or "")]
        for a, b in zip(toks, toks[1:]):
            name_pairs.add((a, b))

    for f in sorted(public_dir.rglob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        text = "\n".join(_values(data))
        for path, key in _walk_keys(data):
            if key.lower().replace("_", "") in FORBIDDEN_KEYS:
                violations.append(f"{f.name}: forbidden field '{path}'")
        for m in LONG_DIGITS.finditer(text):
            violations.append(f"{f.name}: long digit sequence '{m.group(0)[:4]}…' (possible registration number)")
        words = [w.lower() for w in NAME_TOKEN.findall(text)]
        for a, b in zip(words, words[1:]):
            if (a, b) in name_pairs:
                violations.append(f"{f.name}: possible student name fragment '{a} {b}'")
        for reg in regs:
            if reg in text:
                violations.append(f"{f.name}: registration number found")
    return violations
