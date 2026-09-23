/**
 * Pure : retourne une copie des lignes CSV avec une cellule corrigée par
 * l'utilisateur (S38-2 — correction directe d'une valeur en erreur dans
 * l'écran d'import). Les autres lignes gardent leur référence, pour que le
 * plan recalculé reste stable ; un index hors bornes ne modifie rien.
 */
export function applyCellCorrection(
  rows: Array<Record<string, string>>,
  rowIndex: number,
  column: string,
  value: string,
): Array<Record<string, string>> {
  if (rowIndex < 0 || rowIndex >= rows.length) return rows;
  return rows.map((row, i) => (i === rowIndex ? { ...row, [column]: value } : row));
}
