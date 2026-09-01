import type { ProspectStatus } from "@dmh/types";
import { ALL_PROSPECT_STATUSES, getStatusLabel } from "./status";

export interface KanbanColumn {
  status: ProspectStatus;
  label: string;
}

/**
 * Une colonne par statut (contrairement à `apps/dashboard/src/lib/pipeline.ts`
 * qui fusionne les 3 statuts d'enrichissement et won/lost pour la vue
 * client) — le staff interne a besoin de voir le pipeline complet, sans
 * simplification.
 */
export const KANBAN_COLUMNS: KanbanColumn[] = ALL_PROSPECT_STATUSES.map((status) => ({
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
