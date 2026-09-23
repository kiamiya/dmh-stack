import type { ImportRowError } from "../services/entityImport";

const MAX_LINES_LISTED = 10;

/**
 * Pure : résume les erreurs d'écriture en base d'un import CSV, regroupées
 * par message (une erreur systémique — ex. trigger cassé — produit le même
 * message sur chaque ligne : on l'affiche une seule fois avec les lignes
 * concernées, au lieu d'un simple compteur qui masquait la cause, cf.
 * S38-1). Retourne `null` s'il n'y a aucune erreur.
 */
export function summarizeImportErrors(errors: ImportRowError[]): string | null {
  if (errors.length === 0) return null;

  const linesByMessage = new Map<string, number[]>();
  for (const e of errors) {
    const lines = linesByMessage.get(e.error) ?? [];
    lines.push(e.csvLine);
    linesByMessage.set(e.error, lines);
  }

  const parts = [...linesByMessage.entries()].map(([message, lines]) => {
    const listed = lines.slice(0, MAX_LINES_LISTED).join(", ");
    const more = lines.length > MAX_LINES_LISTED ? ` et ${lines.length - MAX_LINES_LISTED} autre(s)` : "";
    return `« ${message} » (ligne${lines.length > 1 ? "s" : ""} ${listed}${more})`;
  });

  return `${errors.length} ligne(s) en erreur lors de l'écriture : ${parts.join(" ; ")}`;
}

/** Pure : texte du toast de fin d'import — distingue les lignes écartées à la validation des lignes en erreur en base. */
export function formatImportToast(createdParts: string[], skippedCount: number, errorCount: number): string {
  const parts = [...createdParts];
  if (skippedCount > 0) parts.push(`${skippedCount} ligne(s) ignorée(s)`);
  if (errorCount > 0) parts.push(`${errorCount} ligne(s) en erreur`);
  return parts.join(", ") + ".";
}
