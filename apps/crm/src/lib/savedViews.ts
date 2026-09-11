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

/** Pure : renomme une vue existante (aucun effet si l'id est introuvable). */
export function renameSavedView(views: SavedView[], id: string, name: string): SavedView[] {
  return views.map((v) => (v.id === id ? { ...v, name: name.trim() } : v));
}

/** Pure : duplique une vue existante sous un nouveau nom/id (id/date fournis par l'appelant, comme `createSavedView`). Retourne `views` inchangé si l'id source est introuvable. */
export function duplicateSavedView(views: SavedView[], sourceId: string, newId: string, createdAt: string): SavedView[] {
  const source = views.find((v) => v.id === sourceId);
  if (!source) return views;
  const copy: SavedView = { id: newId, name: `${source.name} (copie)`, filters: source.filters, createdAt };
  return [...views, copy];
}
