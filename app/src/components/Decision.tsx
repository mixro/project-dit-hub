import type { Decision } from "../data/types";

// Shape + text, never colour alone, so status reads in sunlight and for colour-blind users.
const META: Record<Decision, { icon: string; label: string; tone: string }> = {
  accepted: { icon: "✓", label: "Accepted", tone: "ok" },
  "accepted-conditional": { icon: "◐", label: "Accepted with conditions", tone: "warn" },
  rejected: { icon: "✕", label: "Rejected", tone: "bad" },
  pending: { icon: "…", label: "Pending", tone: "warn" },
  "not-presented": { icon: "–", label: "Not presented", tone: "neutral" },
  unknown: { icon: "○", label: "Decision not recorded", tone: "neutral" },
};

export function DecisionBadge({ decision, inferred }: { decision: Decision; inferred?: boolean }) {
  const m = META[decision] ?? META.unknown;
  return (
    <span className={`decision tone-${m.tone}`} title={inferred ? "Inferred from the document, not stated in it" : undefined}>
      <span aria-hidden="true">{m.icon}</span> {m.label}{inferred && decision !== "unknown" ? " (inferred)" : ""}
    </span>
  );
}

export const decisionLabel = (d: Decision) => (META[d] ?? META.unknown).label;
