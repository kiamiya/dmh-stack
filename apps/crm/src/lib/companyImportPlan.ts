export interface CompanyImportRow {
  name: string;
  city: string | null;
  website: string | null;
}

export interface CompanyImportPlanItem {
  /** Numéro de ligne dans le fichier CSV (en-tête = ligne 1). */
  csvLine: number;
  data: CompanyImportRow;
}

export interface CompanyImportSkipped {
  csvLine: number;
  reason: string;
}

export interface CompanyImportPlan {
  toCreate: CompanyImportPlanItem[];
  skipped: CompanyImportSkipped[];
}

export interface CompanyImportMapping {
  name: string;
  city?: string;
  website?: string;
}

/**
 * Pure : valide et déduplique les lignes d'un CSV avant import (voir
 * `services/entityImport.ts` pour l'exécution). Une ligne sans nom est
 * rejetée. Une entreprise déjà existante pour ce client (en base ou déjà vue
 * plus tôt dans le même fichier), comparée sans tenir compte de la casse,
 * n'est jamais recréée — signalée comme ignorée, pas comme une erreur.
 */
export function planCompanyImport(
  rows: Array<Record<string, string>>,
  mapping: CompanyImportMapping,
  existingNames: Set<string>,
): CompanyImportPlan {
  const toCreate: CompanyImportPlanItem[] = [];
  const skipped: CompanyImportSkipped[] = [];
  const seenNames = new Set(existingNames);

  rows.forEach((row, index) => {
    const csvLine = index + 2;
    const name = (row[mapping.name] ?? "").trim();

    if (!name) {
      skipped.push({ csvLine, reason: "Nom d'entreprise manquant" });
      return;
    }

    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      skipped.push({ csvLine, reason: `Entreprise déjà existante : "${name}"` });
      return;
    }
    seenNames.add(key);

    toCreate.push({
      csvLine,
      data: {
        name,
        city: mapping.city ? row[mapping.city]?.trim() || null : null,
        website: mapping.website ? row[mapping.website]?.trim() || null : null,
      },
    });
  });

  return { toCreate, skipped };
}
