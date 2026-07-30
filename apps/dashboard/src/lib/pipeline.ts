import type { InteractionType, ProspectStatus } from "@dmh/types";

export interface PipelineColumn {
  key: string;
  label: string;
  statuses: ProspectStatus[];
}

/**
 * Regroupe les 12 `ProspectStatus` en 9 colonnes lisibles pour un client :
 * les 3 statuts internes d'enrichissement (`to_enrich`/`enriched_pappers`/
 * `enriched_contact`) sont fusionnés en "En préparation" (le client n'a
 * pas besoin de voir la plomberie interne), et `lost`/`not_interested`
 * fusionnés en "Perdu".
 */
export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { key: "preparing", label: "En préparation", statuses: ["to_enrich", "enriched_pappers", "enriched_contact"] },
  { key: "ready", label: "Prêt", statuses: ["ready"] },
  { key: "in_sequence", label: "En séquence", statuses: ["in_sequence"] },
  { key: "replied", label: "A répondu", statuses: ["replied"] },
  { key: "meeting_booked", label: "RDV programmé", statuses: ["meeting_booked"] },
  { key: "qualified", label: "Qualifié", statuses: ["qualified"] },
  { key: "proposal_sent", label: "Proposition envoyée", statuses: ["proposal_sent"] },
  { key: "won", label: "Gagné", statuses: ["won"] },
  { key: "lost", label: "Perdu", statuses: ["lost", "not_interested"] },
];

export interface ProspectLike {
  status: ProspectStatus;
}

export interface PipelineColumnGroup<T extends ProspectLike> {
  column: PipelineColumn;
  prospects: T[];
}

/** Pure : répartit une liste de prospects dans les colonnes `PIPELINE_COLUMNS`. */
export function groupProspectsByColumn<T extends ProspectLike>(
  prospects: T[],
): Array<PipelineColumnGroup<T>> {
  return PIPELINE_COLUMNS.map((column) => ({
    column,
    prospects: prospects.filter((p) => (column.statuses as ProspectStatus[]).includes(p.status)),
  }));
}

export interface InteractionLike {
  type: InteractionType;
}

export interface OverviewStats {
  totalProspects: number;
  inActiveSequence: number;
  /** % arrondi à 1 décimale, ou `null` si aucun email envoyé (évite une division par zéro). */
  replyRate: number | null;
  meetingsBooked: number;
  won: number;
}

/**
 * Pure : calcule les métriques de la vue d'ensemble à partir des données
 * déjà en base. `replyRate` compte les interactions `email_replied` /
 * `email_sent` (pas le nombre de prospects distincts ayant répondu) — une
 * approximation simple assumée pour ce MVP, cohérente avec le critère de
 * succès Phase 1 "taux d'ouverture > 40%" (brief §1.5).
 */
export function computeOverviewStats<T extends ProspectLike>(
  prospects: T[],
  interactions: InteractionLike[],
): OverviewStats {
  const emailsSent = interactions.filter((i) => i.type === "email_sent").length;
  const emailsReplied = interactions.filter((i) => i.type === "email_replied").length;

  return {
    totalProspects: prospects.length,
    inActiveSequence: prospects.filter((p) => p.status === "in_sequence").length,
    replyRate: emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 1000) / 10 : null,
    meetingsBooked: prospects.filter((p) => p.status === "meeting_booked").length,
    won: prospects.filter((p) => p.status === "won").length,
  };
}
