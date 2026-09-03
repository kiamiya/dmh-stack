import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactSegment, SegmentRule } from "@dmh/types";

export async function listSegments(client: SupabaseClient, clientId: string): Promise<ContactSegment[]> {
  const { data, error } = await client
    .from("contact_segments")
    .select("id, client_id, name, rules, created_at")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactSegment[];
}

export interface SegmentInsert {
  clientId: string;
  name: string;
  rules: SegmentRule[];
}

export async function createSegment(client: SupabaseClient, input: SegmentInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("contact_segments")
    .insert({ client_id: input.clientId, name: input.name, rules: input.rules })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function deleteSegment(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("contact_segments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
