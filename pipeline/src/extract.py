"""Stage 1: extract raw rows from source documents.

Output contains names and registration numbers, so it is written only to
private/. Nothing in this stage interprets or cleans data; it records exactly
what the document says, plus its location (table, row) for traceability.
"""
from __future__ import annotations

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


def extract_source(raw_dir: Path, source: dict) -> tuple[list[dict], list[dict]]:
    """Return (rows, issues) for one source document."""
    path = raw_dir / source["file"]
    document = docx.Document(str(path))
    cols = source["columns"]
    rows, issues = [], []

    for t_idx, table in enumerate(document.tables):
        try:
            header_idx, header_map, n_cols = _find_header(table, cols["title"])
        except ValueError:
            issues.append({"type": "table-skipped", "table": t_idx, "detail": "no title header"})
            continue

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
