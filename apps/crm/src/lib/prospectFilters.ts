import type { ProspectStatus } from "@dmh/types";
import type { ProspectListRow } from "../services/prospects";

export interface ProspectFilters {
  search: string;
  statuses: ProspectStatus[];
  scoreMin: number | null;
  scoreMax: number | null;
  nafLabel: string | null;
  clientId: string | null;
}

export const EMPTY_PROSPECT_FILTERS: ProspectFilters = {
  search: "",
  statuses: [],
  scoreMin: null,
  scoreMax: null,
  nafLabel: null,
  clientId: null,
};

export function matchesSearch(prospect: ProspectListRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [
    prospect.companies?.name,
    prospect.contacts?.first_name,
    prospect.contacts?.last_name,
    prospect.contacts?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Pure : combine tous les filtres (recherche + statuts + score + secteur + client) — chaque critère vide/null est ignoré. */
export function filterProspects(prospects: ProspectListRow[], filters: ProspectFilters): ProspectListRow[] {
  return prospects.filter((p) => {
    if (!matchesSearch(p, filters.search)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;

    const score = p.companies?.ai_score ?? null;
    if (filters.scoreMin !== null && (score === null || score < filters.scoreMin)) return false;
    if (filters.scoreMax !== null && (score === null || score > filters.scoreMax)) return false;

    if (filters.nafLabel && p.companies?.naf_label !== filters.nafLabel) return false;
    if (filters.clientId && p.client_id !== filters.clientId) return false;

    return true;
  });
}

/** Secteurs NAF distincts présents dans le jeu de prospects, triés — alimente le filtre secteur. */
export function extractDistinctNafLabels(prospects: ProspectListRow[]): string[] {
  const labels = new Set<string>();
  for (const p of prospects) {
    if (p.companies?.naf_label) labels.add(p.companies.naf_label);
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b));
}

/** Clients DMH distincts (id + nom) présents dans le jeu de prospects — alimente le filtre client. */
export function extractDistinctClients(prospects: ProspectListRow[]): Array<{ id: string; name: string }> {
  const byId = new Map<string, string>();
  for (const p of prospects) {
    if (p.dmh_clients) byId.set(p.dmh_clients.id, p.dmh_clients.name);
  }
  return Array.from(byId.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
