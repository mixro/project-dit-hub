"""Stage 1: extract raw rows from source documents.

Output contains names and registration numbers, so it is written only to
private/. Nothing in this stage interprets or cleans data; it records exactly
what the document says, plus its location (table, row) for traceability.
"""
from __future__ import annotations

import re
from pathlib import Path

import docx


def _unique_cells(row) -> list[str]:
    """python-docx repeats merged cells; keep each underlying cell once."""
    seen, out = set(), []
    for cell in row.cells:
        key = id(cell._tc)
        if key in seen:
            continue
        seen.add(key)
        out.append(cell.text)
    return out


def _find_header(table, title_header: str) -> tuple[int, dict[str, int], int]:
    for r_idx, row in enumerate(table.rows[:5]):
        cells = [" ".join(c.split()).upper() for c in _unique_cells(row)]
        if title_header.upper() in cells:
            return r_idx, {name: i for i, name in enumerate(cells) if name}, len(cells)
    raise ValueError(f"Header row with '{title_header}' not found")


NUMBERED = re.compile(r"^\s*(\d{1,4})\s*[.)]\s*(\S.*)$")


def _extract_numbered_paragraphs(document, source: dict) -> tuple[list[dict], list[dict]]:
    """Lists written as '1. Title' paragraphs instead of a table (sources.json "format")."""
    rows = []
    for p_idx, para in enumerate(document.paragraphs):
        m = NUMBERED.match(para.text)
        if not m:
            continue  # headings and blank lines
        rows.append({
            "sourceId": source["id"],
            "location": {"table": None, "row": p_idx},
            "serial": m.group(1), "regNo": "", "name": "", "title": m.group(2),
            "remarks": "", "newTitle": "", "extraCells": [],
        })
    return rows, []


def extract_source(raw_dir: Path, source: dict) -> tuple[list[dict], list[dict]]:
    """Return (rows, issues) for one source document."""
    path = raw_dir / source["file"]
    document = docx.Document(str(path))
    if source.get("format") == "numbered-paragraphs":
        return _extract_numbered_paragraphs(document, source)
    cols = source["columns"]
    rows, issues = [], []
    # "tables": [first, last] reads only that range (one section of a multi-section document).
    first, last = source.get("tables", [0, len(document.tables) - 1])
    # "wrappedRows": a long name or title continues on the next row with an empty registration
    # number, and tables after the first repeat no header (one list split across tables).
    # "continueTables": only the second part (later tables reuse the header, rows are never joined).
    wrapped = source.get("wrappedRows", False)
    continue_tables = wrapped or source.get("continueTables", False)
    section_header = None

    for t_idx, table in enumerate(document.tables):
        if not first <= t_idx <= last:
            continue
        try:
            header_idx, header_map, n_cols = _find_header(table, cols["title"])
            section_header = (header_map, n_cols)
        except ValueError:
            if not (continue_tables and section_header):
                issues.append({"type": "table-skipped", "table": t_idx, "detail": "no title header"})
                continue
            header_idx, (header_map, n_cols) = -1, section_header

        def col(cells, key):
            """Column spec: a header name, a list of alternative header names,
            or '#n' for a column by position (used when the header cell is empty)."""
            spec = cols.get(key)
            if not spec:
                return ""
            if isinstance(spec, str) and spec.startswith("#"):
                i = int(spec[1:])
                return cells[i] if i < len(cells) else ""
            for name in ([spec] if isinstance(spec, str) else spec):
                if name.upper() in header_map:
                    i = header_map[name.upper()]
                    return cells[i] if i < len(cells) else ""
            return ""

        for r_idx, row in enumerate(table.rows[header_idx + 1:], start=header_idx + 1):
            cells = _unique_cells(row)
            if not any(c.strip() for c in cells):
                continue  # blank separator rows
            if " ".join(col(cells, "title").split()).upper() == cols["title"].upper():
                issues.append({"type": "repeated-header-skipped", "table": t_idx, "row": r_idx})
                continue  # header repeated for the next group in the same table
            if wrapped:
                if not col(cells, "regNo").strip() and rows:
                    prev = rows[-1]
                    for key in ("name", "title"):
                        prev[key] = f"{prev[key]} {' '.join(col(cells, key).split())}".strip()
                    issues.append({"type": "wrapped-row-joined", "table": t_idx, "row": r_idx})
                    continue
                cells = [" ".join(c.split()) for c in cells]  # wrapped text is one title, not alternatives
            rows.append({
                "sourceId": source["id"],
                "location": {"table": t_idx, "row": r_idx},
                "serial": col(cells, "serial").strip(),
                "regNo": col(cells, "regNo"),
                "name": col(cells, "name"),
                "title": col(cells, "title"),
                "remarks": col(cells, "remarks"),
                "newTitle": col(cells, "newTitle"),
                "extraCells": [c for c in cells[n_cols:] if c.strip()],
            })
    return rows, issues
