import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactList } from "@dmh/types";

export async function listLists(client: SupabaseClient, clientId: string): Promise<ContactList[]> {
  const { data, error } = await client
    .from("contact_lists")
    .select("id, client_id, name, created_at")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactList[];
}

export interface ContactListInsert {
  clientId: string;
  name: string;
}

export async function createList(client: SupabaseClient, input: ContactListInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("contact_lists")
    .insert({ client_id: input.clientId, name: input.name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function deleteList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("contact_lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Ids des contacts membres d'une liste — pour filtrer /contacts côté client, comme matchesSegment pour les segments. */
export async function listContactIdsInList(client: SupabaseClient, listId: string): Promise<string[]> {
  const { data, error } = await client.from("contact_list_members").select("contact_id").eq("list_id", listId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => (row as { contact_id: string }).contact_id);
}

/** Ajoute un ou plusieurs contacts à une liste — ignore les doublons déjà membres (unique(list_id, contact_id)). */
export async function addContactsToList(
  client: SupabaseClient,
  clientId: string,
  listId: string,
  contactIds: string[],
): Promise<void> {
  if (contactIds.length === 0) return;
  const { error } = await client
    .from("contact_list_members")
    .upsert(
      contactIds.map((contactId) => ({ client_id: clientId, list_id: listId, contact_id: contactId })),
      { onConflict: "list_id,contact_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeContactFromList(client: SupabaseClient, listId: string, contactId: string): Promise<void> {
  const { error } = await client.from("contact_list_members").delete().eq("list_id", listId).eq("contact_id", contactId);
  if (error) throw new Error(error.message);
}
