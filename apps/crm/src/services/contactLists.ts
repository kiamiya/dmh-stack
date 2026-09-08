import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactList, RuleGroup } from "@dmh/types";

const LIST_SELECT = "id, client_id, name, rules, created_at, created_by, updated_at, deleted_at, folder_id";

export async function listLists(client: SupabaseClient, clientId: string): Promise<ContactList[]> {
  const { data, error } = await client
    .from("contact_lists")
    .select(LIST_SELECT)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactList[];
}

/** Toutes les listes de contacts, tous clients confondus — pour la vue d'ensemble /lists (réservée au staff via `staff_full_access`). */
export async function listAllContactLists(client: SupabaseClient): Promise<ContactList[]> {
  const { data, error } = await client.from("contact_lists").select(LIST_SELECT).is("deleted_at", null).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactList[];
}

/** Listes de contacts supprimées (Corbeille), tous clients confondus — purgées automatiquement après 30 jours (`purge_old_deleted_lists`, migration 031). */
export async function listDeletedContactLists(client: SupabaseClient): Promise<ContactList[]> {
  const { data, error } = await client.from("contact_lists").select(LIST_SELECT).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContactList[];
}

export interface ContactListInsert {
  clientId: string;
  name: string;
  /** Non fourni ou undefined = liste statique. Un tableau (même vide) = liste dynamique. */
  rules?: RuleGroup[] | null;
  /** Id staff_members du créateur, ou null (compte client, cf. AddTaskDialog.tsx pour le même pattern sur tasks.created_by) — jamais fabriqué ici. */
  createdBy?: string | null;
  /** Dossier (S32-segments Lot C) — optionnel, non fourni ou null = liste non classée. */
  folderId?: string | null;
}

export async function createList(client: SupabaseClient, input: ContactListInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("contact_lists")
    .insert({
      client_id: input.clientId,
      name: input.name,
      rules: input.rules ?? null,
      created_by: input.createdBy ?? null,
      folder_id: input.folderId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

/** Déplace une liste vers un dossier (ou la déclasse si `folderId` est null) — remplace le glisser-déposer du mockup, non câblé même dans le mockup source. */
export async function moveListToFolder(client: SupabaseClient, id: string, folderId: string | null): Promise<void> {
  const { error } = await client.from("contact_lists").update({ folder_id: folderId }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Suppression douce (Corbeille) — remplace le hard delete d'origine (migration 031). */
export async function deleteList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("contact_lists").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreContactList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("contact_lists").update({ deleted_at: null }).eq("id", id);
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
