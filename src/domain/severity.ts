import type { FindingStatus, Severity } from "./types";

const RANK: Record<Severity, number> = { info: 0, caution: 1, high: 2, contraindicated: 3 };

export function severityRank(severity: Severity): number {
  return RANK[severity];
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return RANK[a] >= RANK[b] ? a : b;
}

/** One level up, capped at "high". Only data may say "contraindicated". */
export function escalate(severity: Severity): Severity {
  if (severity === "info") return "caution";
  if (severity === "caution") return "high";
  return severity;
}

export function severityToStatus(severity: Severity): FindingStatus {
  if (severity === "info") return "pass";
  if (severity === "caution") return "caution";
  return "high";
}
