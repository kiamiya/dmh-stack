import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactLegalBasis } from "@dmh/types";
import { createCompany, updateCompany } from "./companies";
import { createContact, updateContact } from "./contacts";
import { createProspect } from "./prospects";
import { listValuesForEntity, upsertValue } from "./customFields";
import { buildConflictPatch, shouldWriteCustomFieldValue } from "../lib/importConflict";
import type { ImportConflictPolicy } from "../lib/importConflict";
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
  legalBasis: ContactLegalBasis | null = null,
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
        legalBasis,
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

// ------------------------------------------------------------------
// S38-3 — mise à jour des fiches existantes selon la politique de conflit
// ------------------------------------------------------------------

export interface ExistingContactForImport {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  legal_basis: ContactLegalBasis | null;
}

export interface ExistingCompanyForImport {
  id: string;
  name: string;
  city: string | null;
  website: string | null;
}

/** Contacts du client ayant un email, avec les champs que l'import peut mettre à jour — indexables par email en minuscules. */
export async function listContactsForImportConflict(
  client: SupabaseClient,
  clientId: string,
): Promise<ExistingContactForImport[]> {
  const { data, error } = await client
    .from("contacts")
    .select("id, email, first_name, last_name, job_title, linkedin_url, legal_basis")
    .eq("client_id", clientId)
    .not("email", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExistingContactForImport[];
}

/** Entreprises du client avec les champs que l'import peut mettre à jour — indexables par nom en minuscules. */
export async function listCompaniesForImportConflict(
  client: SupabaseClient,
  clientId: string,
): Promise<ExistingCompanyForImport[]> {
  const { data, error } = await client.from("companies").select("id, name, city, website").eq("client_id", clientId);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExistingCompanyForImport[];
}

export interface ImportUpdateResult {
  updated: number;
  unchanged: number;
  errors: ImportRowError[];
}

/** Écrit les valeurs de champs personnalisés d'une fiche existante, en respectant la politique (jamais d'écrasement en `fill_empty`). Retourne le nombre de valeurs écrites. */
async function writeCustomFieldValuesForExisting(
  client: SupabaseClient,
  clientId: string,
  entityType: "contact" | "company",
  entityId: string,
  customFieldValues: Record<string, string | null>,
  customFieldColumnMap: Record<string, string>,
  policy: ImportConflictPolicy,
): Promise<number> {
  const pending = Object.entries(customFieldValues).filter(
    ([column, value]) => value !== null && customFieldColumnMap[column] !== undefined,
  );
  if (pending.length === 0) return 0;
  const existingValues = await listValuesForEntity(client, entityType, entityId);
  const existingByDefinition = new Map(existingValues.map((v) => [v.field_definition_id, v.value]));
  let written = 0;
  for (const [column, value] of pending) {
    const fieldDefinitionId = customFieldColumnMap[column];
    if (!shouldWriteCustomFieldValue(existingByDefinition.get(fieldDefinitionId), policy)) continue;
    if (existingByDefinition.get(fieldDefinitionId) === value) continue;
    await upsertValue(client, { clientId, entityType, entityId, fieldDefinitionId, value });
    written++;
  }
  return written;
}

/**
 * Met à jour les contacts déjà existants (`plan.toUpdate`, même email) selon
 * la politique de conflit. L'entreprise de rattachement d'un contact existant
 * n'est jamais modifiée par un import. Une ligne en erreur n'interrompt pas le
 * reste, comme pour la création.
 */
export async function updateExistingContacts(
  client: SupabaseClient,
  clientId: string,
  items: ContactImportPlan["toUpdate"],
  existingByEmail: Map<string, ExistingContactForImport>,
  policy: ImportConflictPolicy,
  customFieldColumnMap: Record<string, string> = {},
  legalBasis: ContactLegalBasis | null = null,
): Promise<ImportUpdateResult> {
  const result: ImportUpdateResult = { updated: 0, unchanged: 0, errors: [] };
  for (const item of items) {
    try {
      const existing = item.data.email ? existingByEmail.get(item.data.email.toLowerCase()) : undefined;
      if (!existing) throw new Error("Contact existant introuvable pour cet email");
      const patch = buildConflictPatch(
        {
          first_name: existing.first_name,
          last_name: existing.last_name,
          job_title: existing.job_title,
          linkedin_url: existing.linkedin_url,
        },
        {
          first_name: item.data.firstName,
          last_name: item.data.lastName,
          job_title: item.data.jobTitle,
          linkedin_url: item.data.linkedinUrl,
        },
        policy,
      );
      // Base juridique RGPD (S38-5) : posée seulement si le contact n'en a pas
      // encore — une base juridique déjà retenue n'est jamais écrasée par un import.
      const setLegalBasis = legalBasis !== null && existing.legal_basis === null;
      if (Object.keys(patch).length > 0 || setLegalBasis) {
        await updateContact(client, existing.id, {
          firstName: patch.first_name,
          lastName: patch.last_name,
          jobTitle: patch.job_title,
          linkedinUrl: patch.linkedin_url,
          ...(setLegalBasis && { legalBasis }),
        });
      }
      const written = await writeCustomFieldValuesForExisting(
        client, clientId, "contact", existing.id, item.customFieldValues, customFieldColumnMap, policy,
      );
      if (Object.keys(patch).length > 0 || setLegalBasis || written > 0) result.updated++;
      else result.unchanged++;
    } catch (err) {
      result.errors.push({ csvLine: item.csvLine, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}

/** Met à jour les entreprises déjà existantes (`plan.toUpdate`, même nom) selon la politique de conflit — le nom lui-même n'est jamais modifié. */
export async function updateExistingCompanies(
  client: SupabaseClient,
  clientId: string,
  items: CompanyImportPlan["toUpdate"],
  existingByName: Map<string, ExistingCompanyForImport>,
  policy: ImportConflictPolicy,
  customFieldColumnMap: Record<string, string> = {},
): Promise<ImportUpdateResult> {
  const result: ImportUpdateResult = { updated: 0, unchanged: 0, errors: [] };
  for (const item of items) {
    try {
      const existing = existingByName.get(item.data.name.toLowerCase());
      if (!existing) throw new Error("Entreprise existante introuvable pour ce nom");
      const patch = buildConflictPatch(
        { city: existing.city, website: existing.website },
        { city: item.data.city, website: item.data.website },
        policy,
      );
      if (Object.keys(patch).length > 0) {
        await updateCompany(client, existing.id, { city: patch.city, website: patch.website });
      }
      const written = await writeCustomFieldValuesForExisting(
        client, clientId, "company", existing.id, item.customFieldValues, customFieldColumnMap, policy,
      );
      if (Object.keys(patch).length > 0 || written > 0) result.updated++;
      else result.unchanged++;
    } catch (err) {
      result.errors.push({ csvLine: item.csvLine, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}
