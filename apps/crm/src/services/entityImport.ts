import type { SupabaseClient } from "@supabase/supabase-js";
import { createCompany } from "./companies";
import { createContact } from "./contacts";
import { createProspect } from "./prospects";
import { upsertValue } from "./customFields";
import type { ContactImportPlan } from "../lib/contactImportPlan";
import type { CompanyImportPlan } from "../lib/companyImportPlan";

/** Écrit, pour une ligne importée, les valeurs de champs personnalisés dont la colonne a été résolue en `field_definition_id` — colonnes vides ignorées, jamais écrasées par une valeur `null`. */
async function writeCustomFieldValues(
  client: SupabaseClient,
  clientId: string,
  entityType: "contact" | "company",
  entityId: string,
  customFieldValues: Record<string, string | null>,
  customFieldColumnMap: Record<string, string>,
): Promise<void> {
  for (const [column, value] of Object.entries(customFieldValues)) {
    if (value === null) continue;
    const fieldDefinitionId = customFieldColumnMap[column];
    if (!fieldDefinitionId) continue;
    await upsertValue(client, { clientId, entityType, entityId, fieldDefinitionId, value });
  }
}

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
  customFieldColumnMap: Record<string, string> = {},
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

      await writeCustomFieldValues(
        client,
        clientId,
        "contact",
        contact.id,
        item.customFieldValues,
        customFieldColumnMap,
      );
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
  customFieldColumnMap: Record<string, string> = {},
): Promise<CompanyImportResult> {
  const result: CompanyImportResult = { companiesCreated: 0, errors: [] };

  for (const item of plan.toCreate) {
    try {
      const company = await createCompany(client, {
        clientId,
        name: item.data.name,
        city: item.data.city,
        website: item.data.website,
      });
      result.companiesCreated++;

      await writeCustomFieldValues(
        client,
        clientId,
        "company",
        company.id,
        item.customFieldValues,
        customFieldColumnMap,
      );
    } catch (err) {
      result.errors.push({ csvLine: item.csvLine, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}
