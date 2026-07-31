import type { BadgeProps } from "../components/ui/badge";

/** Couleur de badge par tranche de score IA (1-10, brief §1.3.5). */
export function getScoreColor(score: number | null): NonNullable<BadgeProps["variant"]> {
  if (score === null) return "default";
  if (score < 4) return "red";
  if (score <= 6) return "yellow";
  return "green";
}

export function formatScore(score: number | null): string {
  return score === null ? "—" : `${score}/10`;
}
