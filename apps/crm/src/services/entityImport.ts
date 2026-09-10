import type { SupabaseClient } from "@supabase/supabase-js";
import { createCompany } from "./companies";
import { createContact } from "./contacts";
import { createProspect } from "./prospects";
import type { ContactImportPlan } from "../lib/contactImportPlan";
import type { CompanyImportPlan } from "../lib/companyImportPlan";

export interface ImportRowError {
  csvLine: number;
  error: string;
}

export interface ContactImportResult {
  contactsCreated: number;
  companiesCreated: number;
  companiesReused: number;
  prospectsCreated: number;
  errors: ImportRowError[];
}

/**
 * Exécute un plan d'import de contacts : crée le contact (+ prospect
 * `to_enrich` associé, même mécanisme que `AddContactDialog` — si le client
 * a une automatisation "Enrichir" active sur les prospects créés, voir
 * migration `030_automation_branching_and_enrichment.sql`, l'enrichissement
 * Pappers/Dropcontact démarre automatiquement, sans appel supplémentaire
 * ici). Déduplique l'entreprise par nom (insensible à la casse) au sein du
 * client, à la fois contre l'existant et entre les lignes du même fichier.
 * Une ligne en erreur n'interrompt pas le reste de l'import.
 */
export async function importContacts(
  client: SupabaseClient,
  clientId: string,
  plan: ContactImportPlan,
  existingCompaniesByName: Map<string, string>,
): Promise<ContactImportResult> {
  const result: ContactImportResult = {
    contactsCreated: 0,
    companiesCreated: 0,
    companiesReused: 0,
    prospectsCreated: 0,
    errors: [],
  };
  const companyIdByName = new Map(existingCompaniesByName);

  for (const item of plan.toCreate) {
    try {
      const key = item.data.companyName.toLowerCase();
      let companyId = companyIdByName.get(key);
      if (companyId) {
        result.companiesReused++;
      } else {
        const created = await createCompany(client, {
          clientId,
          name: item.data.companyName,
          city: null,
          website: null,
        });
        companyId = created.id;
        companyIdByName.set(key, companyId);
        result.companiesCreated++;
      }

      const contact = await createContact(client, {
        clientId,
        companyId,
        firstName: item.data.firstName,
        lastName: item.data.lastName,
        jobTitle: item.data.jobTitle,
        email: item.data.email,
        linkedinUrl: item.data.linkedinUrl,
      });
      result.contactsCreated++;

      await createProspect(client, { clientId, contactId: contact.id, companyId });
      result.prospectsCreated++;
    } catch (err) {
      result.errors.push({ csvLine: item.csvLine, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}

export interface CompanyImportResult {
  companiesCreated: number;
  errors: ImportRowError[];
}

/** Exécute un plan d'import d'entreprises seules — aucun prospect créé (pas de contact associé), voir la limite documentée dans TESTING.md. */
export async function importCompanies(
  client: SupabaseClient,
  clientId: string,
  plan: CompanyImportPlan,
): Promise<CompanyImportResult> {
  const result: CompanyImportResult = { companiesCreated: 0, errors: [] };

  for (const item of plan.toCreate) {
    try {
      await createCompany(client, {
        clientId,
        name: item.data.name,
        city: item.data.city,
        website: item.data.website,
      });
      result.companiesCreated++;
    } catch (err) {
      result.errors.push({ csvLine: item.csvLine, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}
