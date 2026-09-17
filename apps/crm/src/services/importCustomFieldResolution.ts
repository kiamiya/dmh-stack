import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFieldEntityType } from "@dmh/types";
import { createFieldDefinition, listFieldDefinitions } from "./customFields";
import { buildFieldDefinitionInsertsForNewFields } from "../lib/importColumnDecision";
import type { ImportColumnDecision } from "../lib/importColumnDecision";

/**
 * Résout les `field_definition_id` nécessaires à l'écriture des valeurs de
 * champs personnalisés d'un import : les décisions "map_existing" ont déjà
 * leur id, seules les décisions "create_new" nécessitent un aller-retour
 * base — un seul `createFieldDefinition` par `fieldKey` unique, exécuté ici
 * une fois avant la boucle d'écriture des lignes (jamais par ligne).
 *
 * Robustesse : si la création échoue sur un conflit d'unicité (import
 * concurrent créant la même clé entre-temps), on retombe sur
 * `listFieldDefinitions` pour récupérer l'id déjà créé plutôt que de faire
 * échouer tout l'import.
 */
export async function resolveImportCustomFieldColumnMap(
  client: SupabaseClient,
  clientId: string,
  entityType: CustomFieldEntityType,
  decisions: ImportColumnDecision[],
): Promise<Record<string, string>> {
  const columnMap: Record<string, string> = {};

  for (const decision of decisions) {
    if (decision.action === "map_existing") {
      columnMap[decision.column] = decision.fieldDefinitionId;
    }
  }

  const newFields = buildFieldDefinitionInsertsForNewFields(decisions);
  if (newFields.length === 0) return columnMap;

  const createdIdByFieldKey = new Map<string, string>();
  for (const field of newFields) {
    try {
      const created = await createFieldDefinition(client, {
        clientId,
        entityType,
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        selectOptions: field.selectOptions,
      });
      createdIdByFieldKey.set(field.fieldKey, created.id);
    } catch {
      const existing = await listFieldDefinitions(client, entityType);
      const match = existing.find((d) => d.client_id === clientId && d.field_key === field.fieldKey);
      if (!match) throw new Error(`Impossible de créer ou retrouver le champ personnalisé "${field.label}"`);
      createdIdByFieldKey.set(field.fieldKey, match.id);
    }
  }

  for (const decision of decisions) {
    if (decision.action !== "create_new") continue;
    const fieldDefinitionId = createdIdByFieldKey.get(decision.fieldKey);
    if (fieldDefinitionId) columnMap[decision.column] = fieldDefinitionId;
  }

  return columnMap;
}
