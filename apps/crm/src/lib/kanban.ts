import type { ProspectStatus } from "@dmh/types";
import { getStatusLabel } from "./status";

export interface KanbanColumn {
  status: ProspectStatus;
  label: string;
}

/**
 * Colonnes du Kanban "Pipeline de prospection" — un sous-ensemble des 12
 * statuts (voir `ALL_PROSPECT_STATUSES`, toujours utilisé tel quel pour les
 * filtres/l'export/le changement de statut en masse de la vue Liste).
 * Décision de la revue dev du 08/09/2026 (CR "Structure des pipelines") :
 * ce pipeline s'arrête au rendez-vous pris — `qualified`/`proposal_sent`/
 * `won`/`lost` appartiennent au pipeline Opportunités (`pipeline_stages`),
 * pas à celui-ci. Un prospect dont Smartlead positionnerait le statut sur
 * l'une de ces 4 valeurs (`mapLeadCategoryToProspectStatus`) reste visible
 * dans la vue Liste (badge, filtres, export) — juste plus dans ce Kanban.
 */
const PROSPECTION_KANBAN_STATUSES: ProspectStatus[] = [
  "to_enrich",
  "enriched_pappers",
  "enriched_contact",
  "ready",
  "in_sequence",
  "replied",
  "meeting_booked",
  "not_interested",
];

export const KANBAN_COLUMNS: KanbanColumn[] = PROSPECTION_KANBAN_STATUSES.map((status) => ({
  status,
  label: getStatusLabel(status),
}));

export interface KanbanProspectLike {
  status: ProspectStatus;
}

export interface KanbanColumnGroup<T extends KanbanProspectLike> {
  column: KanbanColumn;
  prospects: T[];
}

/** Pure : répartit une liste de prospects dans les 12 colonnes `KANBAN_COLUMNS`. */
export function groupProspectsByStatus<T extends KanbanProspectLike>(
  prospects: T[],
): Array<KanbanColumnGroup<T>> {
  return KANBAN_COLUMNS.map((column) => ({
    column,
    prospects: prospects.filter((p) => p.status === column.status),
  }));
}
