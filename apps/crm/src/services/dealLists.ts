import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpportunityList, RuleGroup } from "@dmh/types";

const LIST_SELECT = "id, client_id, name, rules, created_at, created_by, updated_at, deleted_at, folder_id";

export async function listLists(client: SupabaseClient, clientId: string): Promise<OpportunityList[]> {
  const { data, error } = await client
    .from("opportunity_lists")
    .select(LIST_SELECT)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OpportunityList[];
}

/** Toutes les listes d'opportunités, tous clients confondus — pour la vue d'ensemble /lists (réservée au staff via `staff_full_access`). */
export async function listAllOpportunityLists(client: SupabaseClient): Promise<OpportunityList[]> {
  const { data, error } = await client.from("opportunity_lists").select(LIST_SELECT).is("deleted_at", null).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OpportunityList[];
}

/** Listes d'opportunités supprimées (Corbeille), tous clients confondus — purgées automatiquement après 30 jours (`purge_old_deleted_lists`, migration 031). */
export async function listDeletedOpportunityLists(client: SupabaseClient): Promise<OpportunityList[]> {
  const { data, error } = await client
    .from("opportunity_lists")
    .select(LIST_SELECT)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OpportunityList[];
}

export interface OpportunityListInsert {
  clientId: string;
  name: string;
  /** Non fourni ou undefined = liste statique. Un tableau (même vide) = liste dynamique. */
  rules?: RuleGroup[] | null;
  /** Id staff_members du créateur, ou null (compte client, cf. AddTaskDialog.tsx pour le même pattern sur tasks.created_by) — jamais fabriqué ici. */
  createdBy?: string | null;
  /** Dossier (S32-segments Lot C) — optionnel, non fourni ou null = liste non classée. */
  folderId?: string | null;
}

export async function createList(client: SupabaseClient, input: OpportunityListInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("opportunity_lists")
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
  const { error } = await client.from("opportunity_lists").update({ folder_id: folderId }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Suppression douce (Corbeille) — remplace le hard delete d'origine (migration 031). */
export async function deleteList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("opportunity_lists").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreOpportunityList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("opportunity_lists").update({ deleted_at: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Ids des opportunités (deals) membres d'une liste — pour filtrer /opportunities côté client. */
export async function listDealIdsInList(client: SupabaseClient, listId: string): Promise<string[]> {
  const { data, error } = await client.from("opportunity_list_members").select("deal_id").eq("list_id", listId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => (row as { deal_id: string }).deal_id);
}

/** Ajoute une ou plusieurs opportunités à une liste — ignore les doublons déjà membres (unique(list_id, deal_id)). */
export async function addDealsToList(
  client: SupabaseClient,
  clientId: string,
  listId: string,
  dealIds: string[],
): Promise<void> {
  if (dealIds.length === 0) return;
  const { error } = await client
    .from("opportunity_list_members")
    .upsert(
      dealIds.map((dealId) => ({ client_id: clientId, list_id: listId, deal_id: dealId })),
      { onConflict: "list_id,deal_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeDealFromList(client: SupabaseClient, listId: string, dealId: string): Promise<void> {
  const { error } = await client.from("opportunity_list_members").delete().eq("list_id", listId).eq("deal_id", dealId);
  if (error) throw new Error(error.message);
}
