import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpportunityList, RuleGroup } from "@dmh/types";

export async function listLists(client: SupabaseClient, clientId: string): Promise<OpportunityList[]> {
  const { data, error } = await client
    .from("opportunity_lists")
    .select("id, client_id, name, rules, created_at")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OpportunityList[];
}

export interface OpportunityListInsert {
  clientId: string;
  name: string;
  /** Non fourni ou undefined = liste statique. Un tableau (même vide) = liste dynamique. */
  rules?: RuleGroup[] | null;
}

export async function createList(client: SupabaseClient, input: OpportunityListInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("opportunity_lists")
    .insert({ client_id: input.clientId, name: input.name, rules: input.rules ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function deleteList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("opportunity_lists").delete().eq("id", id);
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
