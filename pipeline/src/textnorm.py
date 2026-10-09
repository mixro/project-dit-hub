"""Text normalisation for historical project titles.

Rule: original text is never modified. Every function returns new values,
and corrections are reported so each record can show exactly what changed.
"""
from __future__ import annotations

import re
import unicodedata

QUOTE_CHARS = "\"'“”‘’`"
ANNOTATION_RE = re.compile(r"\(\s*(?:\d{4}\s*/\s*\d{2,4}\s*,?\s*)+\)")
WS_RE = re.compile(r"\s+")
ZERO_WIDTH_RE = re.compile(r"[\u200b\u200c\u200d\ufeff]")
LABEL_PREFIX_RE = re.compile(r"^\s*project\s+title\s*:\s*", re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r"^(changed?|new)\s+title$", re.IGNORECASE)

# Words that begin a fresh title. Used to tell "two alternative titles in one
# cell" apart from "one long title wrapped onto a second line".
TITLE_STARTERS = {
    "design", "designing", "desing", "to", "automatic", "automatically", "auto", "improvement",
    "development", "implementation", "implementing", "energy", "fastest", "efficient",
    "micro-grid", "circuit", "smart", "intelligent", "electronic", "remote", "solar",
}
CONNECTOR_END = {"for", "in", "of", "and", "with", "to", "at", "on", "by", "from", "the", "a", "an", "using", "against"}


def split_alternatives(raw: str) -> list[str]:
    """Split a multi-line cell into separate titles only when a line clearly
    starts a new title. Wrapped lines are joined back together."""
    lines = [ZERO_WIDTH_RE.sub("", l).replace("\xa0", " ").strip() for l in (raw or "").split("\n")]
    lines = [l for l in lines if l]
    if len(lines) <= 1:
        return lines
    parts = [lines[0]]
    for line in lines[1:]:
        prev = parts[-1].rstrip()
        first_word = line.split()[0].lower().strip(",.:;")
        prev_last = prev.split()[-1].lower() if prev.split() else ""
        continues = prev.endswith((",", "-", ":", "/")) or prev_last in CONNECTOR_END
        if not continues and (first_word in TITLE_STARTERS or prev.endswith(".")):
            parts.append(line)
        else:
            parts[-1] = prev + " " + line
    return parts


class GlueSplitter:
    """Repairs words fused by missing spaces, e.g. AUTOMATICCIRCUIT -> AUTOMATIC CIRCUIT.

    The vocabulary is learned from the corpus itself: a token is split only if it
    is rare and every piece is a common word elsewhere in the titles. Real compound
    words it must not split go in corrections.json `keepWords`. (A system spelling
    dictionary used to be consulted too; it made output differ between machines.)"""

    SHORT_OK = {"OF", "ON", "IN", "TO", "AT", "BY"}

    def __init__(self, texts: list[str], keep_words: list[str], min_piece_freq: int = 2):
        from collections import Counter
        self.freq = Counter(w for t in texts for w in re.findall(r"[A-Z]+", t.upper()))
        self.min = min_piece_freq
        self.keep = {w.upper() for w in keep_words}

    def _ok(self, piece: str) -> bool:
        return piece in self.SHORT_OK or (len(piece) >= 3 and self.freq[piece] >= self.min)

    def _split(self, word: str, depth: int = 0) -> list[str] | None:
        if self._ok(word) and depth > 0:
            return [word]
        if depth >= 2:
            return None
        best = None
        for i in range(2, len(word) - 1):
            left, right = word[:i], word[i:]
            if not self._ok(left):
                continue
            rest = self._split(right, depth + 1)
            if rest:
                score = min(self.freq[p] for p in [left, *rest])
                if best is None or score > best[0]:
                    best = (score, [left, *rest])
        return best[1] if best else None

    def apply(self, upper_text: str) -> tuple[str, list[dict]]:
        applied = []

        def fix(m: re.Match) -> str:
            w = m.group(0)
            if len(w) < 7 or w in self.keep or self.freq[w] > 1:
                return w
            parts = self._split(w)
            if parts and len(parts) > 1:
                applied.append({"from": w, "to": " ".join(parts), "kind": "split-glued-word"})
                return " ".join(parts)
            return w

        return re.sub(r"[A-Z]+", fix, upper_text), applied


def clean_cell(text: str | None) -> str:
    """Normalise whitespace, unicode and wrapping quotes. Keeps the wording."""
    if not text:
        return ""
    t = ZERO_WIDTH_RE.sub("", unicodedata.normalize("NFKC", text))
    t = LABEL_PREFIX_RE.sub("", t)
    t = t.replace("\u2013", "-").replace("\u2014", "-").replace("\u2011", "-")
    t = WS_RE.sub(" ", t).strip()
    # Strip quotes wrapping the whole cell, plus stray quotes at either end.
    t = t.strip(QUOTE_CHARS + " ")
    t = t.rstrip(" .,;:")
    return t


def remove_repeated_sentence(text: str) -> tuple[str, bool]:
    """Handle copy-paste duplicates such as 'X.X.' where a title is pasted twice."""
    compact = text.rstrip(". ")
    n = len(compact)
    for split in range(n // 2 - 2, n // 2 + 3):
        left, right = compact[:split].rstrip(". "), compact[split:].lstrip(". ")
        if left and left.upper() == right.upper():
            return left, True
    return text, False


def extract_annotations(text: str) -> tuple[str, list[str]]:
    """Pull year annotations like '(2014/2015)' out of a title. Their meaning is
    unconfirmed, so they are preserved verbatim rather than interpreted."""
    found = [m.group(0).strip("() ") for m in ANNOTATION_RE.finditer(text)]
    stripped = ANNOTATION_RE.sub("", text)
    return WS_RE.sub(" ", stripped).strip(" .,;:"), found


class Corrector:
    def __init__(self, spelling: dict[str, str]):
        # Longest keys first so multi-word fixes win over single-word ones.
        self.rules = [
            (re.compile(r"(?<![A-Z0-9])" + re.escape(k) + r"(?![A-Z0-9])"), k, v)
            for k, v in sorted(spelling.items(), key=lambda kv: -len(kv[0]))
        ]

    def apply(self, text: str) -> tuple[str, list[dict]]:
        upper = text.upper()
        applied = []
        for rx, src, dst in self.rules:
            if rx.search(upper):
                upper = rx.sub(dst, upper)
                applied.append({"from": src, "to": dst})
        upper = WS_RE.sub(" ", upper).strip()
        return upper, applied


class TitleCaser:
    def __init__(self, acronyms: dict[str, str], small_words: list[str]):
        self.acronyms = {k.upper(): v for k, v in acronyms.items()}
        self.small = set(small_words)

    def _word(self, word: str, first: bool) -> str:
        core = word.strip("(),;:")
        lead = word[: len(word) - len(word.lstrip("(),;:"))]
        trail = word[len(lead) + len(core):]
        up = core.upper()
        if up in self.acronyms:
            out = self.acronyms[up]
        elif "-" in core and len(core) > 1:
            out = "-".join(self._word(p, True) if p else p for p in core.split("-"))
        elif any(ch.isdigit() for ch in core):
            out = up
        elif up.endswith("'S") and up[:-2] in self.acronyms:
            out = self.acronyms[up[:-2]] + "'s"
        elif not first and core.lower() in self.small:
            out = core.lower()
        else:
            out = core[:1].upper() + core[1:].lower()
        return lead + out + trail

    def __call__(self, upper_text: str) -> str:
        words = upper_text.split(" ")
        return " ".join(self._word(w, i == 0) for i, w in enumerate(words) if w)


# Tokens that carry no meaning for similarity in this corpus: almost every
# title starts with "Design and implementation of a smart automatic system".
STOPWORDS = set("""
a an and as at by for from in into of on or the to via with without is are be its their this that which can will
design designing designed implement implementation implementing implemented develop development developing
fabrication fabricate prototype prototyping preparation improvement improved advanced proposal case study
system systems based using use used smart automatic automated automation intelligent device devices model
new modern low cost low-cost real time real-time efficient enhanced effective simple
""".split())

TOKEN_RE = re.compile(r"[a-z0-9₂]+")


def stem(tok: str) -> str:
    if len(tok) > 4 and tok.endswith("ies"):
        return tok[:-3] + "y"
    if len(tok) > 3 and tok.endswith("s") and not tok.endswith("ss"):
        return tok[:-1]
    return tok


def tokens(text: str, drop: set[str] | None = None) -> list[str]:
    drop = drop or set()
    out = []
    for t in TOKEN_RE.findall(text.lower()):
        if t in STOPWORDS or t in drop or len(t) < 2 or t.isdigit():
            continue
        out.append(stem(t))
    return out
