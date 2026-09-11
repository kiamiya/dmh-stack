export interface SavedView<F> {
  id: string;
  name: string;
  filters: F;
  createdAt: string;
}

/**
 * Générique sur le type de filtres (`F`) et paramétré par clé de
 * stockage (correction Claude Design — le même mécanisme de "vues
 * enregistrées" est requis sur Prospects, Segments, Tâches, Pipeline,
 * chacun avec sa propre forme de filtres et sa propre clé localStorage,
 * pas seulement `ProspectFilters`). Storage en paramètre (testable sans
 * DOM), comme avant.
 */
export function loadSavedViews<F>(storage: Pick<Storage, "getItem">, storageKey: string): SavedView<F>[] {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedViews<F>(storage: Pick<Storage, "setItem">, storageKey: string, views: SavedView<F>[]): void {
  try {
    storage.setItem(storageKey, JSON.stringify(views));
  } catch {
    // localStorage indisponible — non bloquant, la vue reste juste non persistée.
  }
}

/** Pure : construit une nouvelle vue à partir des filtres actuels (id/date générés en dehors de cette fonction pure — voir le composant appelant). */
export function createSavedView<F>(id: string, name: string, filters: F, createdAt: string): SavedView<F> {
  return { id, name: name.trim(), filters, createdAt };
}

export function removeSavedView<F>(views: SavedView<F>[], id: string): SavedView<F>[] {
  return views.filter((v) => v.id !== id);
}

/** Pure : renomme une vue existante (aucun effet si l'id est introuvable). */
export function renameSavedView<F>(views: SavedView<F>[], id: string, name: string): SavedView<F>[] {
  return views.map((v) => (v.id === id ? { ...v, name: name.trim() } : v));
}

/** Pure : duplique une vue existante sous un nouveau nom/id (id/date fournis par l'appelant, comme `createSavedView`). Retourne `views` inchangé si l'id source est introuvable. */
export function duplicateSavedView<F>(views: SavedView<F>[], sourceId: string, newId: string, createdAt: string): SavedView<F>[] {
  const source = views.find((v) => v.id === sourceId);
  if (!source) return views;
  const copy: SavedView<F> = { id: newId, name: `${source.name} (copie)`, filters: source.filters, createdAt };
  return [...views, copy];
}
