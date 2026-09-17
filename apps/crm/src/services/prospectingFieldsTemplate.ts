import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFieldEntityType } from "@dmh/types";
import { createFieldDefinition, listFieldDefinitions } from "./customFields";
import { PROSPECTING_TEMPLATE_FIELDS } from "../lib/prospectingFieldsTemplate";

export interface ApplyProspectingTemplateResult {
  created: string[];
  skipped: string[];
}

/**
 * Crée, pour un client donné, les champs personnalisés du gabarit de fiche
 * de prospection (voir `lib/prospectingFieldsTemplate.ts`) qui n'existent
 * pas encore pour ce client — idempotent : rejouable sans effet sur les
 * champs déjà créés (comparaison par `field_key`, comme le reste du système
 * de champs personnalisés).
 */
export async function applyProspectingFieldsTemplate(
  client: SupabaseClient,
  clientId: string,
): Promise<ApplyProspectingTemplateResult> {
  const result: ApplyProspectingTemplateResult = { created: [], skipped: [] };

  const entityTypes = Array.from(
    new Set(PROSPECTING_TEMPLATE_FIELDS.map((f) => f.entityType)),
  ) as CustomFieldEntityType[];

  const existingKeysByType = new Map<CustomFieldEntityType, Set<string>>();
  for (const entityType of entityTypes) {
    const defs = await listFieldDefinitions(client, entityType);
    existingKeysByType.set(
      entityType,
      new Set(defs.filter((d) => d.client_id === clientId).map((d) => d.field_key)),
    );
  }

  for (const field of PROSPECTING_TEMPLATE_FIELDS) {
    const existingKeys = existingKeysByType.get(field.entityType)!;
    if (existingKeys.has(field.fieldKey)) {
      result.skipped.push(field.label);
      continue;
    }

    await createFieldDefinition(client, {
      clientId,
      entityType: field.entityType,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      selectOptions: field.selectOptions ?? null,
    });
    existingKeys.add(field.fieldKey);
    result.created.push(field.label);
  }

  return result;
}
