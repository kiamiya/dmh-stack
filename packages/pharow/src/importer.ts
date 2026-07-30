import { mapPharowRow } from "./mapper.js";
import type { CompanyInsert, ContactInsert } from "./mapper.js";
import type { PharowRow } from "./csv.js";

/**
 * Opérations DB injectées, plutôt qu'un appel direct à supabase-js — permet
 * de tester toute la logique d'orchestration (dédup entreprise, comptage du
 * résumé, gestion d'erreur ligne par ligne) avec des fakes en mémoire, sans
 * vraie base. `scripts/import-pharow.ts` fournit l'implémentation réelle.
 */
export interface ImportDeps {
  findCompanyByName(clientId: string, name: string): Promise<{ id: string } | null>;
  insertCompany(clientId: string, company: CompanyInsert): Promise<{ id: string }>;
  insertContact(clientId: string, companyId: string, contact: ContactInsert): Promise<{ id: string }>;
  insertProspect(clientId: string, contactId: string, companyId: string): Promise<{ id: string }>;
}

export interface ImportRowError {
  /** Numéro de ligne dans le fichier CSV (en-tête = ligne 1). */
  row: number;
  error: string;
}

export interface ImportSummary {
  totalRows: number;
  prospectsCreated: number;
  companiesCreated: number;
  companiesReused: number;
  errors: ImportRowError[];
}

/**
 * Importe des lignes Pharow déjà parsées pour un client DMH donné. Une
 * entreprise déjà connue pour ce client (en base ou déjà croisée plus tôt
 * dans le même import) n'est jamais recréée — évite les doublons quand
 * plusieurs contacts partagent la même entreprise. Une ligne en erreur
 * n'interrompt pas le reste de l'import ; elle est collectée dans
 * `errors` avec son numéro de ligne.
 */
export async function runImport(
  rows: PharowRow[],
  clientId: string,
  deps: ImportDeps,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    totalRows: rows.length,
    prospectsCreated: 0,
    companiesCreated: 0,
    companiesReused: 0,
    errors: [],
  };

  const companyIdByName = new Map<string, string>();

  for (const [index, row] of rows.entries()) {
    const csvLine = index + 2; // +1 en-tête, +1 index 0-based -> 1-based
    try {
      const { company, contact } = mapPharowRow(row);

      let companyId = companyIdByName.get(company.name);
      if (companyId) {
        summary.companiesReused++;
      } else {
        const existing = await deps.findCompanyByName(clientId, company.name);
        if (existing) {
          companyId = existing.id;
          summary.companiesReused++;
        } else {
          const created = await deps.insertCompany(clientId, company);
          companyId = created.id;
          summary.companiesCreated++;
        }
        companyIdByName.set(company.name, companyId);
      }

      const contactRecord = await deps.insertContact(clientId, companyId, contact);
      await deps.insertProspect(clientId, contactRecord.id, companyId);

      summary.prospectsCreated++;
    } catch (error) {
      summary.errors.push({
        row: csvLine,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}
