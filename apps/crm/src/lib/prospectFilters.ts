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

/**
 * Pure : sérialise les filtres actifs dans des paramètres d'URL — condition
 * technique pour qu'un lien copié ("Partager le lien de la vue", demande du
 * CR du 11/09/2026) reproduise exactement l'état de la vue chez qui l'ouvre.
 * Un critère vide/null n'ajoute aucun paramètre (URL la plus courte
 * possible pour une vue non filtrée).
 */
export function filtersToSearchParams(filters: ProspectFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  for (const status of filters.statuses) params.append("status", status);
  if (filters.scoreMin !== null) params.set("scoreMin", String(filters.scoreMin));
  if (filters.scoreMax !== null) params.set("scoreMax", String(filters.scoreMax));
  if (filters.nafLabel) params.set("naf", filters.nafLabel);
  if (filters.clientId) params.set("client", filters.clientId);
  return params;
}

/** Pure : reconstruit des filtres à partir de paramètres d'URL (symétrique de `filtersToSearchParams`) — clé absente = valeur vide/nulle, jamais une erreur. */
export function searchParamsToFilters(params: URLSearchParams): ProspectFilters {
  const scoreMinRaw = params.get("scoreMin");
  const scoreMaxRaw = params.get("scoreMax");
  return {
    search: params.get("q") ?? "",
    statuses: params.getAll("status") as ProspectFilters["statuses"],
    scoreMin: scoreMinRaw !== null && scoreMinRaw !== "" ? Number(scoreMinRaw) : null,
    scoreMax: scoreMaxRaw !== null && scoreMaxRaw !== "" ? Number(scoreMaxRaw) : null,
    nafLabel: params.get("naf"),
    clientId: params.get("client"),
  };
}

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
