import { buildConflictPatch } from "./importConflict";
import type { ImportConflictPolicy } from "./importConflict";
import type { ContactImportPlanItem } from "./contactImportPlan";
import type { CompanyImportPlanItem } from "./companyImportPlan";

/** Champs d'un contact existant que l'import peut mettre à jour (sous-ensemble de `ExistingContactForImport`). */
export interface ExistingContactFields {
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  legal_basis: string | null;
}

/** Champs d'une entreprise existante que l'import peut mettre à jour (sous-ensemble de `ExistingCompanyForImport`). */
export interface ExistingCompanyFields {
  city: string | null;
  website: string | null;
}

/** Pure : patch des champs standards d'un contact existant (partagé entre l'aperçu et l'écriture). */
export function contactConflictPatch(existing: ExistingContactFields, item: ContactImportPlanItem, policy: ImportConflictPolicy) {
  return buildConflictPatch(
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
}

/** Pure : patch des champs standards d'une entreprise existante (le nom n'est jamais modifié). */
export function companyConflictPatch(existing: ExistingCompanyFields, item: CompanyImportPlanItem, policy: ImportConflictPolicy) {
  return buildConflictPatch(
    { city: existing.city, website: existing.website },
    { city: item.data.city, website: item.data.website },
    policy,
  );
}

function hasCustomFieldValue(item: { customFieldValues: Record<string, string | null> }): boolean {
  return Object.values(item.customFieldValues).some((v) => v !== null && v.trim() !== "");
}

export interface ImportUpdatePreview {
  /** Fiches existantes qui seront réellement modifiées. */
  toChange: number;
  /** Fiches existantes déjà à jour : rien ne changera. */
  unchanged: number;
}

/**
 * Pure : répartit les fiches existantes d'un import entre « à mettre à jour »
 * et « déjà à jour », avec la même règle que l'écriture (`buildConflictPatch`).
 * Les valeurs actuelles des champs personnalisés ne sont pas chargées à ce
 * stade : une ligne qui porte une valeur de champ personnalisé est comptée
 * « à mettre à jour » (majorant, jamais l'inverse).
 */
export function previewContactUpdates(
  items: ContactImportPlanItem[],
  existingByEmail: Map<string, ExistingContactFields>,
  policy: ImportConflictPolicy,
  legalBasis: string | null,
): ImportUpdatePreview {
  let toChange = 0;
  for (const item of items) {
    const existing = item.data.email ? existingByEmail.get(item.data.email.toLowerCase()) : undefined;
    const changes =
      !existing ||
      Object.keys(contactConflictPatch(existing, item, policy)).length > 0 ||
      (legalBasis !== null && existing.legal_basis === null) ||
      hasCustomFieldValue(item);
    if (changes) toChange++;
  }
  return { toChange, unchanged: items.length - toChange };
}

/** Pure : équivalent de `previewContactUpdates` pour les entreprises. */
export function previewCompanyUpdates(
  items: CompanyImportPlanItem[],
  existingByName: Map<string, ExistingCompanyFields>,
  policy: ImportConflictPolicy,
): ImportUpdatePreview {
  let toChange = 0;
  for (const item of items) {
    const existing = existingByName.get(item.data.name.toLowerCase());
    const changes = !existing || Object.keys(companyConflictPatch(existing, item, policy)).length > 0 || hasCustomFieldValue(item);
    if (changes) toChange++;
  }
  return { toChange, unchanged: items.length - toChange };
}
