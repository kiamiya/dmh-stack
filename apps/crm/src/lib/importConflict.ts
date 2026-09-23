/**
 * S38-3 — politique de conflit à l'import (modèle HubSpot) : que faire quand
 * une ligne du fichier correspond à une fiche déjà existante (même email pour
 * un contact, même nom pour une entreprise) ? Un seul choix pour tout
 * l'import (décision Loïc du 2026-09-23).
 */
export type ImportConflictPolicy = "skip" | "fill_empty" | "overwrite";

export const IMPORT_CONFLICT_POLICY_OPTIONS: Array<{ value: ImportConflictPolicy; label: string; description: string }> = [
  {
    value: "skip",
    label: "Ignorer les fiches existantes",
    description: "Les lignes qui correspondent à une fiche existante ne sont pas importées.",
  },
  {
    value: "fill_empty",
    label: "Compléter les champs vides",
    description: "Les fiches existantes sont complétées, sans jamais écraser une valeur déjà renseignée.",
  },
  {
    value: "overwrite",
    label: "Écraser avec les valeurs du fichier",
    description: "Les valeurs non vides du fichier remplacent celles des fiches existantes.",
  },
];

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * Pure : calcule le patch à appliquer à une fiche existante. Une valeur vide
 * du fichier n'efface jamais une valeur existante, quelle que soit la
 * politique ; `skip` ne produit jamais de patch. Seules les clés réellement
 * modifiées sont retournées (patch vide = rien à écrire).
 */
export function buildConflictPatch<K extends string>(
  existing: Record<K, string | null>,
  incoming: Partial<Record<K, string | null>>,
  policy: ImportConflictPolicy,
): Partial<Record<K, string>> {
  const patch: Partial<Record<K, string>> = {};
  if (policy === "skip") return patch;
  for (const key of Object.keys(incoming) as K[]) {
    const next = incoming[key];
    if (isEmpty(next)) continue;
    const current = existing[key];
    if (policy === "fill_empty" && !isEmpty(current)) continue;
    if (current === next) continue;
    patch[key] = next as string;
  }
  return patch;
}

/** Pure : faut-il écrire la valeur d'un champ personnalisé sur une fiche existante ? */
export function shouldWriteCustomFieldValue(existingValue: unknown, policy: ImportConflictPolicy): boolean {
  if (policy === "skip") return false;
  if (policy === "fill_empty") return isEmpty(existingValue);
  return true;
}
