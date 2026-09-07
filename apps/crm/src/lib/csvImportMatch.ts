export interface CsvMatchResult {
  matchedIds: string[];
  unmatchedCount: number;
}

/**
 * Pure : associe les lignes d'un CSV importé aux entités déjà existantes,
 * via une colonne du fichier et un champ d'identification réel (email pour
 * un contact, SIREN ou nom pour une entreprise) — comparaison insensible à
 * la casse/aux espaces. Les lignes sans correspondance ne créent JAMAIS
 * d'entité, elles sont seulement comptées : on n'importe une liste que sur
 * des entités déjà réelles, jamais fabriquées depuis un fichier mal formé.
 */
export function matchCsvRows(
  rows: Array<Record<string, string>>,
  column: string,
  entities: Array<{ id: string; key: string | null }>,
): CsvMatchResult {
  const idByKey = new Map<string, string>();
  for (const entity of entities) {
    if (entity.key) idByKey.set(entity.key.trim().toLowerCase(), entity.id);
  }

  const matchedIds = new Set<string>();
  let unmatchedCount = 0;
  for (const row of rows) {
    const key = row[column]?.trim().toLowerCase();
    const id = key ? idByKey.get(key) : undefined;
    if (id) matchedIds.add(id);
    else unmatchedCount++;
  }

  return { matchedIds: Array.from(matchedIds), unmatchedCount };
}
