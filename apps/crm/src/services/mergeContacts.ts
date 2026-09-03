import type { SupabaseClient } from "@supabase/supabase-js";

/** Fusionne `removeId` dans `keepId` (réassigne toutes ses relations, le supprime) via la fonction RPC atomique `merge_contacts` (migration 020/021). */
export async function mergeContacts(client: SupabaseClient, keepId: string, removeId: string): Promise<void> {
  const { error } = await client.rpc("merge_contacts", { keep_id: keepId, remove_id: removeId });
  if (error) throw new Error(error.message);
}
