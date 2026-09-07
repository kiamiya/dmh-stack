import type { ListEntityType, ListOverviewRow } from "./listsOverview";

export interface ListsFilters {
  clientId?: string;
  entityType?: ListEntityType | "";
  mode?: "static" | "dynamic" | "";
}

/** Pure : filtre les lignes /segments par client/type d'entité/mode — remplace les chips fabriqués du mockup par des filtres réels sur des champs déjà présents. */
export function filterListRows(rows: ListOverviewRow[], filters: ListsFilters): ListOverviewRow[] {
  return rows.filter((row) => {
    if (filters.clientId && row.clientId !== filters.clientId) return false;
    if (filters.entityType && row.entityType !== filters.entityType) return false;
    if (filters.mode && row.mode !== filters.mode) return false;
    return true;
  });
}
