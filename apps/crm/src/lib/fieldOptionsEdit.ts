/**
 * S38-7 (CR du 17/09 — Delphine : "accéder à un champ existant, ex. grille de
 * qualification, pour modifier ses options, ajouter ou supprimer des
 * valeurs"). Édition d'une liste d'options avec suivi des renommages, pour
 * reporter les changements sur les valeurs déjà saisies (sinon une fiche
 * garderait "Offre 1" alors que l'option s'appelle désormais autrement).
 */
export interface OptionDraft {
  /** Option d'origine (null = ajoutée pendant l'édition). */
  original: string | null;
  value: string;
}

export interface OptionEditSummary {
  options: string[];
  /** ancienne valeur → nouvelle valeur */
  renames: Record<string, string>;
  removed: string[];
}

export function draftsFromOptions(options: string[] | null): OptionDraft[] {
  return (options ?? []).map((o) => ({ original: o, value: o }));
}

/** Pure : message d'erreur FR, ou null si la liste est valide (au moins une option, pas de vide, pas de doublon insensible à la casse). */
export function validateOptionDrafts(drafts: OptionDraft[]): string | null {
  const values = drafts.map((d) => d.value.trim());
  if (values.length === 0) return "Il faut au moins une option.";
  if (values.some((v) => v === "")) return "Une option ne peut pas être vide.";
  const seen = new Set<string>();
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) return `Option en double : "${v}".`;
    seen.add(key);
  }
  return null;
}

/** Pure : options finales, renommages et suppressions à partir des brouillons et des options d'origine. */
export function summarizeOptionEdits(originalOptions: string[] | null, drafts: OptionDraft[]): OptionEditSummary {
  const renames: Record<string, string> = {};
  const kept = new Set<string>();
  for (const d of drafts) {
    if (d.original === null) continue;
    kept.add(d.original);
    const next = d.value.trim();
    if (next !== d.original) renames[d.original] = next;
  }
  return {
    options: drafts.map((d) => d.value.trim()),
    renames,
    removed: (originalOptions ?? []).filter((o) => !kept.has(o)),
  };
}

/**
 * Pure : nouvelle valeur d'un champ liste (chaîne) ou choix multiples
 * (tableau) après renommages/suppressions. Une option supprimée disparaît de
 * la valeur (liste → null) ; les autres types de valeur sont laissés tels quels.
 */
export function migrateFieldValue(
  value: unknown,
  renames: Record<string, string>,
  removed: string[],
): { changed: boolean; value: unknown } {
  const removedSet = new Set(removed);
  if (typeof value === "string") {
    if (removedSet.has(value)) return { changed: true, value: null };
    if (renames[value] !== undefined) return { changed: true, value: renames[value] };
    return { changed: false, value };
  }
  if (Array.isArray(value)) {
    const next: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") continue;
      if (removedSet.has(item)) continue;
      const renamed = renames[item] ?? item;
      if (!next.includes(renamed)) next.push(renamed);
    }
    const changed = next.length !== value.length || next.some((v, i) => v !== value[i]);
    return { changed, value: next };
  }
  return { changed: false, value };
}

export function hasOptionChanges(summary: OptionEditSummary, originalOptions: string[] | null): boolean {
  const original = originalOptions ?? [];
  return (
    summary.options.length !== original.length ||
    summary.options.some((o, i) => o !== original[i]) ||
    Object.keys(summary.renames).length > 0 ||
    summary.removed.length > 0
  );
}
