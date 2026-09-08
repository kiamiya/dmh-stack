import type { ListEntityType, ListOverviewRow } from "./listsOverview";

export interface ListsFilters {
  clientId?: string;
  entityType?: ListEntityType | "";
  mode?: "static" | "dynamic" | "";
  /** Ids de dossiers à inclure (le dossier sélectionné + ses enfants directs, cf. `listsUnderFolder`) — absent ou vide = pas de filtre par dossier. */
  folderIds?: string[];
}

/** Pure : filtre les lignes /segments par client/type d'entité/mode/dossier — remplace les chips fabriqués du mockup par des filtres réels sur des champs déjà présents. */
export function filterListRows(rows: ListOverviewRow[], filters: ListsFilters): ListOverviewRow[] {
  return rows.filter((row) => {
    if (filters.clientId && row.clientId !== filters.clientId) return false;
    if (filters.entityType && row.entityType !== filters.entityType) return false;
    if (filters.mode && row.mode !== filters.mode) return false;
    if (filters.folderIds && filters.folderIds.length > 0 && (!row.folderId || !filters.folderIds.includes(row.folderId))) return false;
    return true;
  });
}
