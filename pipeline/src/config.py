"""Load, validate and merge the pipeline configuration.

    config/sources.json                      documents, institutions, publishing flags
    config/programmes.json                   programme catalogue and award levels
    config/shared/*.json                     rules every programme uses
    config/programmes/<programmeId>/*.json   rules for one programme (domains, problems, stopwords)

A project is classified with the shared rules plus its own programme's rules
only, so a civil "load" can never trigger an electrical problem. Problem IDs
share one namespace; a project's own programme's problems are listed first.
Config mistakes stop the build with a message that says what to fix.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


class ConfigError(Exception):
    pass


def _read(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ConfigError(f"Missing config file: {path}") from None
    except json.JSONDecodeError as e:
        raise ConfigError(f"{path} is not valid JSON: {e}") from None


def _optional(path: Path, key: str) -> list:
    return _read(path).get(key, []) if path.exists() else []


@dataclass
class ProgrammeRules:
    domains: list[dict] = field(default_factory=list)
    problems: list[dict] = field(default_factory=list)
    stopwords: list[str] = field(default_factory=list)
    signals: list = field(default_factory=list)  # [regex, weight] pairs for programme inference


@dataclass
class Config:
    sources_cfg: dict
    catalogue: dict
    shared: dict
    programmes: dict[str, ProgrammeRules]
    overrides: dict[str, str] = field(default_factory=dict)  # projectId -> programmeId
    excluded: dict[str, dict] = field(default_factory=dict)  # projectId -> {title, reason}: not a project title

    @property
    def sources(self) -> list[dict]:
        return self.sources_cfg["sources"]

    @property
    def corrections(self) -> dict:
        return self.shared["corrections"]

    @property
    def places(self) -> dict:
        return self.shared["places"]

    def programme(self, pid: str) -> dict:
        return next(p for p in self.catalogue["programmes"] if p["id"] == pid)

    def rules_for(self, pid: str) -> tuple[dict, dict]:
        """(taxonomy, problems) in the shape Enricher expects, for one programme."""
        own = self.programmes.get(pid, ProgrammeRules())
        taxonomy = {
            "categories": self.shared["categories"],
            "domains": own.domains,
            "technologies": [t for t in self.shared["technologies"] if not t["programmeIds"] or pid in t["programmeIds"]],
            "places": self.shared["places"],
            "workTypes": self.shared["workTypes"],
        }
        return taxonomy, {"problems": own.problems + self.shared["problems"]}

    def all_problems(self) -> list[dict]:
        """Every problem once: programme problems (catalogue order), then shared ones."""
        out = []
        for p in self.catalogue["programmes"]:
            out += [{**x, "programmeId": p["id"]} for x in self.programmes[p["id"]].problems]
        return out + self.shared["problems"]

    def all_domains(self) -> list[dict]:
        return [{**d, "programmeId": p["id"]} for p in self.catalogue["programmes"] for d in self.programmes[p["id"]].domains]


def load_config(root: Path) -> Config:
    sources_cfg = _read(root / "sources.json")
    catalogue = _read(root / "programmes.json")
    shared_dir = root / "shared"
    shared = {
        "problems": _read(shared_dir / "problems.json")["problems"],
        "categories": _read(shared_dir / "categories.json")["categories"],
        "technologies": _read(shared_dir / "technologies.json")["technologies"],
        "places": _read(shared_dir / "places.json"),
        "workTypes": _read(shared_dir / "workTypes.json")["workTypes"],
        "corrections": _read(shared_dir / "corrections.json"),
    }
    programmes = {}
    for p in catalogue["programmes"]:
        d = root / "programmes" / p["id"]
        programmes[p["id"]] = ProgrammeRules(
            domains=_optional(d / "domains.json", "domains"),
            problems=_optional(d / "problems.json", "problems"),
            stopwords=_optional(d / "corrections.json", "stopwords"),
            signals=_optional(d / "signals.json", "signals"),
        )
    overrides = _read(root / "programme_overrides.json").get("overrides", {}) if (root / "programme_overrides.json").exists() else {}
    excluded_cfg = _read(root / "excluded_projects.json") if (root / "excluded_projects.json").exists() else {"reasons": {}, "excluded": {}}
    for project_id, e in excluded_cfg["excluded"].items():
        if e.get("reason") not in excluded_cfg["reasons"]:
            raise ConfigError(f"excluded_projects.json, '{project_id}': reason '{e.get('reason')}' is not one of: {', '.join(excluded_cfg['reasons'])}.")
    cfg = Config(sources_cfg, catalogue, shared, programmes, overrides, excluded_cfg["excluded"])
    _validate(cfg, root)
    return cfg


def _unique(kind: str, ids: list[str]) -> None:
    seen, dupes = set(), set()
    for i in ids:
        (dupes if i in seen else seen).add(i)
    if dupes:
        raise ConfigError(f"Duplicate {kind} IDs across config files: {', '.join(sorted(dupes))}. IDs must be unique.")


def _validate(cfg: Config, root: Path) -> None:
    progs = {p["id"]: p for p in cfg.catalogue["programmes"]}
    levels = {lv["id"] for lv in cfg.catalogue["levels"]}
    institutions = {i["id"] for i in cfg.sources_cfg["institutions"]}
    # Public rule: DIT only when the document header names DIT; everything else is "unconfirmed".
    if institutions != {"dit", "unconfirmed"}:
        raise ConfigError("sources.json institutions must be exactly 'dit' and 'unconfirmed'. Record any other named institution in the source's notes.")
    for d in (root / "programmes").iterdir() if (root / "programmes").exists() else []:
        if d.is_dir() and d.name not in progs:
            raise ConfigError(f"Folder config/programmes/{d.name} does not match any programme ID in programmes.json.")

    for s in cfg.sources:
        where = f"sources.json, source '{s['id']}'"
        pid = s.get("programmeId")
        if pid == "infer":
            fb = s.get("fallbackProgrammeId")
            if fb is not None and fb not in progs:
                raise ConfigError(f"{where}: fallbackProgrammeId '{fb}' is not in programmes.json.")
            if s.get("departmentId") is not None or "programmeProvenance" in s:
                raise ConfigError(f"{where}: a source with programmeId 'infer' has no departmentId or programmeProvenance (set them per project).")
        else:
            if pid not in progs:
                raise ConfigError(f"{where}: programmeId '{pid}' is not in programmes.json. Use one of: {', '.join(progs)}, or 'infer'.")
            if s.get("departmentId") != progs[pid]["departmentId"]:
                raise ConfigError(f"{where}: departmentId '{s.get('departmentId')}' does not match programme '{pid}' (expected '{progs[pid]['departmentId']}').")
            if s.get("programmeProvenance") not in ("recorded", "from-source-name"):
                raise ConfigError(f"{where}: programmeProvenance must be 'recorded' or 'from-source-name'.")
        if s.get("levelId") is not None and s["levelId"] not in levels:
            raise ConfigError(f"{where}: levelId '{s.get('levelId')}' is not in programmes.json levels ({', '.join(sorted(levels))}); use null if the document does not state it.")
        if s.get("institutionId") not in institutions:
            raise ConfigError(f"{where}: institutionId '{s.get('institutionId')}' is not listed under institutions.")
        if s.get("year") is not None and s.get("academicYear") is None:
            raise ConfigError(f"{where}: a source with a year needs academicYear too.")
        if s.get("format", "table") not in ("table", "numbered-paragraphs"):
            raise ConfigError(f"{where}: format must be 'table' or 'numbered-paragraphs'.")
    for project_id, pid in cfg.overrides.items():
        if pid not in progs:
            raise ConfigError(f"programme_overrides.json: '{project_id}' -> '{pid}' is not a programme in programmes.json.")

    _unique("problem", [p["id"] for p in cfg.all_problems()])
    _unique("domain", [d["id"] for d in cfg.all_domains()])
    _unique("technology", [t["id"] for t in cfg.shared["technologies"]])
    for t in cfg.shared["technologies"]:
        bad = [x for x in t.get("programmeIds", []) if x not in progs]
        if bad:
            raise ConfigError(f"shared/technologies.json, '{t['id']}': unknown programmeIds {bad}.")
