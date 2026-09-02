import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFieldDefinition, CustomFieldEntityType, CustomFieldType, CustomFieldValue } from "@dmh/types";

export async function listFieldDefinitions(
  client: SupabaseClient,
  entityType: CustomFieldEntityType,
): Promise<CustomFieldDefinition[]> {
  const { data, error } = await client
    .from("custom_field_definitions")
    .select("id, client_id, entity_type, field_key, label, field_type, select_options, created_at")
    .eq("entity_type", entityType)
    .order("label");
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomFieldDefinition[];
}

export interface FieldDefinitionInsert {
  clientId: string;
  entityType: CustomFieldEntityType;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  selectOptions?: string[] | null;
}

export async function createFieldDefinition(
  client: SupabaseClient,
  input: FieldDefinitionInsert,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("custom_field_definitions")
    .insert({
      client_id: input.clientId,
      entity_type: input.entityType,
      field_key: input.fieldKey,
      label: input.label,
      field_type: input.fieldType,
      select_options: input.selectOptions ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function listValuesForEntity(
  client: SupabaseClient,
  entityType: CustomFieldEntityType,
  entityId: string,
): Promise<CustomFieldValue[]> {
  const { data, error } = await client
    .from("custom_field_values")
    .select("id, client_id, entity_type, entity_id, field_definition_id, value, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomFieldValue[];
}

export interface FieldValueUpsert {
  clientId: string;
  entityType: CustomFieldEntityType;
  entityId: string;
  fieldDefinitionId: string;
  value: string | number | boolean | null;
}

/** `upsert` sur (entity_id, field_definition_id) — écrase la valeur existante ou en crée une nouvelle. */
export async function upsertValue(client: SupabaseClient, input: FieldValueUpsert): Promise<void> {
  const { error } = await client
    .from("custom_field_values")
    .upsert(
      {
        client_id: input.clientId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        field_definition_id: input.fieldDefinitionId,
        value: input.value,
      },
      { onConflict: "entity_id,field_definition_id" },
    );
  if (error) throw new Error(error.message);
}
