import type { SupabaseClient } from "@supabase/supabase-js";

export interface FieldProvenanceRow {
  id: string;
  entity_type: "contact" | "company";
  entity_id: string;
  field_name: string;
  source: string;
  value: string | null;
  confidence: number | null;
  updated_at: string;
}

const SELECT = "id, entity_type, entity_id, field_name, source, value, confidence, updated_at";

/** Traçabilité par champ (correction Claude Design, "Champs enrichis" de la Fiche Contact) — écrite par enrich-pappers/enrich-dropcontact. */
export async function listFieldProvenance(
  client: SupabaseClient,
  entityType: "contact" | "company",
  entityId: string,
): Promise<FieldProvenanceRow[]> {
  const { data, error } = await client
    .from("field_provenance")
    .select(SELECT)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw new Error(error.message);
  return (data ?? []) as FieldProvenanceRow[];
}
