import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClientRow {
  id: string;
  name: string;
}

export async function listClients(client: SupabaseClient): Promise<ClientRow[]> {
  const { data, error } = await client.from("dmh_clients").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientRow[];
}
