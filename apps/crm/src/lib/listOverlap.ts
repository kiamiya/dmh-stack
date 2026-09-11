export interface ListOverlapResult {
  totalA: number;
  totalB: number;
  overlapCount: number;
  onlyInA: number;
  onlyInB: number;
  /** Pourcentage de la liste A qui se retrouve aussi dans B (arrondi, 0 si A est vide). */
  overlapPercentOfA: number;
  /** Pourcentage de la liste B qui se retrouve aussi dans A (arrondi, 0 si B est vide). */
  overlapPercentOfB: number;
}

/**
 * Pure : compare les membres de deux listes (mêmes ids d'entité) — analyse
 * de chevauchement entre segments demandée par le CR du 11/09/2026.
 * Se limite aux listes STATIQUES pour l'instant (membres déjà connus, pas
 * de règles à évaluer) — voir `pages/Lists.tsx`.
 */
export function computeListOverlap(idsA: string[], idsB: string[]): ListOverlapResult {
  const setA = new Set(idsA);
  const setB = new Set(idsB);
  let overlapCount = 0;
  for (const id of setA) {
    if (setB.has(id)) overlapCount++;
  }
  const totalA = setA.size;
  const totalB = setB.size;
  return {
    totalA,
    totalB,
    overlapCount,
    onlyInA: totalA - overlapCount,
    onlyInB: totalB - overlapCount,
    overlapPercentOfA: totalA > 0 ? Math.round((overlapCount / totalA) * 100) : 0,
    overlapPercentOfB: totalB > 0 ? Math.round((overlapCount / totalB) * 100) : 0,
  };
}
