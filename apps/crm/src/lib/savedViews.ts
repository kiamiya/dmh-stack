import type { ProspectFilters } from "./prospectFilters";

const STORAGE_KEY = "dmh-crm-saved-views";

export interface SavedView {
  id: string;
  name: string;
  filters: ProspectFilters;
  createdAt: string;
}

/** Pure (storage en paramètre, testable sans DOM) : liste des vues sauvegardées, `[]` si absentes/corrompues. */
export function loadSavedViews(storage: Pick<Storage, "getItem">): SavedView[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedViews(storage: Pick<Storage, "setItem">, views: SavedView[]): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // localStorage indisponible — non bloquant, la vue reste juste non persistée.
  }
}

/** Pure : construit une nouvelle vue à partir des filtres actuels (id/date générés en dehors de cette fonction pure — voir le composant appelant). */
export function createSavedView(id: string, name: string, filters: ProspectFilters, createdAt: string): SavedView {
  return { id, name: name.trim(), filters, createdAt };
}

export function removeSavedView(views: SavedView[], id: string): SavedView[] {
  return views.filter((v) => v.id !== id);
}
