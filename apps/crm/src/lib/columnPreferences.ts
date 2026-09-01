const STORAGE_KEY = "dmh-crm-prospects-columns";

export interface ColumnPreferences {
  order: string[];
  hidden: string[];
}

/** Pure (prend le storage en paramètre, testable sans DOM) : lit les préférences sauvegardées, ou `null` si absentes/corrompues. */
export function loadColumnPreferences(storage: Pick<Storage, "getItem">): ColumnPreferences | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.order) || !Array.isArray(parsed.hidden)) return null;
    return { order: parsed.order, hidden: parsed.hidden };
  } catch {
    return null;
  }
}

export function saveColumnPreferences(storage: Pick<Storage, "setItem">, prefs: ColumnPreferences): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage indisponible (navigation privée, quota...) — préférence non persistée, pas bloquant.
  }
}

/** Applique l'ordre sauvegardé aux colonnes connues, ajoute en fin toute colonne nouvelle absente de la préférence. */
export function applyColumnOrder(allColumnIds: string[], savedOrder: string[]): string[] {
  const known = savedOrder.filter((id) => allColumnIds.includes(id));
  const missing = allColumnIds.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

/** Déplace un id d'une position dans un tableau ordonné (`direction`: -1 monte, +1 descend) — no-op aux bornes. */
export function moveColumn(order: string[], id: string, direction: -1 | 1): string[] {
  const index = order.indexOf(id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= order.length) return order;

  const next = order.slice();
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
