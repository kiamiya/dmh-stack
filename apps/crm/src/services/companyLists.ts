import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyList } from "@dmh/types";

export async function listLists(client: SupabaseClient, clientId: string): Promise<CompanyList[]> {
  const { data, error } = await client
    .from("company_lists")
    .select("id, client_id, name, created_at")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CompanyList[];
}

export interface CompanyListInsert {
  clientId: string;
  name: string;
}

export async function createList(client: SupabaseClient, input: CompanyListInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("company_lists")
    .insert({ client_id: input.clientId, name: input.name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function deleteList(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("company_lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Ids des entreprises membres d'une liste — pour filtrer /companies côté client. */
export async function listCompanyIdsInList(client: SupabaseClient, listId: string): Promise<string[]> {
  const { data, error } = await client.from("company_list_members").select("company_id").eq("list_id", listId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => (row as { company_id: string }).company_id);
}

/** Ajoute une ou plusieurs entreprises à une liste — ignore les doublons déjà membres (unique(list_id, company_id)). */
export async function addCompaniesToList(
  client: SupabaseClient,
  clientId: string,
  listId: string,
  companyIds: string[],
): Promise<void> {
  if (companyIds.length === 0) return;
  const { error } = await client
    .from("company_list_members")
    .upsert(
      companyIds.map((companyId) => ({ client_id: clientId, list_id: listId, company_id: companyId })),
      { onConflict: "list_id,company_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeCompanyFromList(client: SupabaseClient, listId: string, companyId: string): Promise<void> {
  const { error } = await client.from("company_list_members").delete().eq("list_id", listId).eq("company_id", companyId);
  if (error) throw new Error(error.message);
}
