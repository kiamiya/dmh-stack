import type { SupabaseClient } from "@supabase/supabase-js";

export interface DealContactRelationRow {
  id: string;
  contact_id: string;
  is_primary: boolean;
  role: string | null;
  contacts: { id: string; first_name: string; last_name: string } | null;
}

/** Contacts liés à une opportunité (achat, juridique, comptable...) — `contact_id` "principal" du deal reste `deals.contact_id`, marqué `is_primary` ici. */
export async function listContactsForDeal(client: SupabaseClient, dealId: string): Promise<DealContactRelationRow[]> {
  const { data, error } = await client
    .from("deal_contacts")
    .select("id, contact_id, is_primary, role, contacts(id, first_name, last_name)")
    .eq("deal_id", dealId)
    .order("is_primary", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DealContactRelationRow[];
}

export interface DealContactInsert {
  clientId: string;
  dealId: string;
  contactId: string;
  role?: string | null;
}

export async function addDealContactRelation(
  client: SupabaseClient,
  input: DealContactInsert,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("deal_contacts")
    .insert({
      client_id: input.clientId,
      deal_id: input.dealId,
      contact_id: input.contactId,
      role: input.role ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function removeDealContactRelation(client: SupabaseClient, relationId: string): Promise<void> {
  const { error } = await client.from("deal_contacts").delete().eq("id", relationId);
  if (error) throw new Error(error.message);
}
