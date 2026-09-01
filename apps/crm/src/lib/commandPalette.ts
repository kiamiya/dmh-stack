import { matchesSearch } from "./prospectFilters";
import type { ProspectListRow } from "../services/prospects";

/** Pure : les N premiers prospects correspondant à la requête (même logique de correspondance que le filtre de recherche du tableau) — alimente la palette de commandes (cmd+K). */
export function filterPaletteProspects(prospects: ProspectListRow[], query: string, limit = 8): ProspectListRow[] {
  if (!query.trim()) return prospects.slice(0, limit);
  return prospects.filter((p) => matchesSearch(p, query)).slice(0, limit);
}
