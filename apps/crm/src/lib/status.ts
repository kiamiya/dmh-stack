import type { ProspectStatus } from "@dmh/types";
import type { BadgeProps } from "../components/ui/badge";

/** Libellés FR des 12 statuts du pipeline (brief §1.3.2, table `prospects`). */
const STATUS_LABELS: Record<ProspectStatus, string> = {
  to_enrich: "À enrichir",
  enriched_pappers: "Enrichi (Pappers)",
  enriched_contact: "Enrichi (contact)",
  ready: "Prêt",
  in_sequence: "En séquence",
  replied: "A répondu",
  meeting_booked: "RDV pris",
  qualified: "Qualifié",
  proposal_sent: "Proposition envoyée",
  won: "Gagné",
  lost: "Perdu",
  not_interested: "Pas intéressé",
};

/** Couleur de badge par statut — regroupée par phase du pipeline. */
const STATUS_COLORS: Record<ProspectStatus, NonNullable<BadgeProps["variant"]>> = {
  to_enrich: "default",
  enriched_pappers: "default",
  enriched_contact: "default",
  ready: "blue",
  in_sequence: "blue",
  replied: "purple",
  meeting_booked: "purple",
  qualified: "purple",
  proposal_sent: "yellow",
  won: "green",
  lost: "red",
  not_interested: "red",
};

export const ALL_PROSPECT_STATUSES: ProspectStatus[] = Object.keys(STATUS_LABELS) as ProspectStatus[];

export function getStatusLabel(status: ProspectStatus): string {
  return STATUS_LABELS[status];
}

export function getStatusColor(status: ProspectStatus): NonNullable<BadgeProps["variant"]> {
  return STATUS_COLORS[status];
}
