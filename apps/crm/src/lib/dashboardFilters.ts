export interface DashboardFilters {
  ownerId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sector: string | null;
  dealStatus: string | null;
}

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  ownerId: null,
  dateFrom: null,
  dateTo: null,
  sector: null,
  dealStatus: null,
};

/**
 * Pure : une entité est dans la plage si sa date tombe entre `dateFrom`
 * et `dateTo` (bornes inclusives, `dateTo` inclut toute la journée) —
 * `null`/absent des deux côtés = pas de contrainte. Une entité sans date
 * (`isoDate` null) est exclue dès qu'une borne est active (on ne peut
 * pas confirmer qu'elle est dans la fenêtre).
 */
export function isWithinDateRange(isoDate: string | null, filters: Pick<DashboardFilters, "dateFrom" | "dateTo">): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true;
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  if (filters.dateFrom && time < new Date(filters.dateFrom).getTime()) return false;
  if (filters.dateTo && time > new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
  return true;
}

export function matchesOwner(assignedTo: string | null, filters: Pick<DashboardFilters, "ownerId">): boolean {
  if (!filters.ownerId) return true;
  return assignedTo === filters.ownerId;
}

export function matchesSector(nafLabel: string | null, filters: Pick<DashboardFilters, "sector">): boolean {
  if (!filters.sector) return true;
  return nafLabel === filters.sector;
}

export function matchesDealStatus(status: string | null, filters: Pick<DashboardFilters, "dealStatus">): boolean {
  if (!filters.dealStatus) return true;
  return status === filters.dealStatus;
}

/**
 * Filtre générique (Propriétaire + Plage de dates + Secteur) appliqué
 * aux tableaux bruts du Dashboard, AVANT le calcul des stats — chaque
 * bloc existant continue de consommer le résultat sans changer sa
 * propre logique (correction Claude Design, filtre "rapide" du
 * mockup). `getSector` est optionnel : les entités sans secteur
 * connu (deals) ignorent ce critère plutôt que d'être exclues à tort.
 */
export function filterByOwnerAndDate<T>(
  rows: T[],
  filters: DashboardFilters,
  getOwner: (row: T) => string | null,
  getDate: (row: T) => string | null,
  getSector?: (row: T) => string | null,
): T[] {
  return rows.filter(
    (row) =>
      matchesOwner(getOwner(row), filters) &&
      isWithinDateRange(getDate(row), filters) &&
      (!getSector || matchesSector(getSector(row), filters)),
  );
}
