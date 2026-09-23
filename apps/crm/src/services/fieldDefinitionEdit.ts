import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFieldDefinition } from "@dmh/types";
import { migrateFieldValue } from "../lib/fieldOptionsEdit";
import type { OptionEditSummary } from "../lib/fieldOptionsEdit";

export interface FieldDefinitionEditInput {
  definition: CustomFieldDefinition;
  /** Client concerné — obligatoire pour un champ système (options propres à ce client). */
  clientId: string | null;
  /** Nouveau libellé — ignoré pour un champ système (libellé commun à tous les clients). */
  label?: string;
  /** Changements d'options (champs liste / choix multiples uniquement). */
  options?: OptionEditSummary;
}

export interface FieldDefinitionEditResult {
  valuesUpdated: number;
}

/**
 * S38-7 — enregistre l'édition d'un champ existant :
 * - champ personnalisé (d'un client) : libellé + options sur la définition ;
 * - champ système : options en surcharge pour ce client uniquement
 *   (`custom_field_client_options`, S38-6), libellé commun inchangé.
 * Les renommages/suppressions d'options sont reportés sur les valeurs déjà
 * saisies (du client concerné uniquement pour un champ système).
 */
export async function saveFieldDefinitionEdit(
  client: SupabaseClient,
  input: FieldDefinitionEditInput,
): Promise<FieldDefinitionEditResult> {
  const { definition, options } = input;
  const scopeClientId = definition.is_system ? input.clientId : definition.client_id;
  if (definition.is_system && options && !scopeClientId) {
    throw new Error("Choisis un client : les options d'un champ système se modifient client par client.");
  }

  if (!definition.is_system) {
    const patch: Record<string, unknown> = {};
    if (input.label !== undefined && input.label.trim() && input.label.trim() !== definition.label) {
      patch.label = input.label.trim();
    }
    if (options) patch.select_options = options.options;
    if (Object.keys(patch).length > 0) {
      const { error } = await client.from("custom_field_definitions").update(patch).eq("id", definition.id);
      if (error) throw new Error(error.message);
    }
  } else if (options) {
    const { error } = await client.from("custom_field_client_options").upsert(
      {
        field_definition_id: definition.id,
        client_id: scopeClientId,
        select_options: options.options,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "field_definition_id,client_id" },
    );
    if (error) throw new Error(error.message);
  }

  if (!options || (Object.keys(options.renames).length === 0 && options.removed.length === 0)) {
    return { valuesUpdated: 0 };
  }

  let query = client.from("custom_field_values").select("id, value").eq("field_definition_id", definition.id);
  if (scopeClientId) query = query.eq("client_id", scopeClientId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let valuesUpdated = 0;
  for (const row of (data ?? []) as Array<{ id: string; value: unknown }>) {
    const migrated = migrateFieldValue(row.value, options.renames, options.removed);
    if (!migrated.changed) continue;
    const { error: updateError } = await client
      .from("custom_field_values")
      .update({ value: migrated.value })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
    valuesUpdated++;
  }
  return { valuesUpdated };
}
