import type { CustomFieldType } from "@dmh/types";

export type ImportColumnDecision =
  | { column: string; action: "ignore" }
  | { column: string; action: "map_existing"; fieldDefinitionId: string; fieldKey: string }
  | {
      column: string;
      action: "create_new";
      label: string;
      fieldType: CustomFieldType;
      fieldKey: string;
      selectOptions?: string[];
    };

export interface FieldDefinitionInsertDraft {
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  selectOptions?: string[] | null;
}

/**
 * Pure : échantillonne au plus `limit` valeurs non vides et dédupliquées
 * d'une colonne, tronquées à 80 caractères, en ne scannant que les
 * `maxRowsScanned` premières lignes (un CSV client peut avoir des milliers
 * de lignes — inutile de tout parcourir pour obtenir un échantillon
 * représentatif, et ça limite la donnée réelle envoyée à l'API Claude).
 */
export function sampleColumnValues(
  rows: Array<Record<string, string>>,
  column: string,
  limit = 5,
  maxRowsScanned = 200,
): string[] {
  const seen = new Set<string>();
  const samples: string[] = [];

  for (const row of rows.slice(0, maxRowsScanned)) {
    if (samples.length >= limit) break;
    const raw = (row[column] ?? "").trim();
    if (!raw) continue;
    const truncated = raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
    if (seen.has(truncated)) continue;
    seen.add(truncated);
    samples.push(truncated);
  }

  return samples;
}

/** Pure : pour une ligne CSV, extrait la valeur brute (trim, ou `null` si vide) pour chaque colonne non ignorée. */
export function extractCustomFieldRawValues(
  row: Record<string, string>,
  decisions: ImportColumnDecision[],
): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  for (const decision of decisions) {
    if (decision.action === "ignore") continue;
    const raw = (row[decision.column] ?? "").trim();
    values[decision.column] = raw || null;
  }
  return values;
}

/** Pure : construit les définitions à créer pour les décisions "create_new", dédupliquées par `fieldKey`. */
export function buildFieldDefinitionInsertsForNewFields(
  decisions: ImportColumnDecision[],
): FieldDefinitionInsertDraft[] {
  const byKey = new Map<string, FieldDefinitionInsertDraft>();
  for (const decision of decisions) {
    if (decision.action !== "create_new") continue;
    if (byKey.has(decision.fieldKey)) continue;
    byKey.set(decision.fieldKey, {
      fieldKey: decision.fieldKey,
      label: decision.label,
      fieldType: decision.fieldType,
      selectOptions: decision.selectOptions ?? null,
    });
  }
  return Array.from(byKey.values());
}

/**
 * Pure : détecte les conflits entre décisions avant de lancer l'import —
 * deux colonnes ne peuvent pas cibler le même champ existant, ni créer
 * deux fois le même `fieldKey`. Retourne un message d'erreur en français,
 * ou `null` si tout est cohérent.
 */
export function validateColumnDecisions(decisions: ImportColumnDecision[]): string | null {
  const usedExistingFieldIds = new Map<string, string>();
  const usedNewFieldKeys = new Map<string, string>();

  for (const decision of decisions) {
    if (decision.action === "map_existing") {
      const previousColumn = usedExistingFieldIds.get(decision.fieldDefinitionId);
      if (previousColumn) {
        return `Les colonnes "${previousColumn}" et "${decision.column}" ciblent le même champ personnalisé — choisis un champ différent pour l'une des deux.`;
      }
      usedExistingFieldIds.set(decision.fieldDefinitionId, decision.column);
    } else if (decision.action === "create_new") {
      const previousColumn = usedNewFieldKeys.get(decision.fieldKey);
      if (previousColumn) {
        return `Les colonnes "${previousColumn}" et "${decision.column}" créeraient un champ personnalisé avec la même clé ("${decision.fieldKey}") — modifie le libellé de l'une des deux.`;
      }
      usedNewFieldKeys.set(decision.fieldKey, decision.column);
    }
  }

  return null;
}
